import { getPluginsOrderedByDependencies, installMetamod, installPlugin, togglePlugin } from "./plugins.ts";
import { startCs2Server, updateOrInstallCs2Server } from "./cs2server.ts";

async function main() {
  await updateOrInstallCs2Server();

  await installMetamod();

  for (const plugin of getPluginsOrderedByDependencies()) {
    await installPlugin(plugin);
    await togglePlugin(plugin, plugin.enabled);
  }

  await startCs2Server();
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
