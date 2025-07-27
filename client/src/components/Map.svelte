<script lang="ts">
  import { getServerConfig, saveConfig, setActiveMap, type ServerMap } from "../api/api";
  import LoadingMask from "./LoadingMask.svelte";

  const {
    map,
    isActive,
    hideSetActiveButton = false,
    hideDeleteButton = false,
    className = "",
    onActivate,
    onDelete,
  }: {
    map: ServerMap;
    isActive: boolean;
    hideSetActiveButton?: boolean;
    hideDeleteButton?: boolean;
    className?: string;
    onActivate: () => void;
    onDelete: () => void;
  } = $props();

  let isEnablingMap = $state(false);
  const enableMap = async (map: ServerMap) => {
    if (isEnablingMap) {
      return;
    }

    if (isActive) {
      alert("This map is already the active map.");
      return;
    }

    isEnablingMap = true;

    try {
      await setActiveMap(map.name);
      onActivate();
      alert(`Map "${map.name}" is now active.`);
    } catch (error) {
      alert(`Failed to set active map: ${error}`);
    }

    isEnablingMap = false;
  };

  let isDeletingMap = $state(false);
  const deleteMap = async (map: ServerMap) => {
    if (isDeletingMap || !confirm(`Are you sure you want to delete the map "${map.name}"?`)) {
      return;
    }

    isDeletingMap = true;
    try {
      const config = await getServerConfig();
      config.maps = config.maps.filter((m) => m.name !== map.name);
      await saveConfig("server.json", JSON.stringify(config, null, 2));
      onDelete();
      alert(`Map "${map.name}" deleted successfully.`);
    } catch (error) {
      alert(`Failed to delete map "${map.name}": ${error}`);
    }
    isDeletingMap = false;
  };
</script>

<div class={`map ${className}`} class:active={isActive}>
  <div class="map-img" style:background-image={`url(${map.image})`}></div>

  <h2>{map.name}</h2>

  <div class="map-info">
    <div class="pills">
      <span class="pill" class:pill--accent={map.type === "workshop"}>
        {map.type}
      </span>
      {#if isActive}
        <span class="pill pill--success">active</span>
      {/if}
    </div>

    <div class="buttons">
      {#if !hideSetActiveButton}
        <button class="btn" onclick={() => enableMap(map)} disabled={isEnablingMap || isActive}>
          Set Active
        </button>
      {/if}

      {#if !hideDeleteButton}
        <button class="btn btn--danger" onclick={() => deleteMap(map)} disabled={isDeletingMap}>
          Delete
        </button>
      {/if}
    </div>
  </div>
</div>

<LoadingMask loading={isEnablingMap || isDeletingMap} />

<style>
  .map {
    background-color: var(--color-bg-dark);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 18rem;
    height: min-content;
    transition: transform 0.2s ease;

    .map-img {
      width: 100%;
      flex-grow: 1;
      border-radius: 0.25rem;
      background-size: cover;
    }

    h2 {
      font-size: 1.25rem;
    }

    &:hover {
      transform: scale(1.03);
    }

    &.active {
      border: 0.2rem solid var(--color-success);
    }

    .map-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }
  }
</style>
