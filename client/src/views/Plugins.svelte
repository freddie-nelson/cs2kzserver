<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { Cs2ServerStatus, getPlugins, getServerStatus, updatePlugin, type Plugin } from "../api/api";
  import { joinWithAnd } from "../utils/array";
  import { navigate } from "svelte5-router";
  import PluginGroups from "../components/PluginGroups.svelte";

  let plugins: Plugin[] | null = $state(null);
  getPlugins().then((p) => {
    plugins = p.plugins;
  });

  let searchQuery = $state("");
  let onlyShowEnabled = $state(false);
  const sortedPlugins = $derived(
    [...((plugins ?? []) as Plugin[])]
      .filter(
        (p) =>
          p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) && (!onlyShowEnabled || p.enabled)
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  );

  const updatingPlugins = $state(new SvelteSet<string>());
  const violatingDependencies = $derived(
    new Set(
      (plugins ?? ([] as Plugin[]))
        .filter((p) => p.dependencies.some((d) => !plugins?.find((pl) => pl.name === d && pl.enabled)))
        .map((p) => p.name) ?? []
    )
  );

  const togglePlugin = async (plugin: Plugin) => {
    if (!plugins) return;

    const status = await getServerStatus();
    if (status.status !== Cs2ServerStatus.STOPPED) {
      alert("You must stop the server before enabling/disabling plugins.");
      return;
    }

    const updatedPlugin = {
      ...plugin,
      enabled: !plugin.enabled,
    };

    updatingPlugins.add(plugin.name);

    try {
      const res = await updatePlugin(updatedPlugin);
      plugins = res.plugins;
    } finally {
      updatingPlugins.delete(plugin.name);
    }
  };
</script>

<main>
  <div class="header">
    <h1>Plugins</h1>
    <input type="text" placeholder="Search plugins..." bind:value={searchQuery} class="search-input" />

    <button
      class="btn"
      class:btn--light={!onlyShowEnabled}
      onclick={() => (onlyShowEnabled = !onlyShowEnabled)}
    >
      Show Only Enabled Plugins
    </button>
  </div>

  <PluginGroups onActivate={(plgs) => (plugins = plgs)} />

  {#if plugins}
    <div class="plugins">
      {#each sortedPlugins as plugin}
        <div class="plugin">
          <h2>{plugin.displayName}</h2>
          <p>{plugin.description}</p>

          {#if violatingDependencies.has(plugin.name) && plugin.enabled}
            <p class="dependency-error">
              Enable {joinWithAnd(
                plugin.dependencies
                  .map((d) => plugins?.find((pl) => pl.name === d))
                  .filter((d) => !d?.enabled)
                  .map((d) => d?.displayName)
              )} for this plugin to work correctly.
            </p>
          {/if}

          <div class="pills">
            <span
              class="pill"
              class:pill--primary={plugin.type === "metamod"}
              class:pill--secondary={plugin.type === "counterstrikesharp"}
              class:pill--accent={plugin.type === "configonly"}>{plugin.type}</span
            >

            <button class="pill" class:pill--success={plugin.enabled} onclick={() => togglePlugin(plugin)}>
              {updatingPlugins.has(plugin.name) ? "updating..." : plugin.enabled ? "enabled" : "disabled"}
            </button>

            {#if plugin.dependencies.length > 0}
              <span
                class="pill"
                class:pill--danger={violatingDependencies.has(plugin.name) && plugin.enabled}
              >
                {plugin.dependencies.length}
                {plugin.dependencies.length === 1 ? "dependency" : "dependencies"}
              </span>
            {/if}

            {#if plugin.configs.length > 0}
              <button class="pill" onclick={() => navigate(`/configs?search=${plugin.displayName}`)}>
                {plugin.configs.length}
                {plugin.configs.length === 1 ? "config" : "configs"}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p>Loading plugins...</p>
  {/if}
</main>

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

    button {
      margin-left: auto;
    }
  }

  .plugins {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .plugin {
    background-color: var(--color-bg-dark);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 14rem;
    height: min-content;

    h2 {
      font-size: 1.25rem;
    }

    p {
      line-clamp: 3;
      -webkit-line-clamp: 3;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-text-light);
    }

    .dependency-error {
      color: var(--color-danger);
      margin-bottom: 0.2rem;
    }

    .pills {
      margin-top: auto;
    }
  }
</style>
