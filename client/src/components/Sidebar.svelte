<script lang="ts">
</script>

<aside>
    <h1>CS2 Server Manager</h1>
    <nav>
        <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/plugins">Plugins</a></li>
            <li><a href="/settings">Settings</a></li>
        </ul>
    </nav>
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
    }

    li a {
        display: block;
        width: 100%;
        padding: 1rem 0;
        color: var(--color-text-light);
        transition: all 0.3s ease;
        text-decoration: none;
        border-radius: 0.5rem;
    }

    li a:hover {
        color: var(--color-text);
        background-color: var(--color-bg-light);
    }
</style>
