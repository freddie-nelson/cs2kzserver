import { updateOrInstallCs2Server, updateOrInstallPlugins } from "./cs2server.ts";
import { startClient } from "./client.ts";

async function main() {
  await startClient();
  await updateOrInstallCs2Server();
  await updateOrInstallPlugins();
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
