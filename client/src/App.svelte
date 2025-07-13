<script lang="ts">
  import { Router, Route } from "svelte5-router";
  import Sidebar from "./components/Sidebar.svelte";
  import Dashboard from "./views/Dashboard.svelte";
  import Logs from "./views/Logs.svelte";
  import Console from "./views/Console.svelte";
  import Plugins from "./views/Plugins.svelte";
  import Configs from "./views/Configs.svelte";

  let url = "";
</script>

<Router {url}>
  <Sidebar />
  <div>
      <Route path="/" component={Dashboard} />
      <Route path="/logs" component={Logs} />
      <Route path="/console" component={Console} />
      <Route path="/plugins" component={Plugins} />
      <Route path="/configs" component={Configs} />
  </div>
</Router>

<style>
</style>
