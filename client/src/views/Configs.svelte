<script lang="ts">
  import { getConfigs, saveConfig, type Config } from "../api/api";
  import CodeMirror from "svelte-codemirror-editor";
  import { json } from "@codemirror/lang-json";
  import { createTheme } from "thememirror";
  import { tags as t } from "@lezer/highlight";
  import { navigate, useLocation } from "svelte5-router";

  let configs: Config[] | null = $state(null);
  getConfigs().then((c) => {
    configs = c.configs;
    selectConfig(sortedConfigs[0]);
  });

  let searchQuery = $state(new URLSearchParams(window.location.search).get("search") || "");
  const sortedConfigs = $derived(
    [...((configs ?? []) as Config[])]
      .filter(
        (config) =>
          config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (config.plugin && config.plugin.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  let selectedConfig: Config | null = $state(null);
  let configValue = $state("");

  let saving = $state(false);
  let saved = $state(false);

  const save = async () => {
    if (!selectedConfig) return;

    saving = true;
    try {
      await saveConfig(selectedConfig.name, configValue);
      selectedConfig.config = configValue;
      saved = true;
      setTimeout(() => {
        saved = false;
      }, 2000);
    } finally {
      saving = false;
    }
  };

  const selectConfig = (config: Config) => {
    if (!configs || config.name === selectedConfig?.name || saving) return;

    selectedConfig = config;
    configValue = config.config;

    navigate(`/configs?config=${encodeURIComponent(config.name)}`, { replace: true });
  };

  const location = useLocation();
  $effect(() => {
    const unsubscribe = location.subscribe((loc) => {
      const params = new URLSearchParams(loc.search);
      const configName = params.get("config");
      if (!configName || !configs) {
        return;
      }

      const config = configs.find((c) => c.name === configName);
      if (config && config !== selectedConfig) {
        selectConfig(config);
      }
    });

    return () => {
      unsubscribe();
    };
  });

  const theme = createTheme({
    variant: "dark",
    settings: {
      background: "var(--color-bg-dark)",
      foreground: "var(--color-text)",
      caret: "var(--color-primary)",
      selection: "color-mix(in srgb, var(--color-secondary) 10%, transparent)",
      lineHighlight: "color-mix(in srgb, var(--color-secondary) 20%, transparent)",
      gutterBackground: "var(--color-bg)",
      gutterForeground: "var(--color-text-light)",
    },
    styles: [
      {
        tag: [t.string, t.special(t.string)],
        color: "var(--color-string)",
      },
      {
        tag: [t.number, t.bool, t.null],
        color: "var(--color-number)",
      },
      {
        tag: t.propertyName,
        color: "var(--color-property)",
      },
    ],
  });
</script>

<main>
  {#if configs}
    <aside class="configs">
      <h1>Configs</h1>
      <input
        type="text"
        placeholder="Search name or plugin..."
        bind:value={searchQuery}
        class="search-input"
      />
      <ul>
        {#each sortedConfigs as config}
          <li class:selected={selectedConfig === config}>
            <button class="unstyled-btn" onclick={() => selectConfig(config)}>
              <span>{config.name}</span>

              {#if config.plugin}
                <span class="pill pill--primary pill--sm plugin-name">
                  {config.plugin?.displayName} plugin
                </span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    {#if selectedConfig}
      <div class="config-editor">
        <div class="controls">
          <h2>{selectedConfig.name}</h2>
          {#if selectedConfig.plugin}
            <span class="pill pill--primary">{selectedConfig.plugin?.displayName} plugin</span>
          {/if}

          <button class="btn" onclick={save} disabled={saving || configValue === selectedConfig.config}>
            {saved ? "Saved!" : saving ? "Saving..." : "Save Config"}
          </button>
        </div>

        <CodeMirror bind:value={configValue} lang={json()} {theme} />
      </div>
    {/if}
  {:else}
    <p class="loading">Loading configs...</p>
  {/if}
</main>

<style>
  main {
    height: 100vh;
    display: flex;
    flex-direction: row;
    --config-list-width: calc(var(--sidebar-width) + 3rem);
  }

  .loading {
    padding: 2rem;
  }

  .configs {
    padding: 2rem;
    height: 100%;
    width: var(--config-list-width);
    overflow-y: auto;
    background-color: var(--color-bg-light);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;

    .search-input {
      width: 100%;
      margin-bottom: 0.5rem;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: 0.5rem;
        border-bottom: 1px solid var(--color-border);

        button {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          width: 100%;
          min-height: 3.3rem;
        }

        &:hover,
        &.selected {
          background-color: var(--color-bg);
        }

        .plugin-name {
          display: block;
          width: fit-content;
        }
      }
    }
  }

  .config-editor {
    height: 100vh;
    width: calc(100% - var(--config-list-width));
    display: flex;
    flex-direction: column;
    --controls-height: 3rem;

    .controls {
      display: flex;
      gap: 1rem;
      align-items: center;
      background-color: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      height: var(--controls-height);
      padding: 0.5rem;

      h2 {
        font-size: 1.125rem;
        margin: 0;
        font-weight: 500;
      }

      button {
        margin-left: auto;
      }
    }
  }

  :global(.cm-editor) {
    height: calc(100vh - var(--controls-height));
    width: 100%;
  }

  :global(.cm-selectionBackground) {
    background: var(--color-bg) !important;
  }

  :global(.cm-focused .cm-selectionBackground) {
    background: color-mix(in srgb, var(--color-secondary) 10%, transparent) !important;
  }

  :global(.cm-selectionMatch) {
    background: color-mix(in srgb, var(--color-secondary) 20%, transparent) !important;
  }
</style>
