export function DataTable({
  columns,
  rows,
  loading,
  emptyMessage,
  className = "",
  onRowClick,
  selectedRowId,
  filterState,
  onFilterStateChange
}) {
  const filterableColumns = columns.filter((column) => column.filterable !== false);

  if (loading) {
    return <p className="placeholder">Loading data...</p>;
  }

  if (!rows.length) {
    return <p className="placeholder">{emptyMessage}</p>;
  }

  return (
    <div className={`table-wrap ${className}`.trim()}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <div className="header-cell">
                  <span>{column.label}</span>
                  {onFilterStateChange && column.filterable !== false ? (
                    <button
                      className="header-filter-trigger"
                      type="button"
                      aria-label={`Filter ${column.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const wrap = event.currentTarget.closest(".table-wrap");
                        const wrapRect = wrap?.getBoundingClientRect();
                        const triggerRect = event.currentTarget.getBoundingClientRect();

                        onFilterStateChange({
                          ...filterState,
                          open: true,
                          columnKey: column.key,
                          anchorLeft: wrapRect ? triggerRect.left - wrapRect.left : 160
                        });
                      }}
                    />
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.recordId || row.id || row.email || row.applicationProject || rowIndex}
              className={selectedRowId && selectedRowId === (row.recordId || row.id) ? "is-selected" : ""}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {typeof column.render === "function" ? column.render(row, rowIndex) : (row[column.key] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {onFilterStateChange && filterState?.open ? (
        <div
          className="table-filter-popover is-overlay"
          style={{ left: `${Math.max(160, Math.min((filterState?.anchorLeft || 160) - 90, 520))}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="table-filter-close"
            type="button"
            aria-label="Close filter"
            onClick={() => onFilterStateChange({ ...filterState, open: false })}
          >
            ×
          </button>

          <label className="table-filter-field">
            <span>Columns</span>
            <select
              value={filterState.columnKey}
              onChange={(event) => onFilterStateChange({ ...filterState, columnKey: event.target.value })}
            >
              {filterableColumns.map((column) => (
                <option key={column.key} value={column.key}>{column.label}</option>
              ))}
            </select>
          </label>

          <label className="table-filter-field">
            <span>Operator</span>
            <select
              value={filterState.operator}
              onChange={(event) => onFilterStateChange({ ...filterState, operator: event.target.value })}
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="startsWith">starts with</option>
            </select>
          </label>

          <label className="table-filter-field table-filter-value">
            <span>Value</span>
            <input
              placeholder="Filter value"
              value={filterState.value}
              onChange={(event) => onFilterStateChange({ ...filterState, value: event.target.value })}
            />
          </label>

          <button
            className="primary-button table-filter-apply"
            type="button"
            onClick={() => onFilterStateChange({ ...filterState, open: false, applied: true })}
          >
            Apply
          </button>

          <button
            className="flat-button table-filter-clear"
            type="button"
            onClick={() => onFilterStateChange({
              open: false,
              columnKey: filterableColumns[0]?.key || "",
              operator: "contains",
              value: "",
              applied: false,
              anchorLeft: 160
            })}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
