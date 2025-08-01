const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error("VITE_API_URL is not defined in the environment variables.");
}

export enum Cs2ServerStatus {
  INSTALLING = "INSTALLING",
  UPDATING = "UPDATING",
  STARTING = "STARTING",
  RUNNING = "RUNNING",
  STOPPED = "STOPPED",
  UPDATING_PLUGINS = "UPDATING_PLUGINS",
}

export interface Plugin {
  displayName: string;
  name: string;
  description: string;
  type: "metamod" | "counterstrikesharp" | "configonly";
  downloadUrl: string;
  targetExtractDir: string;
  enabled: boolean;
  isCounterStrikeSharpSharedPlugin: boolean;
  dependencies: string[];
  configs: {
    config: string;
    target: string;
  }[];
  dirInZipToExtract?: string;
  lastInstalledUrl?: string;
}

export interface ServerLog {
  timestamp: string;
  message: string;
  type: "log" | "error";
}

export interface ServerMap {
  name: string;
  type: "valve" | "workshop";
  workshopId?: string;
  image: string;
}

export interface ServerConfig {
  steamGsltToken: string;
  serverName: string;
  serverIp: string;
  serverPort: number;
  serverLanOnly: boolean;
  serverCheatsEnabled: boolean;
  serverRconPassword: string;
  serverMaxPlayers: number;
  maps: ServerMap[];
}

export interface DashboardData {
  status: Cs2ServerStatus;
  activeMap: string | null;
  plugins: Plugin[];
  serverConfig: ServerConfig;
  serverLogs: ServerLog[];
  configs: string[];
  connectedPlayers: number;
  localAddress: string;
  publicAddress: string;
}

export interface Config {
  name: string;
  config: string;
  plugin?: Plugin;
}

async function request<Req, Res>(endpoint: string, body?: Req): Promise<Res> {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok || response.status !== 200) {
    throw new Error(
      `Request failed with status ${response.status}. Message: ${
        (await response.json()).error || "Unknown error"
      }`
    );
  }

  return response.json() as Promise<Res>;
}

export function hello() {
  return request<undefined, { message: string }>("/hello");
}

export function getServerStatus() {
  return request<undefined, { status: Cs2ServerStatus }>("/getServerStatus");
}

export function startServer() {
  return request<undefined, { status: Cs2ServerStatus }>("/startServer");
}

export function stopServer() {
  return request<undefined, { status: Cs2ServerStatus }>("/stopServer");
}

export function getPlugins() {
  return request<undefined, { plugins: Plugin[] }>("/getPlugins");
}

export function updatePlugin(plugin: Plugin) {
  return request<{ plugin: Plugin }, { plugins: Plugin[] }>("/updatePlugin", { plugin });
}

export function deletePlugin(pluginName: string) {
  return request<{ pluginName: string }, { plugins: Plugin[] }>("/removePlugin", { pluginName });
}

export function getConfigNames() {
  return request<undefined, { names: string[] }>("/getConfigNames");
}

export function getConfigs() {
  return request<undefined, { configs: Config[] }>("/getConfigs");
}

export function getConfig(name: string) {
  return request<{ name: string }, { config: string }>("/getConfig", { name });
}

export async function getServerConfig() {
  return JSON.parse((await getConfig("server.json")).config) as ServerConfig;
}

export function saveConfig(name: string, config: string) {
  return request<{ name: string; config: string }, { message: string }>("/saveConfig", { name, config });
}

export function startRconSession() {
  return request<undefined, { sessionId: string }>("/startRconSession");
}

export function executeRconCommand(sessionId: string, command: string) {
  return request<{ sessionId: string; command: string }, { response: string }>("/executeRconCommand", {
    sessionId,
    command,
  });
}

export function endRconSession(sessionId: string) {
  return request<{ sessionId: string }, { message: string }>("/endRconSession", { sessionId });
}

export function getServerLogs(cursor: number = 0) {
  return request<{ cursor: number }, { logs: ServerLog[] }>("/getServerLogs", { cursor });
}

export function clearServerLogs() {
  return request<undefined, { message: string }>("/clearServerLogs");
}

export function getDashboardData() {
  return request<undefined, DashboardData>("/getDashboardData");
}

export function addWorkshopMap(mapName: string) {
  return request<{ mapName: string }, { message: string }>("/addWorkshopMap", { mapName });
}

export function getActiveMap() {
  return request<undefined, { map: string | null }>("/getActiveMap");
}

export function setActiveMap(mapName: string) {
  return request<{ mapName: string }, { message: string }>("/setActiveMap", { mapName });
}
