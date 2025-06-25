import JSZip from "npm:jszip@3.10.1";
import { exists } from "jsr:@std/fs/exists";
import { isAbsolute, join } from "node:path";

const KZSERVER_DIR = Deno.env.get("KZSERVER_DIR");
const STEAMCMD_DIR = Deno.env.get("STEAMCMD_DIR");
const STEAMCMD_DOWNLOAD_URL = Deno.env.get("STEAMCMD_DOWNLOAD_URL");
const STEAM_GSLT_TOKEN = Deno.env.get("STEAM_GSLT_TOKEN");
const METAMOD_DOWNLOAD_URL = Deno.env.get("METAMOD_DOWNLOAD_URL");
const CS2KZ_PLUGIN_DOWNLOAD_URL = Deno.env.get("CS2KZ_PLUGIN_DOWNLOAD_URL");
if (
  !KZSERVER_DIR ||
  !STEAMCMD_DIR ||
  !STEAMCMD_DOWNLOAD_URL ||
  !STEAM_GSLT_TOKEN ||
  !METAMOD_DOWNLOAD_URL ||
  !CS2KZ_PLUGIN_DOWNLOAD_URL
) {
  throw new Error(
    "Environment variables KZSERVER_DIR, STEAMCMD_DIR, STEAMCMD_DOWNLOAD_URL, STEAM_GSLT_TOKEN, METAMOD_DOWNLOAD_URL, and CS2KZ_PLUGIN_DOWNLOAD_URL must be set."
  );
}

function toAbsolutePath(path: string): string {
  if (isAbsolute(path)) {
    return path;
  }

  return join(Deno.cwd(), path);
}

const kzServerDir = toAbsolutePath(KZSERVER_DIR);
const steamCmdDir = toAbsolutePath(STEAMCMD_DIR);
const steamCmdUrl = STEAMCMD_DOWNLOAD_URL;
const steamGsltToken = STEAM_GSLT_TOKEN;
const metamodUrl = METAMOD_DOWNLOAD_URL;
const cs2KzPluginUrl = CS2KZ_PLUGIN_DOWNLOAD_URL;

async function extractZip(zip: JSZip, targetDir: string) {
  for (const [filename, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      const fileData = await file.async("arraybuffer");
      const filePath = join(targetDir, filename);
      const fileDir = join(filePath, "..");

      // Ensure the directory exists
      if (!(await exists(fileDir))) {
        await Deno.mkdir(fileDir, { recursive: true });
      }

      // Write the file to the directory
      await Deno.writeFile(filePath, new Uint8Array(fileData));
    }
  }
}

async function cleanDirs(...dirs: string[]) {
  for (const dir of dirs) {
    if (await exists(dir)) {
      await Deno.remove(dir, { recursive: true });
    }
  }
}

/**
 * Installs SteamCMD to the specified directory.
 *
 * @param downloadUrl The URL to download SteamCMD from. Should be a url to a zip file.
 *
 * @returns A promise that resolves when SteamCMD is installed.
 */
async function downloadSteamCMD(downloadUrl: string, dir: string) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download SteamCMD: ${response.statusText}`);
  }

  const zipData = await response.arrayBuffer();
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipData);

  await extractZip(zipContent, dir);

  return {
    steamCmdExecutable: `${dir}/steamcmd.exe`,
  };
}

/**
 * Runs SteamCMD with the specified arguments and returns the process.
 *
 * @param steamCmdPath The path to the SteamCMD executable.
 * @param args The arguments to pass to SteamCMD. `+quit` will be appended automatically to the end.
 *
 * @returns The spawned process of SteamCMD.
 */
function runSteamCmd(steamCmdPath: string, args: string[], output: "piped" | "inherit" | "null" = "inherit") {
  const command = new Deno.Command(steamCmdPath, {
    args: [...args, "+quit"],
    stdout: output,
    stderr: output,
  });

  return command.spawn();
}

/**
 * Checks if Metamod is installed in the CS2 server directory.
 *
 * @param cs2Dir The directory where the CS2 server is installed.
 *
 * @returns Whether Metamod is installed in the CS2 server directory.
 */
async function isMetamodInstalled(cs2Dir: string) {
  const metamodPath = join(cs2Dir, "./csgo/addons/metamod");
  return await exists(metamodPath);
}

/**
 * Downloads and installs Metamod to the CS2 server's addons directory.
 *
 * @param downloadUrl The URL to download Metamod from. Should be a url to a zip file.
 * @param cs2Dir The directory where the CS2
 */
async function installMetamod(downloadUrl: string, cs2Dir: string) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Metamod: ${response.statusText}`);
  }

  const zipData = await response.arrayBuffer();
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipData);

  // extract the contents of the zip file to the csgo directory
  const csgoDir = join(cs2Dir, "./csgo");
  await extractZip(zipContent, csgoDir);

  // Add line to gameinfo.gi to load Metamod
  const gameInfoPath = join(csgoDir, "./gameinfo.gi");
  if (!(await exists(gameInfoPath))) {
    throw new Error(
      "CS2 server gameinfo.gi file not found. Please ensure CS2 server is installed correctly."
    );
  }

  const gameInfoContent = await Deno.readTextFile(gameInfoPath);
  const updatedGameInfoContent = gameInfoContent.replace(
    /(Game\scsgo\r?\n)/g,
    "Game\tcsgo/addons/metamod\r\n$1"
  );
  await Deno.writeTextFile(gameInfoPath, updatedGameInfoContent);
}

