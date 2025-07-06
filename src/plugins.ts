import { z } from "zod/v4";

import { CS2_DIR, METAMOD_DOWNLOAD_URL, PLUGINS_CONFIG_PATH } from "./env.ts";
import { join } from "node:path";
import { exists } from "jsr:@std/fs/exists";
import JSZip from "jszip";
import { extractZip } from "./zip.ts";
import { normalizeSlash, toAbsolutePath } from "./path.ts";

export const pluginSchema = z.object({
  displayName: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["metamod", "counterstrikesharp"]),
  downloadUrl: z.string(),
  targetExtractDir: z.string().default("@csgo"),
  dirInZipToExtract: z.string().optional(),
  enabled: z.boolean().default(true),
  isCounterStrikeSharpSharedPlugin: z.boolean().default(false),
  dependencies: z
    .array(z.string())
    .default(() => [])
    .transform((v) => new Set(v)),
  configs: z
    .array(
      z.object({
        target: z.string(),
        config: z.json(),
      })
    )
    .default(() => []),
});

export const pluginsSchema = z.array(pluginSchema).refine((plugins) => {
  const names = new Set<string>(plugins.map((p) => p.name));
  return plugins.length === names.size;
}, "Plugin names must be unique.");

export type Plugin = z.infer<typeof pluginSchema>;
export type Plugins = z.infer<typeof pluginsSchema>;
export type PluginType = Plugin["type"];

const { data, error } = await pluginsSchema.safeParseAsync(
  JSON.parse(await Deno.readTextFile(PLUGINS_CONFIG_PATH))
);
if (error) {
  console.error("Invalid plugins configuration:", z.prettifyError(error));
  Deno.exit(1);
}

// inject counterstrikesharp dependency for all plugins of type counterstrikesharp
// this is to ensure that the counterstrikesharp plugin is always loaded before any other plugins that depend on it
for (const plugin of data) {
  if (plugin.type === "counterstrikesharp") {
    plugin.dependencies.add("counterstrikesharp");
  }
}

export const plugins = data;
export const pluginsMap = new Map<string, Plugin>(plugins.map((plugin) => [plugin.name, plugin]));

export const pluginDirs = {
  game: CS2_DIR,
  metamod: join(CS2_DIR, "./csgo/addons/metamod"),
  cssharp: join(CS2_DIR, "./csgo/addons/counterstrikesharp"),
  csgo: join(CS2_DIR, "./csgo"),
  addons: join(CS2_DIR, "./csgo/addons"),
  cssharpplugins: join(CS2_DIR, "./csgo/addons/counterstrikesharp/plugins"),
  cssharpconfigs: join(CS2_DIR, "./csgo/addons/counterstrikesharp/configs"),
  cssharpshared: join(CS2_DIR, "./csgo/addons/counterstrikesharp/shared"),
  plugin: (plugin: Plugin) => {
    switch (plugin.type) {
      case "metamod":
        return join(pluginDirs.addons, plugin.name);
      case "counterstrikesharp":
        return join(
          plugin.isCounterStrikeSharpSharedPlugin ? pluginDirs.cssharpshared : pluginDirs.cssharpplugins,
          plugin.name
        );
      default:
        throw new Error(`Unknown plugin type: ${plugin.type}`);
    }
  },
  pluginconfig: (plugin: Plugin) => {
    switch (plugin.type) {
      case "metamod":
        return join(pluginDirs.metamod, `${plugin.name}.vdf`);
      case "counterstrikesharp":
        return join(pluginDirs.cssharpconfigs, "plugins", plugin.name);
      default:
        throw new Error(`Unknown plugin type: ${plugin.type}`);
    }
  },
};

export const pluginDirNameSchema = z.enum(Object.keys(pluginDirs) as [keyof typeof pluginDirs]);
export type PluginDirName = z.infer<typeof pluginDirNameSchema>;

export function getPluginsOrderedByDependencies(): Plugins {
  const orderedPlugins: Plugins = [];
  const visited = new Set<string>();

  // dfs function to order plugins by their dependencies
  const visit = (plugin: Plugin) => {
    if (visited.has(plugin.name)) return;
    visited.add(plugin.name);

    for (const dep of plugin.dependencies) {
      const depPlugin = pluginsMap.get(dep);
      if (depPlugin) {
        visit(depPlugin);
      }
    }

    orderedPlugins.push(plugin);
  };

  for (const plugin of plugins) {
    visit(plugin);
  }

  return orderedPlugins;
}

