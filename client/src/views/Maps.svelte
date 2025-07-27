<script lang="ts">
  import {
    addWorkshopMap,
    getServerConfig,
    type ServerMap,
    type ServerConfig,
    getActiveMap,
  } from "../api/api";
  import LoadingMask from "../components/LoadingMask.svelte";
  import Map from "../components/Map.svelte";
  import Modal from "../components/Modal.svelte";

  let maps: ServerMap[] | null = $state(null);
  let activeMap: string | null = $state(null);

  const updateMaps = async () => {
    maps = null;
    activeMap = null;
    activeMap = await getActiveMap().then((res) => res.map || null);
    maps = await getServerConfig().then((c: ServerConfig) => c.maps);
  };
  updateMaps();

  let searchQuery = $state("");
  let onlyShowWorkshop = $state(false);
  let onlyShowValve = $state(false);
  const sortedMaps = $derived(
    [...((maps ?? []) as ServerMap[])]
      .filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          (!onlyShowWorkshop || m.type === "workshop") &&
          (!onlyShowValve || m.type === "valve")
      )
      .sort((a, b) => (a.name === activeMap ? -1 : b.name === activeMap ? 1 : a.name.localeCompare(b.name)))
  );

  let isAddMapModalOpen = $state(false);
  let isAddingMap = $state(false);
  let mapName = $state("");

  const addMap = async () => {
    if (isAddingMap) {
      return;
    }

    if (!mapName.trim()) {
      alert("Map name cannot be empty.");
      return;
    }

    if (maps?.some((m) => m.name === mapName.trim())) {
      alert("Map with this name already exists.");
      return;
    }

    isAddingMap = true;
    try {
      await addWorkshopMap(mapName.trim());
      await updateMaps();
      alert(`Map "${mapName.trim()}" added successfully.`);
    } catch (error) {
      alert(`Failed to add map "${mapName.trim()}": ${error}`);
    }

    mapName = "";
    isAddingMap = false;
  };
</script>

<main>
  <div class="header">
    <h1>Maps</h1>
    <input type="text" placeholder="Search maps..." bind:value={searchQuery} class="search-input" />

    <div>
      <button
        class="btn"
        class:btn--light={!onlyShowWorkshop}
        onclick={() => ((onlyShowWorkshop = !onlyShowWorkshop), (onlyShowValve = false))}
      >
        Show Only Workshop Maps
      </button>

      <button
        class="btn"
        class:btn--light={!onlyShowValve}
        onclick={() => ((onlyShowValve = !onlyShowValve), (onlyShowWorkshop = false))}
      >
        Show Only Valve Maps
      </button>

      <button class="btn" onclick={() => (isAddMapModalOpen = true)} disabled={isAddingMap}>
        {isAddingMap ? "Adding..." : "+ Add Map"}
      </button>
    </div>
  </div>

  {#if maps}
    {#if activeMap && !maps.some((m) => m.name === activeMap)}
      <div class="active-map-warning">
        <p>Warning: Active map is set to "{activeMap}" but it is not in the list of maps.</p>
      </div>
    {/if}

    <div class="maps">
      {#each sortedMaps as map}
        <Map
          {map}
          isActive={map.name === activeMap}
          onActivate={() => (activeMap = map.name)}
          onDelete={() => updateMaps()}
        />
      {/each}
    </div>
  {:else}
    <p>Loading maps...</p>
  {/if}
</main>

<Modal bind:open={isAddMapModalOpen} submit={addMap} title="Add Map">
  <label class="modal-input">
    Name:
    <input type="text" bind:value={mapName} />
  </label>
</Modal>

<LoadingMask loading={isAddingMap} />

<style>
  main {
    padding: 2rem;
    height: 100vh;
    overflow-y: auto;
  }

  .header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;

    h1 {
      font-size: 1.75rem;
    }

    input {
      width: 100%;
      max-width: 24rem;
    }

    div {
      display: flex;
      margin-left: auto;
      gap: 1rem;
    }
  }

  .maps {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: 1rem;
  }

  .active-map-warning {
    background-color: var(--color-bg-dark);
    color: var(--color-warning);
    border: 1px solid var(--color-warning);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
