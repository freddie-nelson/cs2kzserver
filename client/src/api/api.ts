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
  type: "metamod" | "counterstrikesharp";
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

async function request<Req, Res>(endpoint: string, body?: Req): Promise<Res> {
  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok || response.status !== 200) {
    throw new Error(`Request failed with status ${response.status}`);
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
