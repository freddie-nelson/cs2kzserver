<script lang="ts">
  import {
    addWorkshopMap,
    getServerConfig,
    type ServerMap,
    type ServerConfig,
    getActiveMap,
    setActiveMap,
    saveConfig,
  } from "../api/api";
  import LoadingMask from "../components/LoadingMask.svelte";
  import Modal from "../components/Modal.svelte";

  let maps: ServerMap[] | null = $state(null);
  let activeMap: string | null = $state(null);

  const updateMaps = async () => {
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

    isAddingMap = false;
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
      await updateMaps();
      alert(`Map "${map.name}" deleted successfully.`);
    } catch (error) {
      alert(`Failed to delete map "${map.name}": ${error}`);
    }
    isDeletingMap = false;
  };

  let isEnablingMap = $state(false);
  const enableMap = async (map: ServerMap) => {
    if (activeMap === map.name) {
      alert("This map is already the active map.");
      return;
    }

    isEnablingMap = true;

    try {
      await setActiveMap(map.name);
      activeMap = map.name;
      alert(`Map "${map.name}" is now active.`);
    } catch (error) {
      alert(`Failed to set active map: ${error}`);
    }

    isEnablingMap = false;
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
        <div class="map" class:active={activeMap === map.name}>
          <img src={map.image} alt={map.name} />

          <h2>{map.name}</h2>

          <div class="map-info">
            <div class="pills">
              <span class="pill" class:pill--accent={map.type === "workshop"}>
                {map.type}
              </span>
              {#if activeMap === map.name}
                <span class="pill pill--success">active</span>
              {/if}
            </div>

            <div class="buttons">
              <button class="btn" onclick={() => enableMap(map)} disabled={isEnablingMap}>
                Set Active
              </button>

              <button class="btn btn--danger" onclick={() => deleteMap(map)} disabled={isDeletingMap}>
                Delete
              </button>
            </div>
          </div>
        </div>
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

<LoadingMask loading={isEnablingMap || isAddingMap || isDeletingMap} />

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

  .map {
    background-color: var(--color-bg-dark);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 14rem;
    height: min-content;
    transition: transform 0.2s ease;

    img {
      width: 100%;
      height: auto;
      border-radius: 0.25rem;
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

  .active-map-warning {
    background-color: var(--color-bg-dark);
    color: var(--color-warning);
    border: 1px solid var(--color-warning);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
