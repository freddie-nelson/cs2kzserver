import { exists } from "jsr:@std/fs/exists";
import { isAbsolute, join } from "node:path";

export function toAbsolutePath(path: string): string {
  if (isAbsolute(path)) {
    return path;
  }

  return join(Deno.cwd(), path);
}

export async function cleanDirs(...dirs: string[]) {
  for (const dir of dirs) {
    if (await exists(dir)) {
      await Deno.remove(dir, { recursive: true });
    }
  }
}

export function normalizeSlash(path: string): string {
  return path.replace(/\\/g, "/");
}
