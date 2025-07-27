<script lang="ts">
  const { loading }: { loading: boolean } = $props();
</script>

<div class="loading-mask" class:loading-mask--visible={loading}>
  <p>Loading...</p>
</div>

<style>
  .loading-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--color-modal-overlay);
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .loading-mask--visible {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
    opacity: 1;
  }
</style>
