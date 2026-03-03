from typing import Optional
import frappe


def task_get_permission_query_conditions(user: str) -> Optional[str]:
    user = user or frappe.session.user

    if not user or user == "Guest":
        return "1=0"

    # Optional: keep Admin unfiltered
    if user == "Administrator":
        return None

    user_esc = frappe.db.escape(user)

    return f"""
        (
            `tabTask`.project is not null
            and `tabTask`.project != ''
            and
            (
                exists (
                    select 1
                    from `tabProject` p
                    where p.name = `tabTask`.project
                      and p.owner = {user_esc}   -- project creator
                )
                or
                exists (
                    select 1
                    from `tabProject User` pu
                    where pu.parenttype = 'Project'
                      and pu.parent = `tabTask`.project
                      and pu.user = {user_esc}  -- assigned user in project team
                )
            )
        )
    """

