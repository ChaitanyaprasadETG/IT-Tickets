# IT Support Portal

This repo now contains two tracks that can move in parallel:

- The existing Power Pages export in `it-support---etgithubportal/`
- A new React plus backend API architecture in `frontend/` and `backend/`

## Run locally

PowerShell on this machine blocks plain `npm`, so use `npm.cmd`.

Install dependencies:

```powershell
npm.cmd install
npm.cmd --prefix frontend install
npm.cmd --prefix backend install
```

Run the backend API:

```powershell
npm.cmd run dev:backend
```

Run the React frontend:

```powershell
npm.cmd run dev:frontend
```

Build the React frontend:

```powershell
npm.cmd run build:frontend
```

Build the current portal package:

```powershell
npm.cmd run build:portal
```

## Dataverse mode

The backend now runs against Dataverse directly through Microsoft Entra app credentials.

Current API endpoints:

- `GET /api/tickets`
- `GET /api/access-requests`
- `GET /api/security-list`

To enable Dataverse mode, create `backend/.env` from `backend/.env.example` and set these values:

- `DATAVERSE_URL`
- `DATAVERSE_TENANT_ID`
- `DATAVERSE_CLIENT_ID`
- `DATAVERSE_CLIENT_SECRET`
- `DATAVERSE_TICKETS_ENTITY_SET`

The current ticket mapping is aligned to the `IT_Tickets` table fields you shared, including:

- `cr2b4_ticket_id`
- `cr2b4_ticket_title`
- `cr2b4_issue_type`
- `cr2b4_status`
- `cr2b4_current_status`
- `cr2b4_applicationproject`
- `cr2b4_module`
- `cr2b4_sub_module`
- `cr2b4_defaultassignee`

The access-request and security-list mappings are also aligned to the table fields you shared:

- `cr2b4_access_status`
- `cr2b4_approvedby`
- `cr2b4_comments`
- `cr2b4_email`
- `cr2b4_fullname`
- `cr2b4_role`
- `cr2b4_status`
- `cr2b4_applicationproject`
- `cr2b4_businessusers`
- `cr2b4_defaultassignee`
- `cr2b4_projectowners`
- `cr2b4_requesteduser`

Contacts are now part of the backend too:

- `GET /api/contacts`
- `POST /api/contacts`
- `PATCH /api/contacts/:recordId`
- `DELETE /api/contacts/:recordId`

Use Contacts together with Power Pages web roles to control site access:

- create or update the portal user as a Dataverse contact
- assign `Portal Requestor`, `IT Support Technician`, or `IT Support Admin` as needed
- delete the contact or remove its web roles to revoke site access
