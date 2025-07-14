<script lang="ts">
  import { getDashboardData, type DashboardData } from "../api/api";

    let data: DashboardData | null = $state(null);
    getDashboardData().then((d) => {
        data = d;
    });

    $effect(() => {
        let interval = setInterval(async () => {
            data = await getDashboardData();
        }, 10000);

        return () => clearInterval(interval);
    })
</script>

<main>
  <h1>Dashboard</h1>
</main>

<style></style>

