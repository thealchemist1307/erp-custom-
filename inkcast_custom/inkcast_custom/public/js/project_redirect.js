frappe.ui.form.on("Project", {
  onload_post_render(frm) {
    frm.events.bind_task_kanban_redirect(frm);
  },
  refresh(frm) {
    frm.events.bind_task_kanban_redirect(frm);
  },

  bind_task_kanban_redirect(frm) {
    // remove old listener (avoid duplicates)
    if (frm._task_kanban_capture_handler && frm.$wrapper?.[0]) {
      frm.$wrapper[0].removeEventListener("click", frm._task_kanban_capture_handler, true);
    }

    frm._task_kanban_capture_handler = function (e) {
      const taskBlock = e.target.closest('.document-link[data-doctype="Task"]');
      if (!taskBlock) return;

      // allow the "+" (new task) button to work normally
      if (e.target.closest('button.btn.btn-new[data-doctype="Task"]')) return;

      // only hijack clicks on the badge area or notification bubble
      const clickedBadge = e.target.closest('.document-link[data-doctype="Task"] .document-link-badge');
      const clickedBubble = e.target.closest('.document-link[data-doctype="Task"] .open-notification');
      if (!clickedBadge && !clickedBubble) return;

      // stop Frappe's default "open list" handler (prevents first-click list + keeps history clean)
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      const project_title =
        frm.doc.project_name || frm.doc.project || frm.doc.title || frm.doc.name;

      const board_name = `Status Board - ${project_title}`;

      frappe.route_options = { project: frm.doc.name };
      frappe.set_route("List", "Task", "Kanban", board_name);
    };

    // CAPTURE phase so we run before Frappe handlers (important for first click after refresh)
    frm.$wrapper?.[0]?.addEventListener("click", frm._task_kanban_capture_handler, true);
  },
});

