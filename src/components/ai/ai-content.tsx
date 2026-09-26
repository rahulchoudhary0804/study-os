import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/** Renders AI-generated text as formatted markdown + LaTeX math (via KaTeX). */
export function AIContent({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed space-y-2",
        "[&_p]:my-1.5 [&_strong]:font-semibold",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_.katex]:text-[1.02em]",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
