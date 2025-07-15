<script lang="ts">
  import { endRconSession, executeRconCommand, startRconSession, type ServerLog } from "../api/api";
  import { getConsoleCommands, type ConsoleCommand } from "../api/consoleCommands";

  const logs: ServerLog[] = $state([]);
  let sending = $state(false);

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
</script>

<main>
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
      name="command"
      aria-label="RCON Command"
      type="text"
      placeholder="Type your command here..."
      required
      minlength="1"
      disabled={!validRconSession}
    />

    <button disabled={!validRconSession || sending} type="submit">
      {sending ? "Sending..." : "Send"}
    </button>

    {#if validRconSession}
      <button onclick={clear} type="button"> Clear Console </button>
    {:else}
      <button onclick={reconnect} type="button">
        {reconnecting ? "Reconnecting..." : "Reconnect"}
      </button>
    {/if}
  </form>
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
    scrollbar-width: thin;
    scrollbar-color: var(--color-text-light) var(--color-bg-light);
    font-family: monospace;
  }
</style>
