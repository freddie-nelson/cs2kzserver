<script lang="ts">
  import {
    activatePluginGroup,
    Cs2ServerStatus,
    getPluginGroups,
    getPlugins,
    getServerStatus,
    savePluginGroups,
    type Plugin,
    type PluginGroups,
  } from "../api/api";
  import Modal from "./Modal.svelte";

  const {
    onActivate = () => {},
  }: {
    onActivate?: (plugins: Plugin[]) => void;
  } = $props();

  let pluginGroups = $state<PluginGroups | null>(null);
  getPluginGroups().then((groups) => {
    pluginGroups = groups;
  });

  let plugins = $state<Plugin[] | null>(null);
  getPlugins().then((plgs) => {
    plugins = plgs.plugins;
  });

  let activePlugins = $derived(plugins ? plugins.filter((p) => p.enabled).map((p) => p.name) : []);
  let activeGroup = $derived(
    Object.keys(pluginGroups || {}).find(
      (group) =>
        pluginGroups![group].every((p) => activePlugins.includes(p)) &&
        pluginGroups![group].length === activePlugins.length
    ) || ""
  );

  let editingGroup = $state<string | null>(null);
  let groupName = $state("");
  let chosenPlugins = $state<string[]>([]);
  let createModalOpen = $state(false);

  const createGroup = async () => {
    if (!groupName.trim()) {
      alert("Group name cannot be empty.");
      editingGroup = null;
      return;
    }

    if (!editingGroup && pluginGroups && pluginGroups[groupName.trim()]) {
      alert("Group with this name already exists.");
      editingGroup = null;
      return;
    }

    const newGroups: PluginGroups = { ...pluginGroups };
    if (editingGroup) {
      delete newGroups[editingGroup];
    }

    newGroups[groupName.trim()] = chosenPlugins;
    try {
      await savePluginGroups(newGroups);
      pluginGroups = newGroups;
    } catch (error) {
      alert("Failed to save plugin groups. Please try again.");
    } finally {
      groupName = "";
      chosenPlugins = [];
      editingGroup = null;
    }
  };

  const activateGroup = async (groupName: string) => {
    const group = pluginGroups?.[groupName];
    if (!group || !plugins) {
      alert("Group not found or no plugins available.");
      return;
    }

    try {
      const status = await getServerStatus();
      if (status.status !== Cs2ServerStatus.STOPPED) {
        alert("You must stop the server before enabling/disabling plugins.");
        return;
      }

      await activatePluginGroup(group);
      plugins = (await getPlugins()).plugins;
      onActivate(plugins);
    } catch (error) {
      alert("Failed to activate plugin group.");
    }
  };

  let deletingGroup: string | null = $state(null);
  const deleteGroup = async (groupName: string) => {
    if (!pluginGroups || !groupName) {
      deletingGroup = null;
      return;
    }

    const newGroups: PluginGroups = { ...pluginGroups };
    delete newGroups[groupName];

    try {
      await savePluginGroups(newGroups);
      pluginGroups = newGroups;
      deletingGroup = null;
    } catch (error) {
      alert("Failed to delete plugin group. Please try again.");
    }
  };
</script>

<div class="plugin-groups">
  <div class="plugin-groups-header">
    <h2 class="plugin-groups-title">Plugin Groups</h2>
    <button class="btn" onclick={() => (createModalOpen = true)}> Create Group </button>
  </div>

  {#if !pluginGroups || !plugins}
    <div class="center">
      <p>Loading...</p>
    </div>
  {:else if pluginGroups && Object.keys(pluginGroups).length === 0}
    <div class="center">
      <p>No plugin groups.</p>
    </div>
  {:else}
    <div class="plugin-groups-list">
      {#each Object.keys(pluginGroups || {}).sort((a, b) => a.localeCompare(b)) as group}
        <div class="plugin-group">
          <button
            class="btn plugin-group-button"
            class:btn--primary={group === activeGroup}
            class:btn--light={group !== activeGroup}
            class:btn--bg-hover={group !== activeGroup}
            onclick={() => activateGroup(group)}
          >
            {group}
          </button>

          <div class="plugin-group-controls">
            <button class="btn btn--danger" onclick={() => (deletingGroup = group)}> Delete </button>
            <button
              class="btn btn--accent"
              onclick={() => {
                createModalOpen = true;
                editingGroup = group;
                groupName = group;
                chosenPlugins = pluginGroups?.[group] || [];
              }}
            >
              Edit
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <Modal
    title={editingGroup ? "Edit Plugin Group" : "Create Plugin Group"}
    bind:open={createModalOpen}
    submit={createGroup}
    close={() => {
      createModalOpen = false;
      editingGroup = null;
      groupName = "";
      chosenPlugins = [];
    }}
  >
    <label class="modal-input">
      Group Name:
      <input type="text" bind:value={groupName} />
    </label>

    <label class="modal-input">
      Select Plugins: (ctrl+click or click+drag to select multiple)
      <select multiple bind:value={chosenPlugins} class="plugin-select">
        {#each plugins || [] as plugin}
          <option value={plugin.name}>{plugin.displayName}</option>
        {/each}
      </select>
    </label>
  </Modal>

  <Modal
    title="Delete Plugin Group"
    open={deletingGroup !== null}
    submit={() => deleteGroup(deletingGroup!)}
    close={() => (deletingGroup = null)}
    submitText="Delete"
  >
    <p>Are you sure you want to delete the group "{deletingGroup}"?</p>
  </Modal>
</div>

<style>
  .plugin-groups {
    background-color: var(--color-bg-dark);
    padding: 1rem;
    border-radius: 0.5rem;
    width: 100%;
    height: 13rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .plugin-groups-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .plugin-groups-title {
    font-size: 1.1rem;
  }

  .plugin-groups-list {
    display: flex;
    gap: 0.5rem;
    flex-grow: 1;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }

  .plugin-group {
    width: fit-content;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .plugin-group-button {
      width: 14rem;
      height: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .plugin-group-controls {
      display: flex;
      flex-direction: row-reverse;
      gap: 0.5rem;
    }
  }

  .center {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    padding-bottom: 2rem;
  }

  .plugin-select {
    max-height: 30rem;
    height: 50vh;
  }

  .modal-input {
    margin-bottom: 0.5rem;
  }
</style>
