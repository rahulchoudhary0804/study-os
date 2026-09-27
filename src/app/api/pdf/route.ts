import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { renderPdfBuffer } from "@/server/pdf/puppeteer";
import {
  buildChapterPdf,
  buildSubjectPdf,
  buildExamPdf,
  buildTopicNotesPdf,
  buildWeakTopicReportPdf,
  buildWeeklyReportPdf,
} from "@/server/pdf/generate";

export const runtime = "nodejs";
// Cold-starting Chromium on a serverless host can take several seconds.
export const maxDuration = 60;

const bodySchema = z.object({
  scope: z.enum(["exam", "subject", "chapter", "topic", "weak-topics", "weekly-report"]),
  id: z.string().uuid().optional(),
  /** "html" returns the print-ready HTML instead — the client prints it to PDF itself. */
  format: z.enum(["pdf", "html"]).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { scope, id, format } = parsed.data;

  try {
    let doc: { html: string; filename: string };
    switch (scope) {
      case "exam":
        if (!id) throw new Error("id required");
        doc = await buildExamPdf(id);
        break;
      case "subject":
        if (!id) throw new Error("id required");
        doc = await buildSubjectPdf(id);
        break;
      case "chapter":
        if (!id) throw new Error("id required");
        doc = await buildChapterPdf(id);
        break;
      case "topic":
        if (!id) throw new Error("id required");
        doc = await buildTopicNotesPdf(id, user.profile.id);
        break;
      case "weak-topics":
        doc = await buildWeakTopicReportPdf(user.profile.id);
        break;
      case "weekly-report":
        doc = await buildWeeklyReportPdf(user.profile.id);
        break;
    }

    if (format === "html") {
      return new NextResponse(doc.html, {
        headers: { "Content-Type": "text/html; charset=utf-8", "X-Filename": doc.filename },
      });
    }

    const pdf = await renderPdfBuffer(doc.html);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
