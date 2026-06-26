# Target Architecture

## Current state

The repo currently contains a Power Pages export under `it-support---etgithubportal/it-support---etgithubportal/`.

That export should remain the source of truth for the existing portal until the new stack is ready.

## Proposed structure

```text
.
|-- backend/
|   |-- src/
|   `-- tests/
|-- docs/
|   `-- architecture.md
|-- frontend/
|   |-- public/
|   `-- src/
|-- it-support---etgithubportal/
|   `-- it-support---etgithubportal/
`-- scripts/
```

## Responsibilities

### Frontend

- React UI
- Route handling
- Form state
- API calls to the backend
- Shared UI components

### Backend

- Authentication and authorization
- Business rules
- Dataverse access
- Integration with Power Automate, email, or other services
- Audit and validation

### Power Pages export

- Keep the existing portal working while migration happens
- Use it as the compatibility layer until each feature is replaced

## Migration approach

1. Keep the portal running unchanged.
2. Build backend APIs for the ticket and access-request workflows.
3. Add the React frontend for new UI experiences.
4. Move one page or workflow at a time.
5. Retire portal pages only after the React replacement is stable.

## Important note

This structure is architecture only. No runtime wiring has been added yet.
