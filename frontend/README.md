# Frontend

This folder contains the new React application scaffold.

Recommended contents:

- `src/` for React components, routes, hooks, and UI state
- `public/` for static assets
- `src/api/` for typed API client wrappers
- `src/pages/` for route-level screens
- `src/components/` for reusable UI building blocks
- `src/styles/` for design tokens and global styles

Suggested responsibility:

- Render the user experience
- Call backend APIs
- Never talk to Dataverse directly unless there is a very specific reason

Current contract:

- `GET /api/tickets`
- Shared shape: [shared/tickets-list.contract.json](/C:/Users/chaitanya.prasad/ETG/ITSupport/IT-Tickets/shared/tickets-list.contract.json)
