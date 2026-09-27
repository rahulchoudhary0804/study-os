/**
 * LLMs asked for JSON regularly emit output that is *almost* JSON: a bare
 * `undefined`, trailing commas, markdown fences, or LaTeX like `$\sum$` whose
 * single backslash is an invalid JSON escape (or, worse, `\frac` silently
 * turning into a form-feed + "rac"). This makes a best-effort pass to turn
 * that into parseable JSON without mangling real escapes like `\n` or `\"`.
 */
export function parseLooseJson(raw: string): unknown {
  const text = extractJsonBlock(raw);
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(repairJson(text));
  }
}

function extractJsonBlock(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.search(/[[{]/);
  if (start > 0) text = text.slice(start);
  const lastObj = text.lastIndexOf("}");
  const lastArr = text.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end >= 0 && end < text.length - 1) text = text.slice(0, end + 1);
  return text;
}

const VALID_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

function repairJson(text: string): string {
  let out = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
        out += ch;
        continue;
      }
      // Bare `undefined` / `NaN` are not JSON values.
      if (text.startsWith("undefined", i)) {
        out += "null";
        i += "undefined".length - 1;
        continue;
      }
      if (text.startsWith("NaN", i)) {
        out += "null";
        i += 2;
        continue;
      }
      // Trailing commas before a closing bracket.
      if (ch === ",") {
        const rest = text.slice(i + 1).match(/^\s*([}\]])/);
        if (rest) continue;
      }
      out += ch;
      continue;
    }

    // Inside a string literal.
    if (ch === "\\") {
      const next = text[i + 1];
      const after = text[i + 2] ?? "";
      if (next === undefined) {
        out += "\\\\";
        continue;
      }
      if (next === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
        out += "\\u";
        i++;
        continue;
      }
      // `\n`, `\t`, `\b`, `\f`, `\r` followed by a lowercase letter is almost
      // always a LaTeX command (\nabla, \theta, \beta, \frac, \rho) rather
      // than a real control character — keep the backslash literally.
      const looksLikeLatex = "nrtbf".includes(next) && /[a-z]/.test(after);
      if (VALID_ESCAPES.has(next) && next !== "u" && !looksLikeLatex) {
        out += ch + next;
        i++;
        continue;
      }
      out += "\\\\";
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    // Raw control characters are not allowed inside JSON strings.
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\t") {
      out += "\\t";
      continue;
    }
    // A raw form-feed / backspace is a mangled LaTeX command (\frac, \beta).
    if (ch === "\f") {
      out += "\\\\f";
      continue;
    }
    if (ch === "\b") {
      out += "\\\\b";
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 0x20) {
      out += "\\u" + code.toString(16).padStart(4, "0");
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Even when the JSON parses, `"\frac"` decodes to a form-feed + "rac" and
 * `"\theta"` to a tab + "heta". Undo those so KaTeX sees the real commands.
 */
function restoreLatex(s: string): string {
  return s
    .replace(/\f/g, "\\f")
    .replace(/\x08/g, "\\b")
    .replace(/\t(?=[a-z])/g, "\\t")
    .replace(/\r(?=[a-z])/g, "\\r")
    .replace(/\n(?=(abla|eq|eg|u\b|i\b|ot|ewline|ormalsize))/g, "\\n");
}

/** Recursively drops `null` values (so optional Zod fields accept them) and repairs LaTeX in strings. */
export function normalizeAIJson(value: unknown): unknown {
  if (typeof value === "string") return restoreLatex(value);
  if (Array.isArray(value)) return value.filter((v) => v !== null).map(normalizeAIJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = normalizeAIJson(v);
    }
    return out;
  }
  return value;
}
