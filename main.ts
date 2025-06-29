import JSZip from "npm:jszip@3.10.1";
import { exists } from "jsr:@std/fs/exists";
import { isAbsolute, join } from "node:path";
import weaponPaintsConfig from "./weaponPaintsConfig.json" with { type: "json" };
import maps from "./maps.json" with { type: "json" };
import mapChooserConfig from "./mapChooserConfig.json" with { type: "json" };

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

const KZSERVER_DIR = toAbsolutePath(getEnvVar("KZSERVER_DIR"));
const STEAMCMD_DIR = toAbsolutePath(getEnvVar("STEAMCMD_DIR"));
const STEAMCMD_DOWNLOAD_URL = getEnvVar("STEAMCMD_DOWNLOAD_URL");
const STEAM_GSLT_TOKEN = getEnvVar("STEAM_GSLT_TOKEN");
const METAMOD_DOWNLOAD_URL = getEnvVar("METAMOD_DOWNLOAD_URL");
const CS2KZ_PLUGIN_DOWNLOAD_URL = getEnvVar("CS2KZ_PLUGIN_DOWNLOAD_URL");
const CSSHARP_PLUGIN_DOWNLOAD_URL = getEnvVar("CSSHARP_PLUGIN_DOWNLOAD_URL");
const ANYBASELIBCS2_PLUGIN_DOWNLOAD_URL = getEnvVar("ANYBASELIBCS2_PLUGIN_DOWNLOAD_URL");
const PLAYERSETTINGS_PLUGIN_DOWNLOAD_URL = getEnvVar("PLAYERSETTINGS_PLUGIN_DOWNLOAD_URL");
const MENUMANAGER_PLUGIN_DOWNLOAD_URL = getEnvVar("MENUMANAGER_PLUGIN_DOWNLOAD_URL");
const WEAPONPAINTS_PLUGIN_DOWNLOAD_URL = getEnvVar("WEAPONPAINTS_PLUGIN_DOWNLOAD_URL");
const SQLMM_PLUGIN_DOWNLOAD_URL = getEnvVar("SQLMM_PLUGIN_DOWNLOAD_URL");
const MAPCHOOSER_PLUGIN_DOWNLOAD_URL = getEnvVar("MAPCHOOSER_PLUGIN_DOWNLOAD_URL");

function toAbsolutePath(path: string): string {
  if (isAbsolute(path)) {
    return path;
  }

  return join(Deno.cwd(), path);
}