export function resolvePluginDir(plugin: Plugin, dir: string): string {
  dir = normalizeSlash(dir);
  if (dir.startsWith("@")) {
    const dirName = pluginDirNameSchema.parse(dir.slice(1, dir.includes("/") ? dir.indexOf("/") : undefined));
    dir = dir.replace(
      `@${dirName}`,
      typeof pluginDirs[dirName] === "string" ? pluginDirs[dirName] : pluginDirs[dirName](plugin)
    );
  }

  return toAbsolutePath(dir);
}

/**
 * Checks if a specific plugin is installed in the CS2 server.
 *
 * @param plugin The plugin to check.
 *
 * @returns True if the plugin is installed, false otherwise.
 */
export async function isPluginInstalled(plugin: Plugin) {
  const pluginPath = pluginDirs.plugin(plugin);
  return await exists(pluginPath);
}

/**
 * Creates configuration files for a plugin, will update existing files if they already exist.
 *
 * @param plugin The plugin for which to create configs.
 *
 * @returns A promise that resolves when the configs are created.
 */
export async function installPluginConfigs(plugin: Plugin) {
  // create configs if provided
  if (plugin.configs.length === 0) {
    return;
  }

  console.log(`Creating configs for ${plugin.displayName}...`);

  for (const config of plugin.configs) {
    const targetPath = resolvePluginDir(plugin, config.target);
    const targetDir = join(targetPath, "..");

    let content: string;
    if (typeof config.config === "string") {
      const configPath = resolvePluginDir(plugin, config.config);
      if (!(await exists(configPath))) {
        content = config.config;
      } else {
        content = await Deno.readTextFile(configPath);
      }
    } else if (typeof config.config === "object") {
      content = JSON.stringify(config.config, null, 2);
    } else {
      content = String(config.config);
    }

    // Ensure the directory exists
    if (!(await exists(targetDir))) {
      await Deno.mkdir(targetDir, { recursive: true });
    }

    // Write the config file
    await Deno.writeTextFile(targetPath, content);
  }

  console.log(`Configs for ${plugin.displayName} created successfully.`);
}

/**
 * Downloads and installs a plugin from a given URL to the CS2 server's csgo directory.
 *
 * @param plugin The plugin to install.
 *
 * @returns A promise that resolves to true if the plugin was installed, false if it was already installed.
 */
