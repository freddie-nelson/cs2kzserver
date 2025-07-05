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

export async function updateCs2Server(
  startMessage: string = "Updating CS2 server...",
  successMessage: string = "CS2 server updated successfully.",
  errorMessage: string = "CS2 server update failed. The executable was not found."
) {
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
}

export async function installCs2Server() {
  await cleanDirs();
  await updateCs2Server(
    "Installing CS2 server...",
    "CS2 server installed successfully.",
    "CS2 server installation failed. The executable was not found."
  );
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

export async function startCs2Server(output: "piped" | "inherit" | "null" = "inherit") {
  if (!(await exists(CS2_EXECUTABLE_PATH))) {
    throw new Error("CS2 server executable not found. Please ensure CS2 server is installed correctly.");
  }

  console.log("Starting CS2 server...");

  const command = new Deno.Command(CS2_EXECUTABLE_PATH, {
    args: [
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
    stdout: output,
    stderr: output,
  });

  const process = command.spawn();
  if (!process.pid) {
    throw new Error("Failed to start CS2 server. The process did not start correctly.");
  }

  console.log(`CS2 server started on localhost:${SERVER_PORT}.`);
  console.log("You can now connect to the server in game.");

  return process;
}
