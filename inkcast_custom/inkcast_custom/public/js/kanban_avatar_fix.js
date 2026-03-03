(() => {
  function stripOverlap(root = document) {
    root
      .querySelectorAll(
        ".kanban-card .avatar-group.overlap, .kanban-card .avatar-group.overlap.right"
      )
      .forEach((el) => el.classList.remove("overlap"));
  }

  function startKanbanObserver() {
    const container =
      document.querySelector(".layout-main-section") ||
      document.querySelector(".desk-page") ||
      document.body;

    stripOverlap(container);

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (
            node.matches?.(".kanban-card, .avatar-group.overlap, .avatar-group") ||
            node.querySelector?.(".kanban-card .avatar-group.overlap")
          ) {
            stripOverlap(node);
          }
        }
      }
    });

    obs.observe(container, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startKanbanObserver);
  } else {
    startKanbanObserver();
  }

  if (window.frappe?.router) {
    frappe.router.on("change", () => {
      setTimeout(() => stripOverlap(document), 50);
    });
  }
})();
