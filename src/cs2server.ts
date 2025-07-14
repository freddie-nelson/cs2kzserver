import { exists } from "jsr:@std/fs/exists";
import { CS2_DIR, CS2_EXECUTABLE_PATH, SERVER_DIR, STEAMCMD_DIR, STEAMCMD_DOWNLOAD_URL } from "./env.ts";
import { downloadSteamCMD, runSteamCMD } from "./steamCMD.ts";
import { cleanDirs } from "./path.ts";
import { ChildProcess, spawn } from "node:child_process";
import {
  checkDependenciesAreEnabled,
  getPluginsOrderedByDependencies,
  installMetamod,
  installPlugin,
  pluginsMap,
  togglePlugin,
} from "./plugins.ts";
import { convertExeToConsoleOrWindowMode } from "./exe.ts";
import { getServerConfig } from "./configs.ts";
import { randomUUID } from "node:crypto";
import { Rcon } from "rcon-client";

export enum Cs2ServerStatus {
  INSTALLING = "INSTALLING",
  UPDATING = "UPDATING",
  STARTING = "STARTING",
  RUNNING = "RUNNING",
  STOPPED = "STOPPED",
  UPDATING_PLUGINS = "UPDATING_PLUGINS",
}

export interface ServerLog {
  timestamp: string;
  message: string;
  type: "log" | "error";
}

let isUpdating = false;
export async function updateCs2Server(
  startMessage: string = "Updating CS2 server...",
  successMessage: string = "CS2 server updated successfully.",
  errorMessage: string = "CS2 server update failed. The executable was not found."
) {
  if (isUpdating) {
    throw new Error("CS2 server update is already in progress.");
  }
  isUpdating = true;

  try {
    console.log(startMessage);

    const { steamCmdExecutable } = await downloadSteamCMD(STEAMCMD_DOWNLOAD_URL, STEAMCMD_DIR);
    const installServerProcess = runSteamCMD(steamCmdExecutable, [
      "+force_install_dir",
      SERVER_DIR,
      "+login",
      "anonymous",
      "+app_update",
      "730",
      "+validate",
    ]);
    await installServerProcess.output();

    const modifiedExecutablePath = CS2_EXECUTABLE_PATH + ".modified";
    convertExeToConsoleOrWindowMode(CS2_EXECUTABLE_PATH, modifiedExecutablePath, "to_console");
    await Deno.rename(modifiedExecutablePath, CS2_EXECUTABLE_PATH);

    if (await exists(CS2_EXECUTABLE_PATH)) {
      console.log(successMessage);
    } else {
      throw new Error(errorMessage);
    }
  } finally {
    isUpdating = false;
  }
}

let isInstalling = false;
export async function installCs2Server() {
  if (isInstalling) {
    throw new Error("CS2 server installation is already in progress.");
  }
  isInstalling = true;

  try {
    await cleanDirs();
    await updateCs2Server(
      "Installing CS2 server...",
      "CS2 server installed successfully.",
      "CS2 server installation failed. The executable was not found."
    );
  } finally {
    isInstalling = false;
  }
}

export async function updateOrInstallCs2Server() {
  if (await exists(CS2_EXECUTABLE_PATH)) {
    console.log("CS2 server already installed, skipping installation...");
    await updateCs2Server();
  } else if (await exists(CS2_DIR)) {
    console.log("CS2 server directory exists but is not installed, cleaning up...");
    console.log(
      "Please remove the directory manually to confirm you want to reinstall CS2 server, then re-run this script."
    );
    Deno.exit(1);
  } else {
    await installCs2Server();
  }
}

let isInstallingPlugins = false;
export async function updateOrInstallPlugins() {
  if (isInstallingPlugins) {
    throw new Error("Plugins installation is already in progress.");
  }
  isInstallingPlugins = true;

  try {
    await installMetamod();

    for (const plugin of getPluginsOrderedByDependencies()) {
      await installPlugin(plugin);
      await togglePlugin(plugin, plugin.enabled);

      if (plugin.enabled && !checkDependenciesAreEnabled(plugin)) {
        throw new Error(
          `Plugin ${
            plugin.displayName
          } is enabled but its dependencies are not met. Please enable [${Array.from(plugin.dependencies)
            .filter((dep) => !pluginsMap.get(dep)?.enabled)
            .join(", ")}] to use ${plugin.displayName}.`
        );
      }
    }
  } finally {
    isInstallingPlugins = false;
  }
}

