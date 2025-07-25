<script lang="ts">
  import { endRconSession, executeRconCommand, startRconSession, type ServerLog } from "../api/api";
  import { getConsoleCommands, type ConsoleCommand } from "../api/consoleCommands";
  import { distance } from "fastest-levenshtein";

  const logs: ServerLog[] = $state([]);
  let sending = $state(false);
  let command = $state("");

  let rconSessionId = $state<string | null>(null);
  const validRconSession = $derived(rconSessionId !== null && rconSessionId !== "ERROR");

  $effect(() => {
    startRconSession()
      .then(({ sessionId }) => (rconSessionId = sessionId))
      .catch(() => {
        rconSessionId = "ERROR";
      });

    return () => {
      if (!validRconSession) return;

      endRconSession(rconSessionId!).catch(() => {
        alert("Error ending RCON session. This may lead to orphaned sessions.");
      });
      rconSessionId = null;
    };
  });

  let reconnecting = $state(false);
  const reconnect = async () => {
    if (validRconSession || reconnecting) return;

    reconnecting = true;
    rconSessionId = null;
    await startRconSession()
      .then(({ sessionId }) => (rconSessionId = sessionId))
      .catch(() => {
        rconSessionId = "ERROR";
      });
    reconnecting = false;
  };

  const send = async (e: SubmitEvent) => {
    e.preventDefault();
    if (sending || !validRconSession) return;

    const target = e.target as HTMLFormElement;
    const data = new FormData(target);

    sending = true;

    const res = await executeRconCommand(rconSessionId!, data.get("command") as string);
    if (res.response === "") {
      logs.push({
        timestamp: new Date().toISOString(),
        message: "Command executed successfully.",
        type: "log",
      });
    } else {
      for (const line of res.response.split("\n")) {
        if (line.trim() === "") continue;

        logs.push({
          timestamp: new Date().toISOString(),
          message: line,
          type: "log",
        });
      }
    }

    target.reset();

    sending = false;
  };

  const clear = async () => {
    logs.length = 0;
  };

  let consoleCommands = $state<ConsoleCommand[]>([]);
  $effect(() => {
    getConsoleCommands().then((commands) => {
      consoleCommands = commands;
    });
  });

  const distanceToCommand = (cmd: ConsoleCommand) => {
    return (
      distance(command.toLowerCase(), cmd.command.toLowerCase()) * 20 +
      distance(command.toLowerCase(), cmd.description.toLowerCase())
    );
  };
  const filteredConsoleCommands = $derived(
    [...consoleCommands]
      // .filter((c) => c.command.toLowerCase().includes(command.toLowerCase()))
      .sort((a, b) => distanceToCommand(a) - distanceToCommand(b))
      .slice(0, 50)
  );
</script>

<main>
  <div class="console">
    <div class="logs-container">
      {#each [...logs].reverse() as log}
        <div class="log-entry">
          <span class="log-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span class="log-message">{log.message}</span>
        </div>
      {/each}

      {#if rconSessionId === null}
        <p>Connecting...</p>
      {:else if rconSessionId === "ERROR"}
        <p>
          Error connecting to RCON. Is your server running? If yes, check your server's settings and try
          restarting your server.
        </p>
      {:else if logs.length === 0}
        <p>Connected. No logs yet.</p>
      {/if}
    </div>

    <form class="footer" onsubmit={send}>
      <input
        bind:value={command}
        name="command"
        aria-label="RCON Command"
        type="text"
        placeholder="Type your command here..."
        required
        minlength="1"
        disabled={!validRconSession}
      />

      <button class="btn" disabled={!validRconSession || sending} type="submit">
        {sending ? "Sending..." : "Send"}
      </button>

      {#if validRconSession}
        <button class="btn" onclick={clear} type="button"> Clear Console </button>
      {:else}
        <button class="btn" onclick={reconnect} type="button">
          {reconnecting ? "Reconnecting..." : "Reconnect"}
        </button>
      {/if}
    </form>
  </div>

  <div class="commands">
    <ul>
      {#each filteredConsoleCommands as c}
        <li>
          <button class="btn" onclick={() => (command = c.command)}>
            <strong>{c.command}</strong>: {c.description}
            {c.defaultValue !== "cmd" ? `(default: ${c.defaultValue})` : ""}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</main>

<style>
  main {
    width: 100%;
    height: 100vh;
    padding: 2rem;
    overflow-y: auto;
  }

  .console {
    height: 90%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .commands {
    margin-top: 1rem;

    ul {
      list-style: none;
      padding: 0;
      font-size: 1.1rem;
      color: var(--color-text-light);
    }

    li {
      button {
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        padding: 0;
        text-align: left;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;

    input {
      width: 100%;
      font-size: 1.15rem;
      padding: 0.75rem 1rem;
    }

    button {
      height: 90%;
      width: 9rem;
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
    font-family: monospace;
  }
</style>
