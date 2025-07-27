<script lang="ts">
  let {
    children,
    open = $bindable(false),
    close = () => {},
    submit,
    submitText = "Submit",
    size = "md",
    title = "",
  }: {
    children?: any;
    open: boolean;
    close?: () => void;
    submit?: () => void;
    submitText?: string;
    size?: "sm" | "md" | "lg";
    title?: string;
  } = $props();
</script>

<div class="modal" class:modal--open={open}>
  <div
    class="modal-content"
    class:modal--sm={size === "sm"}
    class:modal--md={size === "md"}
    class:modal--lg={size === "lg"}
  >
    <button class="unstyled-btn close-btn" onclick={() => ((open = false), close())} aria-label="Close modal">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>

    {#if title}
      <h2 class="modal-title">{title}</h2>
    {/if}

    {@render children?.()}

    {#if submit}
      <div class="modal-actions">
        <button class="btn btn--light" onclick={() => ((open = false), close())}> Cancel </button>

        <button class="btn" onclick={() => ((open = false), submit?.())}>
          {submitText}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal {
    display: none;
    opacity: 0;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--color-modal-overlay);
    justify-content: center;
    align-items: center;
    padding: 1rem;
    transition: opacity 0.3s ease;
  }

  .modal--open {
    display: flex;
    opacity: 1;
  }

  .modal--sm {
    max-width: 22rem;
  }

  .modal--md {
    max-width: 36rem;
  }

  .modal--lg {
    max-width: 54rem;
  }

  .modal-content {
    background-color: var(--color-bg);
    border-radius: 0.5rem;
    padding: 2rem;
    position: relative;
    width: 100%;
  }

  .modal-title {
    margin: 0;
    font-size: 1.75rem;
    margin-bottom: 1rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
