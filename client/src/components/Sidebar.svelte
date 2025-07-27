<script lang="ts">
  import { Link } from "svelte5-router";
  import StartStopButton from "./StartStopButton.svelte";
</script>

<aside>
  <h1>CS2 Server Manager</h1>
  <nav>
    <ul>
      <li><Link class="sidebar__link" to="/">Dashboard</Link></li>
      <li><Link class="sidebar__link" to="/maps">Maps</Link></li>
      <li><Link class="sidebar__link" to="/logs">Logs</Link></li>
      <li><Link class="sidebar__link" to="/console">Console</Link></li>
      <li><Link class="sidebar__link" to="/plugins">Plugins</Link></li>
      <li><Link class="sidebar__link" to="/configs">Configs</Link></li>
    </ul>
  </nav>

  <StartStopButton />
</aside>

<style>
  aside {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    padding: 1.5rem;
    background-color: var(--color-bg-dark);
    gap: 1.5rem;
  }

  h1 {
    font-size: 1.3rem;
    text-align: center;
  }

  ul {
    list-style: none;
    padding: 0;
    text-align: center;
    font-size: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.sidebar__link) {
    display: block;
    width: 100%;
    padding: 1rem 0;
    color: var(--color-text-light);
    transition: all 0.3s ease;
    text-decoration: none;
    border-radius: 0.5rem;

    &:hover {
      color: var(--color-text);
      background-color: var(--color-bg-light);
    }

    &[aria-current="page"] {
      color: var(--color-bg-light);
      background-color: var(--color-text);
    }
  }
</style>
