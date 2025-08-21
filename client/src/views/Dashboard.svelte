<script lang="ts">
  import { getDashboardData, type DashboardData } from "../api/api";
  import DashboardMap from "../components/DashboardMap.svelte";
  import PluginGroups from "../components/PluginGroups.svelte";
  import StartStopButton from "../components/StartStopButton.svelte";
  import { useTimeAgo } from "../utils/timeago.svelte";

  let data: DashboardData | null = $state(null);
  let isRefreshing = $state(false);
  let dataTimeAgo = useTimeAgo();

  const refreshData = async () => {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;
    data = await getDashboardData();
    dataTimeAgo.setDate(new Date());
    isRefreshing = false;
  };
  refreshData();

  $effect(() => {
    let interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  });
</script>

<main>
  {#if data}
    <div class="dashboard-header">
      <h1>{data.serverConfig.serverName}</h1>

      <div class="dashboard-header-actions">
        <p>Last refreshed {dataTimeAgo.formattedDate || "never"}</p>
        <button class="btn" onclick={() => refreshData()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>

    <div class="dashboard">
      <div class="dashboard-card info">
        <h2 class="dashboard-card-title">Server Info</h2>

        <div class="info-content">
          <p><strong>Local IP:</strong> {data.localAddress}</p>
          <p><strong>Public IP:</strong> {data.publicAddress}</p>
          <p><strong>LAN Only:</strong> {data.serverConfig.serverLanOnly ? "Yes" : "No"}</p>
          <p><strong>Cheats Enabled:</strong> {data.serverConfig.serverCheatsEnabled ? "Yes" : "No"}</p>
          <p><strong>Players Connected:</strong> {data.connectedPlayers}</p>
          <p><strong>Max Players:</strong> {data.serverConfig.serverMaxPlayers}</p>
          <p><strong>Plugins Enabled:</strong> {data.plugins.filter((plugin) => plugin.enabled).length}</p>
          <p><strong>Plugins Available:</strong> {data.plugins.length}</p>
          <p>
            <strong>Steam GSLT Token:</strong>
            <button
              class="unstyled-btn"
              onclick={() => alert(`Steam GSLT Token: ${data?.serverConfig.steamGsltToken}`)}
            >
              click to view
            </button>
          </p>
          <p>
            <strong>RCON Password:</strong>
            <button
              class="unstyled-btn"
              onclick={() => alert(`RCON Password: ${data?.serverConfig.serverRconPassword}`)}
            >
              click to view
            </button>
          </p>
        </div>
      </div>

      <div class="dashboard-card status">
        <StartStopButton />
      </div>

      <DashboardMap {data} onMapChange={() => refreshData()} />

      <PluginGroups />
    </div>
  {:else}
    <p>Loading...</p>
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    height: 100%;
    padding: 2rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 3rem;
  }

  .dashboard-header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .dashboard {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(5, minmax(0, 1fr));
    width: 100%;
    height: calc(100% - 3rem);
    gap: 1rem;
    grid-template-areas:
      "info info info info status status"
      "map map plgs plgs plgs plgs"
      "map map plgs plgs plgs plgs"
      ". . . . . ."
      ". . . . . ."
      ". . . . . .";
  }

  .status {
    grid-area: status;
    display: flex;
    justify-content: center;
    align-items: center;

    :global(button) {
      height: 100%;
      width: 100%;
    }
  }

  .info {
    grid-area: info;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-content {
    display: flex;
    width: 100%;
    height: calc(100% - 2rem);
    flex-direction: column;
    flex-wrap: wrap;
  }

  :global(.map-item) {
    width: 100%;
    height: 100% !important;
    min-height: 0rem !important;
    pointer-events: none;
    padding: 0 !important;
    border: none !important;
    background: none !important;

    :global(img) {
      object-fit: cover;
      width: 100% !important;
      height: auto;
    }
  }

  :global(.dashboard-card) {
    background-color: var(--color-bg-dark);
    padding: 1rem;
    border-radius: 0.5rem;
    width: 100%;
    height: 100%;
  }

  :global(.dashboard-card-title) {
    font-size: 1.1rem;
  }

  :global(.dashboard .plugin-groups) {
    grid-area: plgs;
    width: 100%;
    height: 100% !important;
  }
</style>