/**
 * Checks if the CS2KZ plugin is installed in the CS2 server directory.
 *
 * @param cs2Dir The directory where the CS2 server is installed.
 *
 * @returns Whether the CS2KZ plugin is installed in the CS2 server directory.
 */
async function isCs2KzPluginInstalled(cs2Dir: string) {
  const cs2KzPath = join(cs2Dir, "./csgo/addons/cs2kz");
  return await exists(cs2KzPath);
}

/**
 * Downloads and installs the CS2KZ plugin to the CS2 server's addons directory.
 *
 * @param cs2Dir The directory where the CS2 server is installed.
 */
async function installCs2KzPlugin(cs2Dir: string) {
  const response = await fetch(cs2KzPluginUrl);
  if (!response.ok) {
    throw new Error(`Failed to download CS2KZ plugin: ${response.statusText}`);
  }

  const zipData = await response.arrayBuffer();
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipData);

  const csgoDir = join(cs2Dir, "./csgo");
  await extractZip(zipContent, csgoDir);
}

async function startCs2Server(
  cs2Dir: string,
  port: number = 27015,
  output: "piped" | "inherit" | "null" = "inherit"
) {
  const cs2ExecutablePath = join(cs2Dir, "./bin/win64/cs2.exe");
  if (!(await exists(cs2ExecutablePath))) {
    throw new Error("CS2 server executable not found. Please ensure CS2 server is installed correctly.");
  }

  const command = new Deno.Command(cs2ExecutablePath, {
    args: [
      "-dedicated",
      "+map",
      "de_dust2",
      "+sv_setsteamaccount",
      steamGsltToken,
      "+hostport",
      port.toString(),
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

  return process;
}

async function main() {
  const cs2Dir = join(kzServerDir, "./game");
  const cs2ExecutablePath = join(cs2Dir, "./bin/win64/cs2.exe");

  // install CS2 server
  if (await exists(cs2ExecutablePath)) {
    console.log("CS2 server already installed, skipping installation...");
  } else if (await exists(cs2Dir)) {
    console.log("CS2 server directory exists but is not installed, cleaning up...");
    console.log(
      "Please remove the directory manually to confirm you want to reinstall CS2 server, then re-run this script."
    );
    Deno.exit(1);
  } else {
    await cleanDirs();

    console.log("Installing CS2 server...");
    const { steamCmdExecutable } = await downloadSteamCMD(steamCmdUrl, steamCmdDir);
    const installServerProcess = runSteamCmd(steamCmdExecutable, [
      "+force_install_dir",
      kzServerDir,
      "+login",
      "anonymous",
      "+app_update",
      "730",
      "+validate",
    ]);
    await installServerProcess.output();

    if (await exists(cs2ExecutablePath)) {
      console.log("CS2 server installed successfully.");
    } else {
      throw new Error("CS2 server installation failed. The executable was not found.");
    }
  }

  if (await isMetamodInstalled(cs2Dir)) {
    console.log("Metamod is already installed in the CS2 server directory, skipping installation...");
  } else {
    console.log("Metamod is not installed, installing now...");
    await installMetamod(metamodUrl, cs2Dir);

    if (await isMetamodInstalled(cs2Dir)) {
      console.log("Metamod installed successfully.");
    } else {
      throw new Error("Metamod installation failed. The addons/metamod directory was not found.");
    }
  }

  if (await isCs2KzPluginInstalled(cs2Dir)) {
    console.log("CS2KZ plugin is already installed in the CS2 server directory, skipping installation...");
  } else {
    console.log("CS2KZ plugin is not installed, installing now...");
    await installCs2KzPlugin(cs2Dir);

    if (await isCs2KzPluginInstalled(cs2Dir)) {
      console.log("CS2KZ plugin installed successfully.");
    } else {
      throw new Error("CS2KZ plugin installation failed. The addons/cs2kz directory was not found.");
    }
  }

  console.log("Starting CS2 server...");

  const port = 27015;
  await startCs2Server(cs2Dir, port);

  console.log(`CS2 server started on localhost:${port}.`);
  console.log("You can now connect to the server using in game.");
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error("An error occurred:", error);
    Deno.exit(1);
  }
}
