<script lang="ts">
  import { Cs2ServerStatus, getServerStatus, startServer, stopServer } from "../api/api";

    let status: Cs2ServerStatus | null = $state(null); 
    getServerStatus().then((data) => {
        status = data.status;
    })

    let interval: NodeJS.Timeout;
    $effect(() => {
        interval = setInterval(async () => {
                status = (await getServerStatus()).status;
            }, 3000);

        return () => clearInterval(interval);
    })

    let isLoading = $state(false);
    const handleClick = async () => {
        if (isLoading || status === null) return; 

        isLoading = true;

        if (status === Cs2ServerStatus.RUNNING) {
            status = (await stopServer()).status;
        } else if (status === Cs2ServerStatus.STOPPED) {
            status = (await startServer()).status;
        } 

        isLoading = false;
    };
</script>

<button class="start-stop-button" onclick={handleClick} disabled={isLoading}>
    {#if status === null}
        <span>LOADING</span>
    {:else if status === Cs2ServerStatus.RUNNING}
        <span>STOP</span>
    {:else if status === Cs2ServerStatus.STOPPED}
        <span>START</span>
    {:else if status === Cs2ServerStatus.INSTALLING}
        <span>INSTALLING</span>
    {:else if status === Cs2ServerStatus.UPDATING}
        <span>UPDATING</span>
    {:else if status === Cs2ServerStatus.STARTING}
        <span>STARTING</span>
    {:else if status === Cs2ServerStatus.UPDATING_PLUGINS}
        <span>UPDATING PLUGINS</span>
    {:else}
        <span>UNKOWN</span>
    {/if}
</button>

<style>
    button {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
        padding: 1rem;
        background-color: var(--color-primary);
        color: var(--color-text);
        transition: all 0.3s ease;
        border: none;
        outline: none;
        border-radius: 0.5rem;
        font-size: 1.3rem;
        cursor: pointer;
        margin-top: auto;
    }
    
    button:disabled {
        filter: grayscale(1);
        cursor: not-allowed;
    }

    button:hover {
        background-color: var(--color-secondary);
    }
</style>