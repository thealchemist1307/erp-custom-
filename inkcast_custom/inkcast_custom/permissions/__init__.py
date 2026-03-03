# inkcast_custom/permissions.py
import frappe

ADMIN_ROLE_PROFILES = {
    "System Administrator",
    "MD",
    "CEO",
    "Operations Executive",
    "COO",
    "Creative Strategist",
}

def _is_admin_whitelisted(user: str) -> bool:
    if not user or user == "Guest":
        return False
    if user == "Administrator":
        return True
    roles = set(frappe.get_roles(user) or [])
    return bool(roles.intersection(ADMIN_ROLE_PROFILES))


def project_permission_query_conditions(user: str) -> str:
    user = user or frappe.session.user

    if _is_admin_whitelisted(user):
        return ""

    user_esc = frappe.db.escape(user)

    return (
        "("
        "exists ("
        "   select 1 from `tabProject User` pu"
        "   where pu.parent = `tabProject`.name"
        "     and pu.user = " + user_esc +
        ")"
        " or `tabProject`.owner = " + user_esc +
        ")"
    )


def project_has_permission(doc, ptype=None, user=None) -> bool:
    # New docs don't have doc.name yet during permission checks (shows "Project - None")
    # Defer to standard Role Permission Manager for create/new docs.
    if ptype == "create" or not getattr(doc, "name", None) or doc.get("__islocal") or (hasattr(doc, "is_new") and doc.is_new()):
        return None
    user = user or frappe.session.user

    if _is_admin_whitelisted(user):
        return True

    if not doc:
        return True

    project_name = doc.name if hasattr(doc, "name") else str(doc)
    if not project_name or user in ("Guest", None):
        return False

    owner = frappe.db.get_value("Project", project_name, "owner")
    if owner == user:
        return True

    return bool(frappe.db.exists("Project User", {"parent": project_name, "user": user}))
