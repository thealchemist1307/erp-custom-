(() => {
  const ID = "inkcast-kanban-empty-banner";

  function isTaskKanban() {
    const r = frappe.get_route?.() || [];
    return r[0] === "List" && r[1] === "Task" && r[2] === "Kanban";
  }

  function countRealCards() {
    return document.querySelectorAll(".kanban-cards .kanban-card:not(.new-card-area)").length;
  }

  function removeBanner() {
    document.getElementById(ID)?.remove();
  }

  function ensureBanner() {
    if (!isTaskKanban()) return removeBanner();

    // show only when empty
    if (countRealCards() > 0) return removeBanner();

    if (document.getElementById(ID)) return;

    const page = document.querySelector(".page-container");
    const pageHead = document.querySelector(".page-head");
    if (!page || !pageHead) return;

    const el = document.createElement("div");
    el.id = ID;
    el.style.cssText = `
      max-width: 1180px;
      margin: 14px auto 0;
      padding: 0 15px;
    `;

    el.innerHTML = `
      <div style="
        width: 100%;
        border: 1px dashed var(--gray-300);
        border-radius: 14px;
        padding: 18px 16px;
        background: var(--card-bg, var(--bg-color));
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      ">
        <div style="color: var(--text-muted); font-size: 14px;">
          Create a task to generate kanban view.
        </div>
        <button type="button" class="btn btn-primary btn-sm">+ Add Task</button>
      </div>
    `;

    // Insert BELOW the entire header row (page-head)
    pageHead.insertAdjacentElement("afterend", el);

    el.querySelector("button")?.addEventListener("click", () => {
      // click the existing top-right Add Task if present
      const btn = document.querySelector("button.primary-action[data-label='Add Task']");
      if (btn) btn.click();
      else frappe.new_doc("Task");
    });
  }

  function boot() {
    setTimeout(ensureBanner, 300);
    setTimeout(ensureBanner, 1200);

    const root = document.querySelector(".page-container") || document.body;
    const mo = new MutationObserver(() => ensureBanner());
    mo.observe(root, { childList: true, subtree: true });

    frappe.router?.on?.("change", () => {
      if (!isTaskKanban()) removeBanner();
      setTimeout(ensureBanner, 400);
    });
  }

  frappe.after_ajax(() => boot());
})();

