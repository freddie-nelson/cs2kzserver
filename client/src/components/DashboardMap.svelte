<script lang="ts">
  import { setActiveMap, type DashboardData } from "../api/api";
  import Map from "./Map.svelte";
  import Modal from "./Modal.svelte";

  const {
    data,
    onMapChange,
  }: {
    data: DashboardData;
    onMapChange: () => void;
  } = $props();

  let isChangeMapModalOpen = $state(false);
  let mapName = $state(data.activeMap || "");
  let isChangingMap = $state(false);

  const changeMap = async () => {
    isChangingMap = true;
    try {
      await setActiveMap(mapName);
      onMapChange();
      alert(`Map changed to "${mapName}" successfully.`);
    } catch (error) {
      alert(`Failed to change map: ${error}`);
    }
    isChangingMap = false;
  };
</script>

<div class="dashboard-card map">
  <div class="map-header">
    <h2 class="dashboard-card-title">Active Map</h2>

    <button class="btn" onclick={() => (isChangeMapModalOpen = true)}>
      {isChangingMap ? "Changing..." : "Change Map"}
    </button>

    <Modal title="Change Map" open={isChangeMapModalOpen} submit={changeMap}>
      <label>
        Select Map:
        <select name="map-name" bind:value={mapName}>
          {#each data.serverConfig.maps as map}
            <option value={map.name}>{map.name}</option>
          {/each}
        </select>
      </label>
    </Modal>
  </div>
  <div class="map-content">
    {#if data.activeMap}
      {#if data.serverConfig.maps.find((m) => m.name === data?.activeMap)}
        <div class="map-item-container">
          <Map
            className="map-item"
            map={data.serverConfig.maps.find((m) => m.name === data?.activeMap)!}
            isActive={true}
            hideSetActiveButton={true}
            hideDeleteButton={true}
            onActivate={() => {}}
            onDelete={() => {}}
          />
        </div>
      {:else}
        <p>No active map found</p>
      {/if}
    {:else}
      <p>No active map</p>
    {/if}
  </div>
</div>

<style>
  .map {
    grid-area: map;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .map-content {
    width: 100%;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .map-item-container {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
