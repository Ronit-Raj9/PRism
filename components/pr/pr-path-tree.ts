import type { PRFile } from "@/types/github";

/** Directory node in a repo-relative path tree (GitHub-style file list). */
export interface PrDirNode {
  type: "dir";
  name: string;
  /** Prefix ending with `/`, e.g. `components/pr/`; root is `""`. */
  prefix: string;
  subdirs: PrDirNode[];
  files: PRFile[];
  additions: number;
  deletions: number;
}

interface MutableDir {
  name: string;
  prefix: string;
  subdirs: Map<string, MutableDir>;
  files: PRFile[];
}

function emptyDir(name: string, prefix: string): MutableDir {
  return { name, prefix, subdirs: new Map(), files: [] };
}

function finalizeDir(m: MutableDir): PrDirNode {
  const subdirs = Array.from(m.subdirs.values())
    .map(finalizeDir)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sortedFiles = [...m.files].sort((a, b) => {
    const fa = a.path.split("/").pop() ?? a.path;
    const fb = b.path.split("/").pop() ?? b.path;
    return fa.localeCompare(fb);
  });
  let additions = 0;
  let deletions = 0;
  for (const f of sortedFiles) {
    additions += f.additions;
    deletions += f.deletions;
  }
  for (const d of subdirs) {
    additions += d.additions;
    deletions += d.deletions;
  }
  return {
    type: "dir",
    name: m.name,
    prefix: m.prefix,
    subdirs,
    files: sortedFiles,
    additions,
    deletions,
  };
}

/** Build a sorted directory tree from flat PR file paths. */
export function buildPathTree(files: readonly PRFile[]): PrDirNode {
  const root = emptyDir("", "");
  for (const file of files) {
    const parts = file.path.split("/").filter((p) => p.length > 0);
    if (parts.length === 0) continue;
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]!;
      const prefix = `${parts.slice(0, i + 1).join("/")}/`;
      let next = cur.subdirs.get(seg);
      if (!next) {
        next = emptyDir(seg, prefix);
        cur.subdirs.set(seg, next);
      }
      cur = next;
    }
    cur.files.push(file);
  }
  return finalizeDir(root);
}

/** Directory prefixes for a file path (ancestors), each ending with `/`. */
export function pathDirPrefixes(filePath: string): string[] {
  const parts = filePath.split("/").filter((p) => p.length > 0);
  if (parts.length <= 1) return [];
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    out.push(`${parts.slice(0, i + 1).join("/")}/`);
  }
  return out;
}

/** Every directory prefix in the tree (for “expand all folders” defaults). */
export function collectAllDirPrefixes(node: PrDirNode): string[] {
  const out: string[] = [];
  function walk(n: PrDirNode) {
    if (n.prefix) out.push(n.prefix);
    for (const s of n.subdirs) walk(s);
  }
  walk(node);
  return out;
}
