// inkcast_custom/public/js/kanban_dropdown_filter.js

(() => {
  const PROJECT_CACHE = (window._inkcastProjectNameCache =
    window._inkcastProjectNameCache || {});

  function safeDecode(s) {
    try {
      return decodeURIComponent(s || "");
    } catch (e) {
      return s || "";
    }
  }

  function getProjectFilterValue() {
    // 1) route_options (often set when you navigate from filtered list)
    try {
      if (frappe.route_options) {
        if (frappe.route_options.project) return frappe.route_options.project;
        if (frappe.route_options.Project) return frappe.route_options.Project;
      }
    } catch (e) {}

    // 2) current list filters (works in List/Task/Kanban most of the time)
    try {
      if (window.cur_list && typeof cur_list.get_filters_for_args === "function") {
        const filters = cur_list.get_filters_for_args() || [];
        for (const f of filters) {
          // format: [doctype, fieldname, operator, value]
          if (!f || f.length < 4) continue;
          const field = (f[1] || "").toLowerCase();
          const val = f[3];
          if (field === "project" && val) return val;
        }
      }
    } catch (e) {}

    return null; // no filter -> show all
  }

  function getProjectTitle(projectId) {
    if (!projectId) return Promise.resolve("");
    if (PROJECT_CACHE[projectId]) return Promise.resolve(PROJECT_CACHE[projectId]);

    // Fetch project_name (title)
    return frappe.db.get_value("Project", projectId, "project_name").then((r) => {
      const title = (r && r.message && r.message.project_name) || "";
      const finalTitle = title || projectId; // fallback
      PROJECT_CACHE[projectId] = finalTitle;
      return finalTitle;
    }).catch(() => {
      PROJECT_CACHE[projectId] = projectId;
      return projectId;
    });
  }

  function applyFilterToDropdown(projectId, projectTitle) {
    const $menu = $(".custom-btn-group .dropdown-menu");
    if (!$menu.length) return;

    const titleNeedle = (" - " + (projectTitle || "")).toLowerCase();
    const idNeedle = (" - " + (projectId || "")).toLowerCase();

    // Only target Kanban board entries (they have data-label with "Board - ...")
    $menu.find("li.user-action .menu-item-label[data-label]").each(function () {
      const $label = $(this);
      const raw = $label.attr("data-label") || "";
      const decoded = safeDecode(raw).toLowerCase();

      const isBoardItem =
        decoded.indexOf("department board - ") !== -1 ||
        decoded.indexOf("status board - ") !== -1;

      if (!isBoardItem) return;

      const $li = $label.closest("li.user-action");

      // If we have a filter, keep only matching project title (or project id fallback)
      const keep =
        (projectTitle && decoded.indexOf(titleNeedle) !== -1) ||
        (projectId && decoded.indexOf(idNeedle) !== -1);

      $li.toggle(!!keep);
    });
  }

  function showAllBoards() {
    const $menu = $(".custom-btn-group .dropdown-menu");
    if (!$menu.length) return;

    $menu.find("li.user-action .menu-item-label[data-label]").each(function () {
      const decoded = safeDecode($(this).attr("data-label") || "").toLowerCase();

      const isBoardItem =
        decoded.indexOf("department board - ") !== -1 ||
        decoded.indexOf("status board - ") !== -1;

      if (!isBoardItem) return;

      $(this).closest("li.user-action").show();
    });
  }

  function run() {
    const projectId = getProjectFilterValue();

    // No filter => show all boards
    if (!projectId) {
      showAllBoards();
      return;
    }

    // Filter exists => show only current project's boards
    getProjectTitle(projectId).then((title) => {
      applyFilterToDropdown(projectId, title);
    });
  }

  // Run when dropdown opens (best moment; DOM is ready)
  $(document).on("shown.bs.dropdown", ".custom-btn-group", function () {
    setTimeout(run, 0);
  });

  // Also run on route changes (Kanban view navigation)
  if (frappe.router && typeof frappe.router.on === "function") {
    frappe.router.on("change", function () {
      setTimeout(run, 300);
    });
  }
})();