let cs2ServerProcess: ChildProcess | null = null;
let serverLogs: ServerLog[] = [];
let isStarting = false;
export async function startCs2Server() {
  if (!(await exists(CS2_EXECUTABLE_PATH))) {
    throw new Error("CS2 server executable not found. Please ensure CS2 server is installed correctly.");
  }
  isStarting = true;

  const config = await getServerConfig();

  try {
    if (cs2ServerProcess) {
      console.log("CS2 server is already running. Stopping the existing server before starting a new one.");
      await stopCs2Server();
    }

    console.log("Starting CS2 server...");

    serverLogs = [];

    const process = spawn(
      CS2_EXECUTABLE_PATH,
      [
        "-dedicated",
        "-usercon",
        "-maxplayers_override",
        config.serverMaxPlayers.toString(),
        "-nohltv",
        "+rcon_password",
        config.serverRconPassword,
        "+sv_lan",
        config.serverLanOnly ? "1" : "0",
        "+sv_cheats",
        config.serverCheatsEnabled ? "1" : "0",
        "+sv_setsteamaccount",
        config.steamGsltToken,
        "+hostport",
        config.serverPort.toString(),
        "+ip",
        config.serverIp.toString(),
        "+map",
        "de_dust2",
      ],
      {
        stdio: "inherit",
      }
    );
    if (!process.pid) {
      throw new Error("Failed to start CS2 server. The process did not start correctly.");
    }

    process.on("exit", () => (cs2ServerProcess = null));

    // process.stderr.on("data", (data) => {
    //   const errorLog = data.toString().trim();
    //   if (errorLog) {
    //     serverLogs.push({ timestamp: new Date().toISOString(), message: errorLog, type: "error" });
    //   }
    // });

    // process.stdout.on("data", (data) => {
    //   const log = data.toString().trim();
    //   if (log) {
    //     serverLogs.push({ timestamp: new Date().toISOString(), message: log, type: "log" });
    //   }
    // });

    console.log(`CS2 server started on localhost:${config.serverPort}.`);
    console.log("You can now connect to the server in game.");

    return (cs2ServerProcess = process);
  } finally {
    isStarting = false;
  }
}

export async function stopCs2Server() {
  if (!cs2ServerProcess) {
    console.log("CS2 server is not running.");
    return;
  }

  await endAllRconSessions();

  console.log("Stopping CS2 server...");
  cs2ServerProcess.kill("SIGKILL");
  cs2ServerProcess = null;
  console.log("CS2 server stopped successfully.");
}

export function getCs2ServerStatus() {
  if (isInstalling) {
    return Cs2ServerStatus.INSTALLING;
  }

  if (isUpdating) {
    return Cs2ServerStatus.UPDATING;
  }

  if (isInstallingPlugins) {
    return Cs2ServerStatus.UPDATING_PLUGINS;
  }

  if (isStarting) {
    return Cs2ServerStatus.STARTING;
  }

  if (!cs2ServerProcess) {
    return Cs2ServerStatus.STOPPED;
  }

  return Cs2ServerStatus.RUNNING;
}

const rconSessions = new Map<string, Rcon>();

export async function startRconSession() {
  if (!cs2ServerProcess) {
    throw new Error("CS2 server is not running. Please start the server before starting an RCON session.");
  }

  const id = randomUUID();
  const config = await getServerConfig();

  const rcon = new Rcon({
    host: "127.0.0.1",
    port: config.serverPort,
    password: config.serverRconPassword,
  });
  await rcon.connect();
  rconSessions.set(id, rcon);

  return id;
}

export async function executeRconCommand(sessionId: string, command: string) {
  const rcon = rconSessions.get(sessionId);
  if (!rcon) {
    throw new Error(`RCON session with ID ${sessionId} does not exist.`);
  }

  try {
    const response = await rcon.send(command);
    return response;
  } catch (error) {
    throw new Error(`Failed to execute RCON command: ${error}`);
  }
}

export async function endRconSession(sessionId: string) {
  const rcon = rconSessions.get(sessionId);
  if (!rcon) {
    throw new Error(`RCON session with ID ${sessionId} does not exist.`);
  }

  await rcon.end();
  rconSessions.delete(sessionId);
}

export async function endAllRconSessions() {
  for (const [id, rcon] of rconSessions) {
    await rcon.end();
    rconSessions.delete(id);
  }
}

export function getServerLogs() {
  return serverLogs;
}
