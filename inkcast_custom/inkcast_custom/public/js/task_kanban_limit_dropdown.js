(function () {
  function isTaskKanban() {
    const r = frappe.get_route();
    return r && r[0] === "List" && r[1] === "Task" && r[2] === "Kanban" && r[3];
  }

  function limitDropdownToCurrentBoard(wrapper) {
    if (!isTaskKanban()) return;

    const boardName = frappe.get_route()[3]; // decoded (e.g. "Department Board - Inkcast Dummy")
    const allowed = encodeURIComponent(boardName); // matches data-label

    // find the "Select Kanban" button group inside this page
    const group = $(wrapper)
      .find(".custom-btn-group")
      .has('.custom-btn-group-label:contains("Select Kanban")')
      .first();

    if (!group.length) return;

    const btn = group.find('button[data-toggle="dropdown"]').get(0);
    if (!btn || btn.__kanbanLimited) return;
    btn.__kanbanLimited = true;

    // each time dropdown opens, remove everything except current board
    group.on("click.kanbanLimit", 'button[data-toggle="dropdown"]', () => {
      setTimeout(() => {
        const menu = group.find("ul.dropdown-menu");
        if (!menu.length) return;

        menu.find("li").each(function () {
          const label = $(this).find(".menu-item-label[data-label]");
          if (!label.length) return;

          const val = label.attr("data-label") || "";
          // keep ONLY the current board; remove all others + "Create New Kanban Board"
          if (val !== allowed) $(this).remove();
        });

        // cleanup leftover dividers
        menu.find(".dropdown-divider").remove();

        // optional: if only one item left, make it feel “locked”
        // group.find('svg.icon[href="#icon-select"]').hide();
      }, 0);
    });
  }

  // Works for both List and Kanban views because Kanban is a ListView variant
  frappe.listview_settings["Task"] = frappe.listview_settings["Task"] || {};
  const prev_onload = frappe.listview_settings["Task"].onload;
  const prev_refresh = frappe.listview_settings["Task"].refresh;

  frappe.listview_settings["Task"].onload = function (listview) {
    prev_onload && prev_onload(listview);
    limitDropdownToCurrentBoard(listview.page.wrapper);
  };

  frappe.listview_settings["Task"].refresh = function (listview) {
    prev_refresh && prev_refresh(listview);
    limitDropdownToCurrentBoard(listview.page.wrapper);
  };
})();

