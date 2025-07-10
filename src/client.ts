import { exists } from "jsr:@std/fs/exists";
import { CLIENT_DIR, CLIENT_PORT } from "./env.ts";
import { format, join } from "node:path";
import { lookup } from "mime-types";
import { Cs2ServerStatus, getCs2ServerStatus, startCs2Server, stopCs2Server } from "./cs2server.ts";
import { formatPluginForJson, plugins, pluginSchema, updatePluginsConfig } from "./plugins.ts";

function apiResponse(status: number, data: any): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function handleServeWeb(req: Request, url: URL): Promise<Response> {
  const filePath = join(CLIENT_DIR, url.pathname === "/" ? "/index.html" : url.pathname);
  if (!(await exists(filePath)) || !filePath.startsWith(CLIENT_DIR)) {
    return new Response("File not found", { status: 404 });
  }

  return new Response(await Deno.readTextFile(filePath), {
    headers: {
      "Content-Type": lookup(filePath) || "text/plain",
    },
  });
}

const apiHandlers: Record<string, (req: Request) => Promise<Response>> = {
  "/hello": async (_: Request) => {
    return apiResponse(200, { message: "Hello from CS2KZ Server!" });
  },
  "/getServerStatus": async (_: Request) => {
    return apiResponse(200, { status: getCs2ServerStatus() });
  },
  "/startServer": async (_: Request) => {
    await startCs2Server();
    return apiResponse(200, { status: getCs2ServerStatus() });
  },
  "/stopServer": async (_: Request) => {
    await stopCs2Server();
    return apiResponse(200, { status: getCs2ServerStatus() });
  },
  "/getPlugins": async (_: Request) => {
    return apiResponse(200, { plugins: plugins.map(formatPluginForJson) });
  },
  "/updatePlugin": async (req: Request) => {
    if (getCs2ServerStatus() !== Cs2ServerStatus.STOPPED) {
      return apiResponse(400, { error: "Server must be stopped to update plugins." });
    }

    const json = await req.json();
    const { success, data } = await pluginSchema.safeParseAsync(json.plugin);
    if (!success) {
      return apiResponse(400, { error: "Invalid plugin data" });
    }

    const plugin = data;
    const existingPlugin = plugins.findIndex((p) => p.name === plugin.name);
    if (!existingPlugin) {
      plugins.push(plugin);
    } else {
      plugins[existingPlugin] = plugin;
    }

    await updatePluginsConfig();

    return apiResponse(200, { plugins: plugins.map(formatPluginForJson) });
  },
  "/removePlugin": async (req: Request) => {
    if (getCs2ServerStatus() !== Cs2ServerStatus.STOPPED) {
      return apiResponse(400, { error: "Server must be stopped to remove plugins." });
    }

    const json = await req.json();
    if (!json.pluginName || typeof json.pluginName !== "string") {
      return apiResponse(400, { error: "Invalid plugin name" });
    }

    const pluginName = json.pluginName as string;

    const index = plugins.findIndex((p) => p.name === pluginName);
    if (index === -1) {
      return apiResponse(404, { error: "Plugin not found" });
    }

    plugins.splice(index, 1);
    await updatePluginsConfig();

    return apiResponse(200, { plugins: plugins.map(formatPluginForJson) });
  },
};

async function handleServeApi(req: Request, url: URL): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const route = url.pathname.replace("/api", "");

  if (apiHandlers[route]) {
    try {
      return await apiHandlers[route](req);
    } catch (error) {
      console.error(`Error handling API request for ${route}:`, error);
      return new Response("Internal Server Error", { status: 500 });
    }
  } else {
    return new Response("Not found", { status: 404 });
  }
}

export function startClient() {
  Deno.serve(
    {
      port: CLIENT_PORT,
    },
    (req) => {
      const url = new URL(req.url);
      if (url.pathname.startsWith("/api")) {
        return handleServeApi(req, url);
      } else {
        return handleServeWeb(req, url);
      }
    }
  );
}
