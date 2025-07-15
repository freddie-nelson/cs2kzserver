import JSZip from "jszip";
import { extractZip } from "./zip.ts";
import { spawn, StdioOptions } from "node:child_process";

/**
 * Installs SteamCMD to the specified directory.
 *
 * @param downloadUrl The URL to download SteamCMD from. Should be a url to a zip file.
 *
 * @returns A promise that resolves when SteamCMD is installed.
 */
export async function downloadSteamCMD(downloadUrl: string, dir: string) {
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
export function runSteamCMD(steamCmdPath: string, args: string[], output: StdioOptions = "pipe") {
  return spawn(steamCmdPath, [...args, "+quit"], {
    stdio: output,
  });
}
