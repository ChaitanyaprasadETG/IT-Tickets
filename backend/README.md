# Backend

This folder now contains a small API starter with live Dataverse contracts:

- `GET /api/tickets`
- `GET /api/access-requests`
- `GET /api/security-list`
- `GET /api/users?q=search`
- `POST /api/tickets`
- `POST /api/access-requests`
- `POST /api/security-list`

The backend uses Dataverse directly through Microsoft Entra app credentials.
The user lookup endpoint uses Microsoft Graph with the same Entra app credentials.
If it returns 403/empty results, grant `User.Read.All` or `Directory.Read.All` as an application permission and consent it in Entra ID.

Suggested next steps:

1. Load `backend/.env` values.
2. Confirm all create payload rules for choice and file columns.
3. Add update endpoints for ticket workflows.

Contract reference:

- [shared/tickets-list.contract.json](/C:/Users/chaitanya.prasad/ETG/ITSupport/IT-Tickets/shared/tickets-list.contract.json)
