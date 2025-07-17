import { exists } from "jsr:@std/fs/exists";
import { CLIENT_DIR, CLIENT_PORT, CONFIG_DIR } from "./env.ts";
import { join } from "node:path";
import { lookup } from "mime-types";
import {
  clearServerLogs,
  Cs2ServerStatus,
  endRconSession,
  executeRconCommand,
  getCs2ServerStatus,
  getServerLogs,
  startCs2Server,
  startRconSession,
  stopCs2Server,
} from "./cs2server.ts";
import { formatPluginForJson, plugins, pluginSchema, updatePluginsConfig } from "./plugins.ts";
import { getAllConfigNames, getRawConfig, getServerConfig, saveRawConfig } from "./configs.ts";
import { z } from "zod/v4";
import { toAbsolutePath } from "./path.ts";

const getConfigSchema = z.object({
  name: z.string(),
});

const saveConfigSchema = z.object({
  name: z.string(),
  config: z.string(),
});

const executeRconCommandSchema = z.object({
  sessionId: z.string(),
  command: z.string(),
});

const endRconSessionSchema = z.object({
  sessionId: z.string(),
});

const getServerLogsSchema = z.object({
  cursor: z.number().default(0),
});

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
    if (existingPlugin === -1) {
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
  "/getConfigNames": async (_: Request) => {
    const configNames = await getAllConfigNames();
    return apiResponse(200, { configNames });
  },
  "/getConfigs": async (_: Request) => {
    const configNames = await getAllConfigNames();
    const configs = await Promise.all(
      configNames.map(async (name) => {
        const config = await getRawConfig(name);
        const plugin = plugins.find((p) =>
          p.configs.find((c) => toAbsolutePath(String(c.config)) === join(CONFIG_DIR, name))
        );

        return { name, config, plugin: plugin ? formatPluginForJson(plugin) : undefined };
      })
    );

    return apiResponse(200, { configs });
  },
  "/getConfig": async (req: Request) => {
    const json = await req.json();
    const { success, data } = await getConfigSchema.safeParseAsync(json);
    if (!success) {
      return apiResponse(400, { error: "Invalid data" });
    }

    const { name } = data;
    const configs = await getAllConfigNames();
    if (!configs.includes(name)) {
      return apiResponse(404, { error: "Config not found" });
    }

    const config = await getRawConfig(name);
    return apiResponse(200, { config });
  },
  "/saveConfig": async (req: Request) => {
    const json = await req.json();
    const { success, data } = await saveConfigSchema.safeParseAsync(json);
    if (!success) {
      return apiResponse(400, { error: "Invalid data" });
    }

    const { name, config } = data;
    const configs = await getAllConfigNames();
    if (!configs.includes(name)) {
      return apiResponse(404, { error: "Config not found" });
    }

    await saveRawConfig(name, config);
    return apiResponse(200, { message: "Config saved successfully." });
  },
  "/startRconSession": async () => {
    const sessionId = await startRconSession();
    return apiResponse(200, { sessionId });
  },
  "/executeRconCommand": async (req: Request) => {
    const json = await req.json();
    const { success, data } = await executeRconCommandSchema.safeParseAsync(json);
    if (!success) {
      return apiResponse(400, { error: "Invalid data" });
    }

    const { sessionId, command } = data;
    try {
      const response = await executeRconCommand(sessionId, command);
      return apiResponse(200, { response });
    } catch (error) {
      return apiResponse(500, { error: String(error) });
    }
  },
  "/endRconSession": async (req: Request) => {
    const json = await req.json();
    const { success, data } = await endRconSessionSchema.safeParseAsync(json);
    if (!success) {
      return apiResponse(400, { error: "Invalid data" });
    }

    const { sessionId } = data;
    try {
      await endRconSession(sessionId);
      return apiResponse(200, { message: "RCON session ended successfully." });
    } catch (error) {
      return apiResponse(500, { error: String(error) });
    }
  },
  "/getServerLogs": async (req: Request) => {
    const json = await req.json();
    const { success, data } = await getServerLogsSchema.safeParseAsync(json);
    if (!success) {
      return apiResponse(400, { error: "Invalid data" });
    }

    const { cursor } = data;
    const logs = getServerLogs().slice(cursor);
    return apiResponse(200, { logs });
  },
  "/clearServerLogs": async (_: Request) => {
    clearServerLogs();
    return apiResponse(200, { message: "Server logs cleared successfully." });
  },
  "/getDashboardData": async (_: Request) => {
    const status = getCs2ServerStatus();
    const serverConfig = await getServerConfig();
    let connectedPlayers = 0;
    let publicAddress = "";
    let localAddress = "";

    if (status === Cs2ServerStatus.RUNNING) {
      const rcon = await startRconSession();
      const res = await executeRconCommand(rcon, "status");

      const playerMatch = res.match(/players\s+:\s+(\d+)/);
      connectedPlayers = playerMatch ? parseInt(playerMatch[1], 10) : 0;

      const ipMatch = res.match(
        /udp\/ip\s+:\s+(\d+\.\d+\.\d+\.\d+):(\d+)\s+\(public\s+(\d+\.\d+\.\d+\.\d+):(\d+)\)/
      );
      if (ipMatch) {
        const [, localIp, localPort, publicIpAddr, publicPortAddr] = ipMatch;
        publicAddress = `${publicIpAddr}:${publicPortAddr}`;
        localAddress = `${localIp}:${localPort}`;
      }

      await endRconSession(rcon);
    }

    return apiResponse(200, {
      status,
      plugins: plugins.map(formatPluginForJson),
      configs: await getAllConfigNames(),
      serverLogs: getServerLogs().slice(-100),
      serverConfig,
      connectedPlayers,
      publicAddress,
      localAddress,
    });
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
