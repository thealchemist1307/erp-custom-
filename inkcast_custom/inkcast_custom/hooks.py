# inkcast_custom/hooks.py

app_name = "inkcast_custom"
app_title = "Inkcast Custom"
app_publisher = "thealchemist1307"
app_description = "Custom App for Inkcast"
app_email = "nishitrchouhan@gmail.com"
app_license = "mit"

# Load JS on specific doctypes/views
# NOTE: doctype_list_js must be a STRING path (not a list)
doctype_list_js = {
    #"Task": "public/js/task_list.js",
}

doctype_js = {
    "Project": "public/js/project_redirect.js",
}

# Document events
doc_events = {

}

# Global Desk includes (load everywhere in Desk)
# Use only files that actually exist in inkcast_custom/public/js
app_include_js = [
    "/assets/inkcast_custom/js/project_task_kanban.js",
    #"/assets/inkcast_custom/js/task_list.js",
    "/assets/inkcast_custom/js/kanban_dropdown_filter.js",
    "/assets/inkcast_custom/js/kanban_avatar_fix.js",
]
permission_query_conditions = {
    "Project": "inkcast_custom.permissions.project_permission_query_conditions",
    "Task": "inkcast_custom.permissions.task.task_get_permission_query_conditions",
}

has_permission = {
    "Project": "inkcast_custom.permissions.project_has_permission",
}
