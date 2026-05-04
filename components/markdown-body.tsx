/**
 * Lightweight markdown renderer for GitHub PR / issue / comment bodies.
 *
 * Performance contract: O(n) time and allocations in the length of the input.
 * renderInline uses index-based tracking so the only string slices created are
 * the ones that end up in the React tree — no per-character allocations, no
 * intermediate buffers, no ConsString trees.
 */
import { memo } from "react";

// Sticky so we can match against the full string at a given index without
// allocating a per-`'h'` slice (which made body parsing O(n²) on the few
// shapes that hit the gate every character).
const BARE_URL_RE = /https?:\/\/[^\s)]+/y;

// Hard caps to prevent rendering huge bodies from creating thousands of React
// nodes. Bodies arrive already truncated server-side; these are belt-and-
// braces — a stale cache could still hand us something larger.
const MAX_CHARS = 4_000;
const MAX_LINES = 120;
const LINK_CLS = "text-blue-600 underline-offset-2 hover:underline dark:text-blue-400";
const CODE_CLS = "rounded bg-neutral-200 px-1 py-0.5 font-mono text-[0.85em] dark:bg-neutral-800";

/**
 * Parse inline markdown tokens from `text` into React nodes.
 *
 * Uses a single-pass index walk. Plain text segments are emitted with one
 * text.slice(segStart, i) call when a token boundary is hit, so allocations
 * are proportional to the number of tokens, not the length of the text.
 */
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  let key = 0;
  let i = 0;
  let segStart = 0; // start of the current plain-text run

  const flushPlain = (end: number) => {
    if (end > segStart) parts.push(text.slice(segStart, end));
  };

  while (i < text.length) {
    const ch = text[i];

    // Inline code: `...`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flushPlain(i);
        parts.push(
          <code key={key++} className={CODE_CLS}>
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        segStart = i;
        continue;
      }
    }

    // Markdown link: [label](url)
    if (ch === "[") {
      const close = text.indexOf("]", i + 1);
      if (close !== -1 && text[close + 1] === "(") {
        const urlEnd = text.indexOf(")", close + 2);
        if (urlEnd !== -1) {
          flushPlain(i);
          parts.push(
            <a
              key={key++}
              href={text.slice(close + 2, urlEnd)}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLS}
            >
              {text.slice(i + 1, close)}
            </a>,
          );
          i = urlEnd + 1;
          segStart = i;
          continue;
        }
      }
    }

    // Bare URL — gate on 'h'+'t' before paying the regex cost.
    // This keeps the common case (plain text) at O(1) per character.
    if (ch === "h" && text.charCodeAt(i + 1) === 116 /* t */) {
      BARE_URL_RE.lastIndex = i;
      const m = BARE_URL_RE.exec(text);
      if (m) {
        flushPlain(i);
        parts.push(
          <a
            key={key++}
            href={m[0]}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLS}
          >
            {m[0]}
          </a>,
        );
        i = BARE_URL_RE.lastIndex;
        segStart = i;
        continue;
      }
    }

    // Plain character — just advance. No allocation until flushPlain.
    i++;
  }

  flushPlain(i);
  return parts;
}

export const MarkdownBody = memo(function MarkdownBody({ body }: { body: string }) {
  if (!body?.trim()) {
    return <p className="italic text-neutral-500">No description.</p>;
  }

  // Pre-clamp by characters so a multi-megabyte body (e.g. one that slipped
  // past server-side truncation) never reaches the line splitter.
  const charClamped = body.length > MAX_CHARS ? body.slice(0, MAX_CHARS) : body;
  const rawLines = charClamped.split("\n");
  // Cap total lines to prevent thousands of React nodes from a wall-of-text body.
  const lines = rawLines.length > MAX_LINES ? rawLines.slice(0, MAX_LINES) : rawLines;
  const truncated = body.length > MAX_CHARS || rawLines.length > MAX_LINES;

  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block: ```lang\n...\n```
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre
          key={key++}
          className="my-2 overflow-x-auto rounded-md bg-neutral-100 p-3 font-mono text-xs dark:bg-neutral-900"
        >
          {lang ? <div className="mb-1 text-neutral-500">{lang}</div> : null}
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // ATX heading: # … ######
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-sm", "text-sm"];
      blocks.push(
        <p key={key++} className={`mt-3 mb-1 font-semibold ${sizes[h[1].length - 1]}`}>
          {renderInline(h[2])}
        </p>,
      );
      i++;
      continue;
    }

    // Bullet list: -, *, +
    if (/^\s*[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+] /, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-0.5 pl-5 text-sm">
          {items.map((it, k) => (
            <li key={k}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Blockquote: > …
    if (line.startsWith("> ")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoted.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2 border-l-2 border-neutral-300 pl-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
        >
          {renderInline(quoted.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Empty line — skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — gather contiguous non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^#{1,6} /.test(lines[i]) &&
      !/^\s*[-*+] /.test(lines[i]) &&
      !lines[i].startsWith("> ")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed">
        {renderInline(paraLines.join(" "))}
      </p>,
    );
  }

  return (
    <div className="prose-sm max-w-none">
      {blocks}
      {truncated ? (
        <p className="mt-2 text-xs italic text-neutral-500">
          (Body truncated — open on GitHub for the full text)
        </p>
      ) : null}
    </div>
  );
});