async function extractZip(zip: JSZip, targetDir: string, baseDir?: string) {
  baseDir = baseDir?.replace(/\\/g, "/"); // Normalize backslashes to forward slashes
  baseDir = baseDir?.endsWith("/") ? baseDir : baseDir + "/";

  for (const [filename, file] of Object.entries(zip.files)) {
    if (!file.dir && (!baseDir || filename.startsWith(baseDir))) {
      const fileData = await file.async("arraybuffer");
      let filePath = join(targetDir, filename);

      // If a base directory is specified, adjust the file path accordingly
      if (baseDir) {
        const relativePath = filename.replace(baseDir, "");
        filePath = join(targetDir, relativePath);
      }

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
 * Checks if a specific plugin is installed in the CS2 server.
 *
 * @param pluginName The name of the plugin to check for installation. This should be the directory name of the plugin in the addons directory.
 * @param cs2Dir The directory where the CS2 server is installed.
 *
 * @returns True if the plugin is installed, false otherwise.
 */
async function isPluginInstalled(pluginName: string, cs2Dir: string) {
  const pluginPath = join(cs2Dir, "./csgo/addons", pluginName);
  return await exists(pluginPath);
}

/**
 * Downloads and installs a plugin from a given URL to the CS2 server's csgo directory.
 *
 * @param url The URL to download the plugin from. Should be a url to a zip file.
 * @param cs2Dir The directory where the CS2 server is installed.
 * @param targetDir The target directory within the cs2Dir where the plugin should be installed. Defaults to "./csgo".
 * @param baseDir The base directory inside the zip file to extract from. This is useful if the zip file contains a directory structure and you want to extract only a specific part of it. Defaults to undefined, which means the entire zip will be extracted.
 *
 * @returns A promise that resolves when the plugin is installed.
 */
async function installPlugin(url: string, cs2Dir: string, targetDir: string = "./csgo", baseDir?: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download plugin: ${response.statusText}`);
  }

  const zipData = await response.arrayBuffer();
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipData);

  // extract the contents of the zip file to the csgo directory
  const csgoDir = join(cs2Dir, targetDir);
  await extractZip(zipContent, csgoDir, baseDir);
}

/**
 * Installs a plugin to the CS2 server's addons directory, checking if it is already installed.
 *
 * @param url The URL to download the plugin from. Should be a url to a zip file.
 * @param cs2Dir The directory where the CS2 server is installed.
 * @param pluginName The name of the plugin to check for installation. This should be the directory name of the plugin in the addons directory.
 * @param targetDir The target directory within the cs2Dir where the plugin should be installed. Defaults to "./csgo".
 * @param baseDir The base directory inside the zip file to extract from. This is useful if the zip file contains a directory structure and you want to extract only a specific part of it. Defaults to undefined, which means the entire zip will be extracted.
 *
 * @returns A promise that resolves to true if the plugin was installed successfully, false if it was already installed.
 */
async function installPluginWithChecks(url: string, cs2Dir: string, pluginName: string, targetDir?: string, baseDir?: string) {
  if (await isPluginInstalled(pluginName, cs2Dir)) {
    console.log(`${pluginName} is already installed in the CS2 server directory, skipping installation...`);
    return false;
  }

  console.log(`${pluginName} is not installed, installing now...`);
  await installPlugin(url, cs2Dir, targetDir, baseDir);

  if (await isPluginInstalled(pluginName, cs2Dir)) {
    console.log(`${pluginName} installed successfully.`);
  } else {
    throw new Error(`${pluginName} installation failed. The addons/${pluginName} directory was not found.`);
  }

  return true;
}

/**
 * Downloads and installs Metamod to the CS2 server's addons directory.
 *
 * @param downloadUrl The URL to download Metamod from. Should be a url to a zip file.
 * @param cs2Dir The directory where the CS2
 */
async function installMetamod(downloadUrl: string, cs2Dir: string) {
  const installed = await installPluginWithChecks(downloadUrl, cs2Dir, "metamod");
  if (!installed) {
    return;
  }

  // Add line to gameinfo.gi to load Metamod
  const gameInfoPath = join(cs2Dir, "./csgo/gameinfo.gi");
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

async function installWeaponPaints(downloadUrl: string, cs2Dir: string) {
  const installed = await installPluginWithChecks(
    downloadUrl,
    cs2Dir,
    "counterstrikesharp/plugins/WeaponPaints",
    "./csgo/addons/counterstrikesharp/plugins"
  );

  const csSharpDir = join(cs2Dir, "./csgo/addons/counterstrikesharp");

  // create weaponpaints config
  const weaponPaintsConfigDir = join(csSharpDir, "./configs/plugins/WeaponPaints");
  if (!(await exists(weaponPaintsConfigDir))) {
    await Deno.mkdir(weaponPaintsConfigDir, { recursive: true });
  }
  const weaponPaintsConfigPath = join(weaponPaintsConfigDir, "WeaponPaints.json");
  await Deno.writeTextFile(weaponPaintsConfigPath, JSON.stringify(weaponPaintsConfig, null, 2));

  if (!installed) {
    return;
  }

  // move weaponpaints.json to the correct location
  if (!(await exists(join(csSharpDir, "./gamedata")))) {
    await Deno.mkdir(join(csSharpDir, "./gamedata"), { recursive: true });
  }

  await Deno.rename(
    join(csSharpDir, "./plugins/gamedata/weaponpaints.json"),
    join(csSharpDir, "./gamedata/weaponpaints.json")
  );
  await Deno.remove(join(csSharpDir, "./plugins/gamedata"), { recursive: true });

  // set FollowCS2ServerGuidelines to false in cssharp config
  const configPath = join(csSharpDir, "./configs/core.json");
  if (!(await exists(configPath))) {
    await Deno.mkdir(join(csSharpDir, "./configs"), { recursive: true });
    await Deno.writeTextFile(configPath, JSON.stringify({ FollowCS2ServerGuidelines: false }, null, 2));
  } else {
    const configContent = await Deno.readTextFile(configPath);
    const configJson = JSON.parse(configContent);
    configJson.FollowCS2ServerGuidelines = false;
    await Deno.writeTextFile(configPath, JSON.stringify(configJson, null, 2));
  }

  console.log("Weapon Paints installed successfully and CSSharp config updated.");
}

async function installMapChooser(downloadUrl: string, cs2Dir: string) {
  await installPluginWithChecks(
    downloadUrl,
    cs2Dir,
    "counterstrikesharp/plugins/GG1MapChooser",
    undefined,
    "csgo"
  );

  // write maps to the correct location (will also update existing file)
  const mapsFilePath = join(cs2Dir, "./csgo/cfg/GGMCmaps.json");
  if ((await exists(join(mapsFilePath, "..")))) {
    await Deno.writeTextFile(mapsFilePath, JSON.stringify(maps, null, 2));
  }

  // write map chooser config
  const mapChooserConfigDir = join(cs2Dir, "./csgo/addons/counterstrikesharp/configs/plugins/GG1MapChooser")
  if (!(await exists(mapChooserConfigDir))) {
    await Deno.mkdir(mapChooserConfigDir, { recursive: true });
  }
  const mapChooserConfigPath = join(mapChooserConfigDir, "GG1MapChooser.json");
  await Deno.writeTextFile(mapChooserConfigPath, JSON.stringify(mapChooserConfig, null, 2));
}

/**
 * Disables a CSSharp plugin by renaming its .dll file to .dll.disabled.
 * 
 * @param pluginName The name of the plugin to disable. This should be the directory name of the plugin in the counterstrikesharp plugins directory.
 * @param cs2Dir The directory where the CS2 server is installed.
 */
async function disableCsSharpPlugin(pluginName: string, cs2Dir: string) {
  const pluginPath = join(cs2Dir, "./csgo/addons/counterstrikesharp/plugins", pluginName, `${pluginName}.dll`);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(disabledPluginPath)) {
    console.log(`Plugin ${pluginName} is already disabled.`);
    return;
  }

  if (!(await exists(pluginPath))) {
    throw new Error(`Plugin ${pluginName} not found in CS2 server directory.`);
  }

  Deno.rename(pluginPath, disabledPluginPath);
  console.log(`Plugin ${pluginName} has been disabled.`);
}

/**
 * Enables a disabled CSSharp plugin by renaming its .dll.disabled file to .dll.
 * 
 * @param pluginName The name of the plugin to enable. This should be the directory name of the plugin in the counterstrikesharp plugins directory.
 * @param cs2Dir The directory where the CS2 server is installed.
 */
async function enableCsSharpPlugin(pluginName: string, cs2Dir: string) {
  const pluginPath = join(cs2Dir, "./csgo/addons/counterstrikesharp/plugins", pluginName, `${pluginName}.dll`);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(pluginPath)) {
    console.log(`Plugin ${pluginName} is already enabled.`);
    return;
  }

  if (!(await exists(disabledPluginPath))) {
    throw new Error(`Plugin ${pluginName} not found in CS2 server directory.`);
  }

  Deno.rename(disabledPluginPath, pluginPath);
  console.log(`Plugin ${pluginName} has been enabled.`);
}

/**
 * Disables a Metamod plugin by renaming its .vdf file to .vdf.disabled.
 * 
 * @param pluginName The name of the Metamod plugin to disable. This should be the name of the .vdf file without the extension.
 * @param cs2Dir The directory where the CS2 server is installed.
 */
async function disableMetamodPlugin(pluginName: string, cs2Dir: string) {
  const pluginPath = join(cs2Dir, "./csgo/addons/metamod", `${pluginName}.vdf`);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(disabledPluginPath)) {
    console.log(`Metamod plugin ${pluginName} is already disabled.`);
    return;
  }

  if (!(await exists(pluginPath))) {
    throw new Error(`Metamod plugin ${pluginName} not found in CS2 server directory.`);
  }

  Deno.rename(pluginPath, disabledPluginPath);
  console.log(`Metamod plugin ${pluginName} has been disabled.`);
}

/**
 * Enables a disabled Metamod plugin by renaming its .vdf.disabled file to .vdf.
 * 
 * @param pluginName The name of the Metamod plugin to enable. This should be the name of the .vdf file without the extension.
 * @param cs2Dir The directory where the CS2 server is installed.
 */
async function enableMetamodPlugin(pluginName: string, cs2Dir: string) {
  const pluginPath = join(cs2Dir, "./csgo/addons/metamod", `${pluginName}.vdf`);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(pluginPath)) {
    console.log(`Metamod plugin ${pluginName} is already enabled.`);
    return;
  }

  if (!(await exists(disabledPluginPath))) {
    throw new Error(`Metamod plugin ${pluginName} not found in CS2 server directory.`);
  }

  Deno.rename(disabledPluginPath, pluginPath);
  console.log(`Metamod plugin ${pluginName} has been enabled.`);
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
      STEAM_GSLT_TOKEN,
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
  const cs2Dir = join(KZSERVER_DIR, "./game");
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
    const { steamCmdExecutable } = await downloadSteamCMD(STEAMCMD_DOWNLOAD_URL, STEAMCMD_DIR);
    const installServerProcess = runSteamCmd(steamCmdExecutable, [
      "+force_install_dir",
      KZSERVER_DIR,
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

  await installMetamod(METAMOD_DOWNLOAD_URL, cs2Dir);
  await installPluginWithChecks(CSSHARP_PLUGIN_DOWNLOAD_URL, cs2Dir, "counterstrikesharp");
  await installPluginWithChecks(CS2KZ_PLUGIN_DOWNLOAD_URL, cs2Dir, "cs2kz");
  await installPluginWithChecks(SQLMM_PLUGIN_DOWNLOAD_URL, cs2Dir, "sql_mm");
  await installPluginWithChecks(
    ANYBASELIBCS2_PLUGIN_DOWNLOAD_URL,
    cs2Dir,
    "counterstrikesharp/shared/AnyBaseLib"
  );
  await installPluginWithChecks(
    PLAYERSETTINGS_PLUGIN_DOWNLOAD_URL,
    cs2Dir,
    "counterstrikesharp/plugins/PlayerSettings"
  );
  await installPluginWithChecks(
    MENUMANAGER_PLUGIN_DOWNLOAD_URL,
    cs2Dir,
    "counterstrikesharp/plugins/MenuManagerCore"
  );
  await installWeaponPaints(WEAPONPAINTS_PLUGIN_DOWNLOAD_URL, cs2Dir);
  await installMapChooser(MAPCHOOSER_PLUGIN_DOWNLOAD_URL, cs2Dir);

  console.log("Starting CS2 server...");

  const port = 27015;
  await startCs2Server(cs2Dir, port);

  console.log(`CS2 server started on localhost:${port}.`);
  console.log("You can now connect to the server in game.");
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
