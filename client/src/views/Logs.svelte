<script lang="ts">
  import { clearServerLogs, getServerLogs, type ServerLog } from "../api/api";

  const logs: ServerLog[] = $state([]);
  let refreshIntervalRaw = $state(2000);
  const refreshInterval = $derived(Math.max(1000, Math.min(60000, refreshIntervalRaw)));
  let refreshing = $state(false);

  const refresh = async () => {
    if (refreshing) return;

    refreshing = true;
    const newLogs = await getServerLogs(logs.length);
    logs.push(...newLogs.logs);
    refreshing = false;
  };
  refresh();

  $effect(() => {
    let interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  });

  let clearing = $state(false);
  const clear = async () => {
    if (clearing) return;

    clearing = true;
    await clearServerLogs();
    logs.length = 0;
    clearing = false;
  };
</script>

<main>
  <div class="header">
    <h1>Server Logs</h1>

    <div class="controls">
      <label>
        Refresh Interval (ms):
        <input type="number" bind:value={refreshIntervalRaw} min="1000" />
      </label>

      <button onclick={clear}>
        {clearing ? "Clearing..." : "Clear Logs"}
      </button>

      <button onclick={refresh}>
        {refreshing ? "Refreshing..." : "Refresh Logs"}
      </button>
    </div>
  </div>

  <div class="logs-container">
    {#each [...logs].reverse() as log}
      <div class="log-entry" class:log-error={log.type === "error"}>
        <span class="log-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
        <span class="log-message">{log.message}</span>
      </div>
    {/each}

    {#if logs.length === 0}
      <p>No logs yet.</p>
    {/if}
  </div>
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h1 {
      font-size: 1.5rem;
    }

    .controls {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      height: 100%;

      button {
        height: 2.3rem;
        margin-bottom: 0.1rem;
        width: 7.5rem;
      }
    }
  }

  .logs-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column-reverse;
    overflow-y: auto;
    overflow-x: auto;
    padding: 1rem;
    background-color: var(--color-bg-dark);
    color: var(--color-text-light);
    border-radius: 0.5rem;
    scrollbar-width: thin;
    scrollbar-color: var(--color-text-light) var(--color-bg-light);
    font-family: monospace;
  }

  .log-error {
    color: var(--color-danger);
  }
</style>
