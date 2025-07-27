import { join } from "node:path";
import { CONFIG_DIR } from "./env.ts";

export interface ServerMap {
  name: string;
  type: "valve" | "workshop";
  workshopId?: string;
  image: string;
}

export interface ServerConfig {
  steamGsltToken: string;
  serverIp: string;
  serverPort: number;
  serverLanOnly: boolean;
  serverCheatsEnabled: boolean;
  serverRconPassword: string;
  serverMaxPlayers: number;
  maps: ServerMap[];
}

export async function getAllConfigNames(): Promise<string[]> {
  const res = Deno.readDir(CONFIG_DIR);
  const names: string[] = [];

  for await (const entry of res) {
    if (entry.isFile) {
      names.push(entry.name);
    }
  }

  return names;
}

export function getServerConfig(): Promise<ServerConfig> {
  return getJsonConfig<ServerConfig>("server.json");
}

export async function getJsonConfig<T>(name: string): Promise<T> {
  const filePath = join(CONFIG_DIR, name);
  try {
    const data = await Deno.readTextFile(filePath);
    return JSON.parse(data) as T;
  } catch (error) {
    throw new Error(`Failed to read or parse config file ${name}: ${error}`);
  }
}

export async function saveJsonConfig<T>(name: string, config: T): Promise<void> {
  const filePath = join(CONFIG_DIR, name);
  try {
    const data = JSON.stringify(config, null, 2);
    await Deno.writeTextFile(filePath, data);
  } catch (error) {
    throw new Error(`Failed to write config file ${name}: ${error}`);
  }
}

export async function getRawConfig(name: string): Promise<string> {
  const filePath = join(CONFIG_DIR, name);
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    throw new Error(`Failed to read config file ${name}: ${error}`);
  }
}

export async function saveRawConfig(name: string, content: string): Promise<void> {
  const filePath = join(CONFIG_DIR, name);
  try {
    await Deno.writeTextFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write config file ${name}: ${error}`);
  }
}
