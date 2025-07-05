import { exists } from "jsr:@std/fs/exists";
import JSZip from "jszip";
import { join } from "node:path";
import { normalizeSlash } from "./path.ts";

export async function extractZip(zip: JSZip, targetDir: string, baseDir?: string) {
  baseDir = baseDir ? normalizeSlash(baseDir) : baseDir; // Normalize backslashes to forward slashes
  baseDir = !baseDir || baseDir.endsWith("/") ? baseDir : baseDir + "/";

  for (const [filename, file] of Object.entries(zip.files)) {
    if (!file.dir && (!baseDir || filename.startsWith(baseDir))) {
      const fileData = await file.async("arraybuffer");
      let filePath = join(targetDir, filename);

      // If a base directory is specified, adjust the file path accordingly
      if (baseDir) {
        const relativePath = filename.replace(baseDir, "");
        filePath = join(targetDir, relativePath);
      }

      const fileDir = join(filePath, "..");

      // Ensure the directory exists
      if (!(await exists(fileDir))) {
        await Deno.mkdir(fileDir, { recursive: true });
      }

      // Write the file to the directory
      await Deno.writeFile(filePath, new Uint8Array(fileData));
    }
  }
}
