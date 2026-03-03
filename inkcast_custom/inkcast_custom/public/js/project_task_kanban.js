(() => {
  if (window.__inkcast_kanban_empty_hint_bound) return;
  window.__inkcast_kanban_empty_hint_bound = true;

  const HINT_ID = "inkcast-kanban-empty-hint";

  function isTaskKanbanRoute() {
    const r = frappe.get_route?.() || [];
    return r[0] === "List" && r[1] === "Task" && r[2] === "Kanban";
  }

  function getProjectFilter() {
    // Try route_options first
    const ro = frappe.route_options || {};
    if (ro.project) return ro.project;

    // Then URL query params (works if you have ?project=...)
    try {
      const params =
        (frappe.utils && frappe.utils.get_query_params && frappe.utils.get_query_params()) ||
        Object.fromEntries(new URLSearchParams(window.location.search));
      return params.project || null;
    } catch (e) {
      return null;
    }
  }

  function hasKanbanCards() {
    return !!document.querySelector(
      ".kanban-card, .kanban-item, .kanban-card-wrapper, .kanban-column .card"
    );
  }

  function ensureHint(project) {
    const overlay = document.getElementById("build-events-overlay");
    if (!overlay) return;

    // If cards exist, remove hint
    if (hasKanbanCards()) {
      const existing = document.getElementById(HINT_ID);
      if (existing) existing.remove();
      return;
    }

    // Already shown
    if (document.getElementById(HINT_ID)) return;

    const wrap = document.createElement("div");
    wrap.id = HINT_ID;
    wrap.style.cssText = `
      position: relative;
      display: grid;
      place-items: center;
      min-height: 220px;
      padding: 24px;
      margin-top: 8px;
    `;

    wrap.innerHTML = `
      <div style="
        max-width: 520px;
        width: 100%;
        text-align: center;
        border: 1px dashed var(--gray-300);
        border-radius: 12px;
        padding: 18px 16px;
        background: var(--card-bg, var(--bg-color));
      ">
        <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 10px;">
          Create a Task to generate Kanban view.
        </div>
        <button class="btn btn-primary btn-sm" type="button" id="${HINT_ID}-btn">
          + Create Task
        </button>
      </div>
    `;

    overlay.appendChild(wrap);

    // button: open new Task with project prefilled (if we have it)
    const btn = document.getElementById(`${HINT_ID}-btn`);
    if (btn) {
      btn.addEventListener("click", () => {
        frappe.new_doc("Task", project ? { project } : {});
      });
    }
  }

  function startWatching() {
    // Delay a bit so kanban DOM renders
    setTimeout(() => {
      if (!isTaskKanbanRoute()) return;

      const project = getProjectFilter();

      // 1) initial render
      ensureHint(project);

      // 2) watch DOM changes (when cards/columns load)
      const overlay = document.getElementById("build-events-overlay") || document.body;
      const mo = new MutationObserver(() => {
        if (!isTaskKanbanRoute()) {
          mo.disconnect();
          const existing = document.getElementById(HINT_ID);
          if (existing) existing.remove();
          return;
        }
        ensureHint(project);
      });

      mo.observe(overlay, { childList: true, subtree: true });
    }, 400);
  }

  // Run when route changes
  frappe.after_ajax(() => {
    startWatching();
    frappe.router?.on?.("change", () => {
      // cleanup if leaving
      if (!isTaskKanbanRoute()) {
        const existing = document.getElementById(HINT_ID);
        if (existing) existing.remove();
      }
      startWatching();
    });
  });
})();

