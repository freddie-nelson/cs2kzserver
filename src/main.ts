import {
  checkDependenciesAreEnabled,
  getPluginsOrderedByDependencies,
  installMetamod,
  installPlugin,
  pluginsMap,
  togglePlugin,
} from "./plugins.ts";
import { startCs2Server, updateOrInstallCs2Server } from "./cs2server.ts";
import { startClient } from "./client.ts";

async function main() {
  await updateOrInstallCs2Server();

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

  await startCs2Server();
  await startClient();
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
