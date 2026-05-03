/**
 * Lightweight markdown-ish renderer for GitHub PR/issue/comment bodies.
 * Avoids a heavy markdown dep — we just need readable rendering of inline code,
 * fenced blocks, links, headings, and lists. Skips full HTML parsing.
 */
import { Fragment } from "react";

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    // Inline code
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        parts.push(
          <code
            key={key++}
            className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[0.85em] dark:bg-neutral-800"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    // [text](url) link
    if (text[i] === "[") {
      const close = text.indexOf("]", i + 1);
      if (close !== -1 && text[close + 1] === "(") {
        const urlEnd = text.indexOf(")", close + 2);
        if (urlEnd !== -1) {
          const label = text.slice(i + 1, close);
          const url = text.slice(close + 2, urlEnd);
          parts.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              {label}
            </a>,
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }
    // Bare url
    const urlMatch = text.slice(i).match(/^https?:\/\/[^\s)]+/);
    if (urlMatch) {
      parts.push(
        <a
          key={key++}
          href={urlMatch[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          {urlMatch[0]}
        </a>,
      );
      i += urlMatch[0].length;
      continue;
    }
    // Plain text — accumulate up to next special char
    let j = i;
    while (
      j < text.length &&
      text[j] !== "`" &&
      text[j] !== "[" &&
      !text.slice(j).startsWith("http")
    ) {
      j++;
    }
    if (j > i) {
      parts.push(<Fragment key={key++}>{text.slice(i, j)}</Fragment>);
      i = j;
    } else {
      // Stuck — emit one char and advance to avoid infinite loop
      parts.push(<Fragment key={key++}>{text[i]}</Fragment>);
      i++;
    }
  }

  return parts;
}

export function MarkdownBody({ body }: { body: string }) {
  if (!body || !body.trim()) {
    return <p className="italic text-neutral-500">No description.</p>;
  }

  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre
          key={key++}
          className="my-2 overflow-x-auto rounded-md bg-neutral-100 p-3 font-mono text-xs dark:bg-neutral-900"
        >
          {lang ? <div className="mb-1 text-neutral-500">{lang}</div> : null}
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-sm", "text-sm"];
      blocks.push(
        <p
          key={key++}
          className={`mt-3 mb-1 font-semibold ${sizes[level - 1]}`}
        >
          {renderInline(h[2])}
        </p>,
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s/, ""));
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

    // Blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2 border-l-2 border-neutral-300 pl-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
        >
          {renderInline(buf.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Plain paragraph (gather contiguous non-empty non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !lines[i].startsWith("> ")
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed">
        {renderInline(buf.join(" "))}
      </p>,
    );
  }

  return <div className="prose-sm max-w-none">{blocks}</div>;
}
