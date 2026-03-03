import frappe

FIELDNAME = "custom_kanban_header"
PREFIX = "Department Board - "

def _get_options():
    df = frappe.get_meta("Task").get_field(FIELDNAME)
    if not df:
        return []
    return [o.strip() for o in (df.options or "").splitlines() if o.strip()]

def _get_parentfield():
    kb_meta = frappe.get_meta("Kanban Board")
    for f in kb_meta.fields:
        if f.fieldtype == "Table" and f.options == "Kanban Board Column":
            return f.fieldname
    return None

def _get_col_fields():
    kbc_meta = frappe.get_meta("Kanban Board Column")
    fieldnames = {f.fieldname for f in kbc_meta.fields}

    # most installs use column_name or column
    col_field = "column_name" if "column_name" in fieldnames else ("column" if "column" in fieldnames else None)
    if not col_field:
        for f in kbc_meta.fields:
            if f.fieldtype in ("Data", "Select") and "column" in (f.fieldname or "").lower():
                col_field = f.fieldname
                break

    arch_field = "is_archived" if "is_archived" in fieldnames else ("archived" if "archived" in fieldnames else None)
    return col_field, arch_field

def _ensure_columns(board_name: str):
    parentfield = _get_parentfield()
    if not parentfield:
        return

    options = _get_options()
    if not options:
        return

    col_field, arch_field = _get_col_fields()
    if not col_field:
        return

    kb = frappe.get_doc("Kanban Board", board_name)

    rows = kb.get(parentfield) or []
    existing = {}
    for r in rows:
        v = r.get(col_field)
        if v:
            existing[v] = r

    for opt in options:
        if opt in existing:
            if arch_field and existing[opt].get(arch_field):
                existing[opt].set(arch_field, 0)
        else:
            payload = {col_field: opt}
            if arch_field:
                payload[arch_field] = 0
            kb.append(parentfield, payload)

    kb.save(ignore_permissions=True)

def ensure_department_board_for_project(doc, method=None):
    # Create the Department board named: Department Board - <Project Name>
    project_name = doc.project_name or doc.name
    board_name = f"{PREFIX}{project_name}"

    if frappe.db.exists("Kanban Board", board_name):
        _ensure_columns(board_name)
        return

    kb_meta = frappe.get_meta("Kanban Board")
    kb_fields = {f.fieldname for f in kb_meta.fields}

    payload = {"doctype": "Kanban Board"}
    # Most setups autoname from this field:
    if "kanban_board_name" in kb_fields:
        payload["kanban_board_name"] = board_name
    else:
        payload["name"] = board_name

    if "reference_doctype" in kb_fields:
        payload["reference_doctype"] = "Task"

    # Important: make Kanban use your select field for columns
    for fn in ("field_name", "fieldname"):
        if fn in kb_fields:
            payload[fn] = FIELDNAME
            break

    frappe.get_doc(payload).insert(ignore_permissions=True)
    _ensure_columns(board_name)

def ensure_department_board_columns(doc, method=None):
    # If someone manually creates a Department board, still populate columns automatically
    if doc.name.startswith(PREFIX) and getattr(doc, "reference_doctype", None) == "Task":
        _ensure_columns(doc.name)

