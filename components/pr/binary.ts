const BINARY_EXT = new RegExp(
  "\\.(" +
    [
      // images
      "png", "jpe?g", "gif", "webp", "ico", "bmp", "tiff?", "heic", "avif",
      // fonts
      "woff2?", "ttf", "otf", "eot",
      // audio/video
      "mp[34]", "m4a", "wav", "ogg", "opus", "flac", "flv", "mov", "mkv",
      "webm", "avi",
      // archives
      "zip", "tar", "gz", "bz2", "7z", "rar", "xz",
      // executables / native libs
      "exe", "dll", "so", "dylib", "class", "jar", "war", "ear", "wasm", "bin",
      // databases
      "db", "sqlite[3]?", "mdb",
      // misc opaque
      "pdf", "psd", "ai", "indd", "sketch", "fig",
    ].join("|") +
    ")$",
  "i",
);

const GIT_OBJECT = /\/objects\/[0-9a-f]{2}\//i;
const GIT_PACK_IDX = /\.(pack|idx)$/i;

export function isLikelyBinary(path: string, patch: string | null): boolean {
  if (BINARY_EXT.test(path)) return true;
  if (GIT_OBJECT.test(path)) return true;
  if (GIT_PACK_IDX.test(path)) return true;
  if (!patch) return false;

  // Heuristic: high ratio of non-printable / replacement chars in the patch.
  // Sample first 4KB to keep it cheap.
  const sample = patch.length > 4096 ? patch.slice(0, 4096) : patch;
  let bad = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    // Allow printable ASCII, common whitespace, and unicode > 0x7f. Flag NUL,
    // BEL, BS, SO/SI control codes, and the U+FFFD replacement char.
    if (c === 0 || c === 0xfffd) {
      bad++;
    } else if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) {
      bad++;
    }
  }
  return bad / sample.length > 0.05;
}

export function fileLanguage(path: string): string | null {
  const filename = path.split("/").pop() ?? path;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return ext;
}