export async function installPlugin(plugin: Plugin): Promise<boolean> {
  if (await isPluginInstalled(plugin)) {
    console.log(
      `${plugin.displayName} is already installed in the CS2 server directory, skipping installation...`
    );
    installPluginConfigs(plugin);
    return false;
  }

  console.log(`Installing ${plugin.displayName}...`);

  const response = await fetch(plugin.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download plugin: ${response.statusText}`);
  }

  const zipData = await response.arrayBuffer();
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipData);

  // extract the contents of the zip file to the csgo directory
  const targetDir = resolvePluginDir(plugin, plugin.targetExtractDir);
  const baseDir = plugin.dirInZipToExtract;
  await extractZip(zipContent, targetDir, baseDir);

  // check if the plugin directory exists after extraction
  if (!(await isPluginInstalled(plugin))) {
    throw new Error(`${plugin.displayName} installation failed.`);
  }

  console.log(`${plugin.displayName} installed successfully.`);

  installPluginConfigs(plugin);

  return true;
}

/**
 * Downloads and installs Metamod to the CS2 server's addons directory.
 */
export async function installMetamod() {
  const installed = await installPlugin({
    displayName: "Metamod",
    name: "metamod",
    description: "",
    type: "metamod",
    downloadUrl: METAMOD_DOWNLOAD_URL,
    targetExtractDir: "@csgo",
    enabled: true,
    isCounterStrikeSharpSharedPlugin: false,
    dependencies: new Set<string>(),
    configs: [],
  });
  if (!installed) {
    return;
  }

  // Add line to gameinfo.gi to load Metamod
  const gameInfoPath = join(CS2_DIR, "./csgo/gameinfo.gi");
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
 * Disables a CSSharp plugin by renaming its .dll file to .dll.disabled.
 *
 * @param plugin The plugin to disable.
 */
export async function disableCsSharpPlugin(plugin: Plugin) {
  const pluginPath = join(pluginDirs.plugin(plugin), `${plugin.name}.dll`);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(disabledPluginPath)) {
    console.log(`Plugin ${plugin.displayName} is already disabled.`);
    return;
  }

  if (!(await exists(pluginPath))) {
    throw new Error(`Plugin ${plugin.displayName} not found in CS2 server directory.`);
  }

  Deno.rename(pluginPath, disabledPluginPath);
  console.log(`Plugin ${plugin.displayName} has been disabled.`);
}

/**
 * Enables a disabled CSSharp plugin by renaming its .dll.disabled file to .dll.
 *
 * @param plugin The plugin to enable.
 */
export async function enableCsSharpPlugin(plugin: Plugin) {
  const pluginPath = join(pluginDirs.plugin(plugin), `${plugin.name}.dll`);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(pluginPath)) {
    console.log(`Plugin ${plugin.displayName} is already enabled.`);
    return;
  }

  if (!(await exists(disabledPluginPath))) {
    throw new Error(`Plugin ${plugin.displayName} not found in CS2 server directory.`);
  }

  Deno.rename(disabledPluginPath, pluginPath);
  console.log(`Plugin ${plugin.displayName} has been enabled.`);
}

/**
 * Disables a Metamod plugin by renaming its .vdf file to .vdf.disabled.
 *
 * @param plugin The Metamod plugin to disable.
 */
export async function disableMetamodPlugin(plugin: Plugin) {
  const pluginPath = pluginDirs.pluginconfig(plugin);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(disabledPluginPath)) {
    console.log(`Metamod plugin ${plugin.displayName} is already disabled.`);
    return;
  }

  if (!(await exists(pluginPath))) {
    throw new Error(`Metamod plugin ${plugin.displayName} not found in CS2 server directory.`);
  }

  Deno.rename(pluginPath, disabledPluginPath);
  console.log(`Metamod plugin ${plugin.displayName} has been disabled.`);
}

/**
 * Enables a disabled Metamod plugin by renaming its .vdf.disabled file to .vdf.
 *
 * @param plugin The Metamod plugin to enable.
 */
export async function enableMetamodPlugin(plugin: Plugin) {
  const pluginPath = pluginDirs.pluginconfig(plugin);
  const disabledPluginPath = pluginPath + ".disabled";

  if (await exists(pluginPath)) {
    console.log(`Metamod plugin ${plugin.displayName} is already enabled.`);
    return;
  }

  if (!(await exists(disabledPluginPath))) {
    throw new Error(`Metamod plugin ${plugin.displayName} not found in CS2 server directory.`);
  }

  Deno.rename(disabledPluginPath, pluginPath);
  console.log(`Metamod plugin ${plugin.displayName} has been enabled.`);
}

/**
 * Toggles a plugin on or off and then sets `plugin.enabled` to the new state.
 *
 * @param plugin The plugin to toggle.
 * @param enable Whether to enable or disable the plugin.
 */
export async function togglePlugin(plugin: Plugin, enable: boolean) {
  switch (plugin.type) {
    case "metamod":
      if (enable) {
        await enableMetamodPlugin(plugin);
      } else {
        await disableMetamodPlugin(plugin);
      }
      break;
    case "counterstrikesharp":
      if (enable) {
        await enableCsSharpPlugin(plugin);
      } else {
        await disableCsSharpPlugin(plugin);
      }
      break;

    default:
      break;
  }

  plugin.enabled = enable;
}

/**
 * Checks if all dependencies of a plugin are enabled.
 *
 * @param plugin The plugin to check dependencies for.
 *
 * @returns True if all dependencies are enabled, false otherwise.
 */
export function checkDependenciesAreEnabled(plugin: Plugin) {
  const dependencies = plugin.dependencies || [];
  for (const dep of dependencies) {
    const depPlugin = pluginsMap.get(dep);
    if (depPlugin && !depPlugin.enabled) {
      return false;
    }
  }
  return true;
}
