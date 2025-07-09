import { exists } from "jsr:@std/fs/exists";
import { CLIENT_DIR, CLIENT_PORT } from "./env.ts";
import { join } from "node:path";
import { lookup } from "mime-types";

export function startClient() {
  Deno.serve(
    {
      port: CLIENT_PORT,
    },
    async (req) => {
      const url = new URL(req.url);
      const filePath = join(CLIENT_DIR, url.pathname === "/" ? "/index.html" : url.pathname);
      if (!(await exists(filePath))) {
        return new Response("File not found", { status: 404 });
      }

      return new Response(await Deno.readTextFile(filePath), {
        headers: {
          "Content-Type": lookup(filePath) || "text/plain",
        },
      });
    }
  );
}
