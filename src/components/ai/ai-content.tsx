import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

const LATEX_COMMAND = /\\(frac|sqrt|times|cdot|div|pm|mp|leq?|geq?|neq|approx|infty|int|sum|prod|lim|log|ln|sin|cos|tan|sec|csc|cot|alpha|beta|gamma|delta|Delta|theta|lambda|mu|pi|rho|sigma|omega|Omega|phi|epsilon|varepsilon|vec|hat|bar|overline|left|right|circ|degree|text|mathrm|partial|nabla|to|rightarrow|Rightarrow)\b/;

/**
 * Models are inconsistent with math delimiters: `\( … \)`, `\[ … \]`, or bare
 * `\frac{1}{2}` with no delimiters at all. Normalise to `$…$` / `$$…$$` so
 * remark-math + KaTeX render every variant.
 */
export function normalizeMath(text: string, inline = false): string {
  const t = text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
  if (!inline || t.includes("$")) return t;

  const mathy = (tok: string) => LATEX_COMMAND.test(tok) || /[\^_{}]/.test(tok) || /\\[a-zA-Z]/.test(tok);
  if (!mathy(t)) return t;

  // A pure formula ("\frac{\mu_0 I}{2\pi r}", "10^{-3} m", "x^2 + 3x") → one math span.
  const words = t.match(/[A-Za-z]{4,}/g) ?? [];
  const realWords = words.filter((w) => !LATEX_COMMAND.test("\\" + w) && !["text", "mathrm"].includes(w));
  if (realWords.length <= 1) return `$${t}$`;

  // Mixed sentence ("Water is H_2O") → only wrap the formula-looking tokens, keep the words as text.
  return t
    .split(/(\s+)/)
    .map((tok) => (tok.trim() && mathy(tok) ? `$${tok}$` : tok))
    .join("");
}

/** Renders AI-generated text as formatted markdown + LaTeX math (via KaTeX). */
export function AIContent({ text, className, inline = false }: { text: string; className?: string; inline?: boolean }) {
  let source = normalizeMath(text ?? "", inline);
  if (inline) {
    // Options/answers are short, so render their math at full display size —
    // an inline \frac is squashed to ~60% height and hard to read on a phone.
    source = source.replace(/(^|[^$])\$(?!\$)([^$]+?)\$(?!\$)/g, (_, pre, m) => `${pre}$\\displaystyle ${m}$`);
    return (
      <span className={cn("leading-loose [&_.katex]:text-[1.08em] [&_p]:inline", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{ p: ({ children }) => <span>{children}</span> }}
        >
          {source}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div
      className={cn(
        "text-sm leading-relaxed space-y-2",
        "[&_p]:my-1.5 [&_strong]:font-semibold",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_.katex]:text-[1.02em] [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
