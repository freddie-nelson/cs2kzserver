import { exists } from "jsr:@std/fs/exists";
import {
  CS2_DIR,
  CS2_EXECUTABLE_PATH,
  KZSERVER_DIR,
  SERVER_PORT,
  STEAM_GSLT_TOKEN,
  STEAMCMD_DIR,
  STEAMCMD_DOWNLOAD_URL,
} from "./env.ts";
import { downloadSteamCMD, runSteamCMD } from "./steamCMD.ts";
import { cleanDirs } from "./path.ts";
import { ChildProcess, spawn, StdioOptions } from "node:child_process";

export enum Cs2ServerStatus {
  INSTALLING,
  UPDATING,
  STARTING,
  RUNNING,
  STOPPED,
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
      KZSERVER_DIR,
      "+login",
      "anonymous",
      "+app_update",
      "730",
      "+validate",
    ]);
    await installServerProcess.output();

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

let cs2ServerProcess: ChildProcess | null = null;
let isStarting = false;
export async function startCs2Server(output: StdioOptions = "inherit") {
  if (!(await exists(CS2_EXECUTABLE_PATH))) {
    throw new Error("CS2 server executable not found. Please ensure CS2 server is installed correctly.");
  }
  isStarting = true;

  try {
    if (cs2ServerProcess) {
      console.log("CS2 server is already running. Stopping the existing server before starting a new one.");
      cs2ServerProcess.kill("SIGKILL");
      cs2ServerProcess = null;
    }

    console.log("Starting CS2 server...");

    const process = spawn(
      CS2_EXECUTABLE_PATH,
      [
        "-dedicated",
        "+map",
        "de_dust2",
        "+sv_setsteamaccount",
        STEAM_GSLT_TOKEN,
        "+hostport",
        SERVER_PORT.toString(),
        "+host_workshop_map",
        "3121168339",
      ],
      {
        stdio: output,
      }
    );
    if (!process.pid) {
      throw new Error("Failed to start CS2 server. The process did not start correctly.");
    }

    process.on("exit", () => (cs2ServerProcess = null));

    console.log(`CS2 server started on localhost:${SERVER_PORT}.`);
    console.log("You can now connect to the server in game.");

    return (cs2ServerProcess = process);
  } finally {
    isStarting = false;
  }
}

export function stopCs2Server() {
  if (!cs2ServerProcess) {
    console.log("CS2 server is not running.");
    return;
  }

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

  if (isStarting) {
    return Cs2ServerStatus.STARTING;
  }

  if (!cs2ServerProcess) {
    return Cs2ServerStatus.STOPPED;
  }

  return Cs2ServerStatus.RUNNING;
}
