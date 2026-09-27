import { ImageResponse } from "next/og";

export const alt = "Smart Padhai — AI Study Planner for JEE Main 2027 & RBSE Class 12";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card (WhatsApp, Telegram, X, LinkedIn) for every page without its own. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(135deg, #312e81 0%, #4338ca 55%, #0ea5e9 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, opacity: 0.85, display: "flex" }}>🎓 Free AI Study Planner</div>
        <div style={{ fontSize: 96, fontWeight: 800, marginTop: 12, display: "flex" }}>Smart Padhai</div>
        <div style={{ fontSize: 44, marginTop: 16, display: "flex" }}>JEE Main 2027 · RBSE Class 12 Board</div>
        <div style={{ fontSize: 30, marginTop: 36, opacity: 0.9, display: "flex" }}>
          Chapter-wise marks & priority · NCERT PDFs · AI questions · Daily plans
        </div>
      </div>
    ),
    size
  );
}
