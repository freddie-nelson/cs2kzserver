import { join } from "node:path";
import { toAbsolutePath } from "./path.ts";

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

function getEnvIntVar(name: string): number {
  const value = getEnvVar(name);
  const intValue = parseInt(value, 10);
  if (isNaN(intValue)) {
    throw new Error(`Environment variable ${name} is not a valid integer.`);
  }
  return intValue;
}

function getEnvPathVar(name: string): string {
  return toAbsolutePath(getEnvVar(name));
}

function getEnvBoolVar(name: string): boolean {
  const value = getEnvVar(name);
  if (value.toLowerCase() === "true") {
    return true;
  } else if (value.toLowerCase() === "false") {
    return false;
  } else {
    throw new Error(`Environment variable ${name} must be 'true' or 'false'.`);
  }
}

export const SERVER_DIR = getEnvPathVar("SERVER_DIR");
export const STEAMCMD_DIR = getEnvPathVar("STEAMCMD_DIR");
export const PLUGINS_CONFIG_PATH = getEnvPathVar("PLUGINS_CONFIG_PATH");
export const STEAMCMD_DOWNLOAD_URL = getEnvVar("STEAMCMD_DOWNLOAD_URL");
export const METAMOD_DOWNLOAD_URL = getEnvVar("METAMOD_DOWNLOAD_URL");
export const PREVIOUS_METAMOD_DOWNLOAD_URL = getEnvVar("PREVIOUS_METAMOD_DOWNLOAD_URL");
export const CS2_DIR = join(SERVER_DIR, "game");
export const CS2_EXECUTABLE_PATH = join(CS2_DIR, "./bin/win64/cs2.exe");
export const CLIENT_DIR = getEnvPathVar("CLIENT_DIR");
export const CLIENT_PORT = getEnvIntVar("CLIENT_PORT");
export const CONFIG_DIR = getEnvPathVar("CONFIG_DIR");
