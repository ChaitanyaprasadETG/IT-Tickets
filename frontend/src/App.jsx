import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createAccessRequest,
  createSecurityList,
  createTicket,
  deleteAccessRequest,
  deleteSecurityList,
  deleteTicket,
  getCompanyUsers,
  getAccessRequests,
  getSecurityList,
  getTickets,
  updateAccessRequest,
  updateSecurityList,
  updateTicket
} from "./api/resources";
import { DataTable } from "./components/DataTable";

const CURRENT_USER = {
  name: "Chaitanya Prasad",
  email: "chaitanya.prasad@etgworld.com"
};

const ticketStatusLabelMap = {
  "0": "Closed",
  "1": "In Progress",
  "2": "Open",
  "3": "Closed",
  open: "Open",
  closed: "Closed",
  resolved: "Closed",
  "in progress": "In Progress",
  progress: "In Progress",
  pending: "Open"
};

const accessStatusLabelMap = {
  "0": "Rejected",
  "1": "Requested",
  "2": "Approved",
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Requested"
};

const defaultRoleMatrix = {
  Admin: [
    { id: "1", moduleName: "Profile", subModuleName: "New User", add: true, view: true, edit: true, delete: true },
    { id: "2", moduleName: "Profile", subModuleName: "Existing User", add: true, view: true, edit: true, delete: true },
    { id: "3", moduleName: "Access", subModuleName: "Project Access", add: true, view: true, edit: true, delete: true },
    { id: "4", moduleName: "Access", subModuleName: "User Roles", add: true, view: true, edit: true, delete: true },
    { id: "5", moduleName: "Service Requests", subModuleName: "All Requests", add: true, view: true, edit: true, delete: true },
    { id: "6", moduleName: "Service Requests", subModuleName: "Open Requests", add: true, view: true, edit: true, delete: true },
    { id: "7", moduleName: "Service Requests", subModuleName: "Closed Requests", add: true, view: true, edit: true, delete: true },
    { id: "8", moduleName: "Home", subModuleName: "Open", add: false, view: true, edit: false, delete: false },
    { id: "9", moduleName: "Home", subModuleName: "In Progress", add: false, view: true, edit: false, delete: false },
    { id: "10", moduleName: "Home", subModuleName: "Closed", add: false, view: true, edit: false, delete: false }
  ],
  Technician: [
    { id: "1", moduleName: "Service Requests", subModuleName: "All Requests", add: true, view: true, edit: true, delete: false },
    { id: "2", moduleName: "Service Requests", subModuleName: "Open Requests", add: true, view: true, edit: true, delete: false },
    { id: "3", moduleName: "Service Requests", subModuleName: "Closed Requests", add: true, view: true, edit: true, delete: false },
    { id: "4", moduleName: "Home", subModuleName: "Open", add: false, view: true, edit: false, delete: false },
    { id: "5", moduleName: "Home", subModuleName: "In Progress", add: false, view: true, edit: false, delete: false },
    { id: "6", moduleName: "Home", subModuleName: "Closed", add: false, view: true, edit: false, delete: false }
  ],
  User: [
    { id: "1", moduleName: "Home", subModuleName: "Open", add: false, view: true, edit: false, delete: false },
    { id: "2", moduleName: "Home", subModuleName: "In Progress", add: false, view: true, edit: false, delete: false },
    { id: "3", moduleName: "Home", subModuleName: "Closed", add: false, view: true, edit: false, delete: false }
  ]
};

const initialTicketForm = {
  recordId: "",
  id: "",
  title: "",
  type: "",
  project: "",
  module: "",
  subModule: "",
  status: "Open",
  assignee: CURRENT_USER.name,
  requestor: CURRENT_USER.name,
  requestorEmail: CURRENT_USER.email,
  businessUsers: "",
  projectOwners: "",
  projectUsers: "",
  resolutionComments: "",
  followupComments: "",
  ticketDescription: "",
  attachments: ""
};

const initialAccessForm = {
  recordId: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  status: "Approved",
  accessStatus: "Approved",
  approvedBy: CURRENT_USER.email,
  comments: "Approved from admin portal"
};

const initialProjectAccessForm = {
  recordId: "",
  applicationProject: "",
  defaultAssignee: "",
  requestedUser: CURRENT_USER.email,
  businessUsers: "",
  projectOwners: ""
};

const initialServiceActionForm = {
  reassignedTo: "",
  status: "Open",
  resolutionComments: ""
};

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

function normalizeStatusLabel(value, map) {
  const normalized = String(value || "").trim();
  const lower = normalized.toLowerCase();
  return map[normalized] || map[lower] || normalized || "Open";
}

function splitPeople(rawValue) {
  return String(rawValue || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesUser(rawValue, email, name) {
  const entries = splitPeople(rawValue);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim().toLowerCase();
  return entries.includes(normalizedEmail) || entries.includes(normalizedName);
}

function getDisplayNameMap(accessRows, companyUsers) {
  const map = new Map([[CURRENT_USER.email.toLowerCase(), CURRENT_USER.name]]);

  accessRows.forEach((row) => {
    const email = String(row.email || "").trim().toLowerCase();
    const fullName = String(row.fullName || "").trim();
    if (email && fullName) {
      map.set(email, fullName);
    }
  });

  companyUsers.forEach((user) => {
    const email = String(user.email || user.userPrincipalName || "").trim().toLowerCase();
    const fullName = String(user.displayName || "").trim();
    if (email && fullName) {
      map.set(email, fullName);
    }
  });

  return map;
}

function formatPerson(value, nameMap) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  return nameMap.get(raw.toLowerCase()) || raw;
}

function formatPeople(value, nameMap) {
  return splitPeople(value)
    .map((item) => formatPerson(item, nameMap))
    .join(", ");
}

function getInitialRoleMatrix() {
  try {
    const stored = localStorage.getItem("portal-role-matrix");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    return defaultRoleMatrix;
  }

  return defaultRoleMatrix;
}

function hasPermission(roleMatrix, roleName, moduleName, subModuleName, permission) {
  const rows = roleMatrix[roleName] || [];
  const row = rows.find((item) => item.moduleName === moduleName && item.subModuleName === subModuleName);
  return Boolean(row?.[permission]);
}

function ActionMenu({ open, onToggle, onClose, items }) {
  const buttonRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = items.length * 38 + 12;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6;

    setMenuStyle({
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`
    });
  }, [open, items.length]);

  return (
    <div className="action-menu-shell">
      <button
        ref={buttonRef}
        className="row-action"
        type="button"
        aria-label="Row actions"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        ⋮
      </button>
      {open ? (
        <div className="action-menu" style={menuStyle || undefined} onClick={(event) => event.stopPropagation()}>
          {items.map((item) => (
            <button
              key={item.label}
              className={`action-menu-item ${item.danger ? "is-danger" : ""}`}
              type="button"
              onClick={() => {
                onClose();
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PeopleList({ value }) {
  const people = splitPeople(value);

  if (!people.length) {
    return <span>-</span>;
  }

  return (
    <div className="people-list">
      {people.map((person) => (
        <div key={person} className="people-list-item">{person}</div>
      ))}
    </div>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [securityList, setSecurityList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", error: false });
  const [activeAccordion, setActiveAccordion] = useState("home");
  const [activeView, setActiveView] = useState("home-open");
  const [projectFilter, setProjectFilter] = useState("");
  const [adminProfileExpanded, setAdminProfileExpanded] = useState(true);
  const [adminAccessExpanded, setAdminAccessExpanded] = useState(true);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showProjectAccessEditor, setShowProjectAccessEditor] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState(initialTicketForm);
  const [accessForm, setAccessForm] = useState(initialAccessForm);
  const [projectAccessForm, setProjectAccessForm] = useState(initialProjectAccessForm);
  const [followupText, setFollowupText] = useState("");
  const [ticketFiles, setTicketFiles] = useState([]);
  const [followupFiles, setFollowupFiles] = useState([]);
  const [serviceFiles, setServiceFiles] = useState([]);
  const [serviceActionForm, setServiceActionForm] = useState(initialServiceActionForm);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [actionMenu, setActionMenu] = useState(null);
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [roleMatrix, setRoleMatrix] = useState(getInitialRoleMatrix);
  const [tableFilter, setTableFilter] = useState({
    open: false,
    columnKey: "project",
    operator: "contains",
    value: "",
    applied: false
  });

  async function loadResources() {
    setLoading(true);

    const [ticketData, accessRequestData, securityListData] = await Promise.allSettled([
      getTickets(),
      getAccessRequests(),
      getSecurityList()
    ]);

    const resolvedTickets = ticketData.status === "fulfilled" ? ticketData.value.items : [];
    const resolvedAccessRequests = accessRequestData.status === "fulfilled" ? accessRequestData.value.items : [];
    const resolvedSecurityList = securityListData.status === "fulfilled" ? securityListData.value.items : [];

    setTickets(resolvedTickets);
    setAccessRequests(resolvedAccessRequests);
    setSecurityList(resolvedSecurityList);

    const failed = [ticketData, accessRequestData, securityListData].filter((entry) => entry.status === "rejected");
    if (failed.length) {
      const failedMessages = failed.map((entry) => entry.reason?.message).filter(Boolean);
      setMessage({ text: failedMessages[0] || "Some API views could not be loaded.", error: true });
    } else {
      setMessage({ text: "", error: false });
    }

    setLoading(false);

    return {
      tickets: resolvedTickets,
      accessRequests: resolvedAccessRequests,
      securityList: resolvedSecurityList
    };
  }

  useEffect(() => {
    loadResources().catch((error) => {
      setMessage({ text: error instanceof Error ? error.message : "Failed to load portal data.", error: true });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleWindowClick() {
      setActionMenu(null);
    }

    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCompanyUsers("")
      .then((response) => {
        if (!cancelled) {
          setCompanyUsers(Array.isArray(response.items) ? response.items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanyUsers([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentUserRole = useMemo(() => {
    const match = accessRequests.find((item) => String(item.email || "").toLowerCase() === CURRENT_USER.email.toLowerCase());
    return match?.role || "Admin";
  }, [accessRequests]);

  const displayNameMap = useMemo(() => getDisplayNameMap(accessRequests, companyUsers), [accessRequests, companyUsers]);

  const normalizedTickets = useMemo(() => {
    return tickets.map((ticket) => ({
      ...ticket,
      statusLabel: normalizeStatusLabel(ticket.status, ticketStatusLabelMap),
      displayAssignee: formatPerson(ticket.assignee, displayNameMap),
      displayBusinessUsers: formatPeople(ticket.businessUsers, displayNameMap),
      displayProjectOwners: formatPeople(ticket.projectOwners, displayNameMap)
    }));
  }, [tickets, displayNameMap]);

  const normalizedAccessRequests = useMemo(() => {
    return accessRequests.map((item) => ({
      ...item,
      accessStatusLabel: normalizeStatusLabel(item.accessStatus || item.status, accessStatusLabelMap)
    }));
  }, [accessRequests]);

  const accessibleProjects = useMemo(() => {
    if (currentUserRole === "Admin") {
      return securityList;
    }

    return securityList.filter((row) => (
      includesUser(row.requestedUser, CURRENT_USER.email, CURRENT_USER.name) ||
      includesUser(row.businessUsers, CURRENT_USER.email, CURRENT_USER.name) ||
      includesUser(row.projectOwners, CURRENT_USER.email, CURRENT_USER.name) ||
      includesUser(row.defaultAssignee, CURRENT_USER.email, CURRENT_USER.name)
    ));
  }, [securityList, currentUserRole]);

  const projectOptions = useMemo(() => {
    const projectNames = accessibleProjects.map((row) => row.applicationProject).filter(Boolean);
    if (currentUserRole === "Admin" && !projectNames.length) {
      return Array.from(new Set(normalizedTickets.map((ticket) => ticket.project).filter(Boolean)));
    }
    return Array.from(new Set(projectNames));
  }, [accessibleProjects, currentUserRole, normalizedTickets]);

  useEffect(() => {
    if (!projectFilter && projectOptions.length) {
      setProjectFilter(projectOptions[0]);
      setTicketForm((current) => ({ ...current, project: projectOptions[0] }));
    }
  }, [projectFilter, projectOptions]);

  useEffect(() => {
    if (!showCreateTicket || ticketForm.recordId) {
      return;
    }

    const projectName = ticketForm.project || projectFilter;
    const matchingProject = securityList.find((row) => row.applicationProject === projectName);

    if (!matchingProject) {
      return;
    }

    setTicketForm((current) => ({
      ...current,
      project: projectName,
      requestor: CURRENT_USER.name,
      assignee: formatPerson(matchingProject.defaultAssignee, displayNameMap) || CURRENT_USER.name,
      businessUsers: formatPeople(matchingProject.businessUsers, displayNameMap),
      projectOwners: formatPeople(matchingProject.projectOwners, displayNameMap)
    }));
  }, [showCreateTicket, ticketForm.project, ticketForm.recordId, projectFilter, securityList, displayNameMap]);

  const accessibleTickets = useMemo(() => {
    if (currentUserRole === "Admin") {
      return normalizedTickets;
    }

    return normalizedTickets.filter((ticket) => projectOptions.includes(ticket.project));
  }, [normalizedTickets, currentUserRole, projectOptions]);

  const serviceTickets = useMemo(() => {
    return accessibleTickets.filter((ticket) => (
      includesUser(ticket.assignee, CURRENT_USER.email, CURRENT_USER.name) ||
      includesUser(ticket.businessUsers, CURRENT_USER.email, CURRENT_USER.name) ||
      includesUser(ticket.projectOwners, CURRENT_USER.email, CURRENT_USER.name)
    ));
  }, [accessibleTickets]);

  const homeCounts = useMemo(() => ({
    open: accessibleTickets.filter((ticket) => ticket.statusLabel === "Open").length,
    inprogress: accessibleTickets.filter((ticket) => ticket.statusLabel === "In Progress").length,
    closed: accessibleTickets.filter((ticket) => ticket.statusLabel === "Closed").length
  }), [accessibleTickets]);

  const serviceCounts = useMemo(() => ({
    all: serviceTickets.length,
    open: serviceTickets.filter((ticket) => ticket.statusLabel !== "Closed").length,
    closed: serviceTickets.filter((ticket) => ticket.statusLabel === "Closed").length
  }), [serviceTickets]);

  const filteredTickets = useMemo(() => {
    const source = activeView.startsWith("service-") ? serviceTickets : accessibleTickets;

    return source.filter((ticket) => {
      const matchesProject = !projectFilter || ticket.project === projectFilter;
      if (!matchesProject) {
        return false;
      }

      if (activeView === "home-open") return ticket.statusLabel === "Open";
      if (activeView === "home-inprogress") return ticket.statusLabel === "In Progress";
      if (activeView === "home-closed") return ticket.statusLabel === "Closed";
      if (activeView === "service-open") return ticket.statusLabel !== "Closed";
      if (activeView === "service-closed") return ticket.statusLabel === "Closed";
      return true;
    }).filter((ticket) => {
      if (!tableFilter.applied || !tableFilter.columnKey || !tableFilter.value.trim()) {
        return true;
      }

      const rawValue = String(ticket[tableFilter.columnKey] ?? "").toLowerCase();
      const filterValue = tableFilter.value.trim().toLowerCase();

      if (tableFilter.operator === "equals") {
        return rawValue === filterValue;
      }

      if (tableFilter.operator === "startsWith") {
        return rawValue.startsWith(filterValue);
      }

      return rawValue.includes(filterValue);
    });
  }, [activeView, accessibleTickets, projectFilter, serviceTickets, tableFilter]);

  const existingUsersRows = useMemo(() => (
    normalizedAccessRequests.map((row) => {
      const names = splitName(row.fullName);
      return {
        ...row,
        firstName: names.firstName,
        lastName: names.lastName
      };
    })
  ), [normalizedAccessRequests]);

  const filteredProjectAccessRows = useMemo(() => {
    return currentUserRole === "Admin" ? securityList : accessibleProjects;
  }, [securityList, accessibleProjects, currentUserRole]);

  const roleRows = roleMatrix[selectedRole] || [];
  const isServiceDeskView = activeView.startsWith("service-");
  const canManageServiceRequests = currentUserRole === "Technician" || currentUserRole === "Admin";
  const reassignableUsers = useMemo(() => (
    [
      ...companyUsers.map((user) => ({
        id: user.id || user.email || user.displayName,
        name: user.displayName || user.email || "",
        email: user.email || user.userPrincipalName || "",
        title: user.jobTitle || ""
      })),
      ...normalizedAccessRequests.map((row) => ({
        id: row.recordId || row.email || row.fullName,
        name: row.fullName || row.email || "",
        email: row.email || "",
        title: row.role || ""
      }))
    ]
      .filter((user) => user.name || user.email)
      .filter((user, index, array) => index === array.findIndex((item) => (
        String(item.name || "").toLowerCase() === String(user.name || "").toLowerCase() &&
        String(item.email || "").toLowerCase() === String(user.email || "").toLowerCase()
      )))
  ), [companyUsers, normalizedAccessRequests]);

  useEffect(() => {
    if (!isServiceDeskView || !canManageServiceRequests || !selectedTicket?.recordId) {
      return;
    }

    const controller = new AbortController();
    const query = String(serviceActionForm.reassignedTo || "").trim();

    const timeout = setTimeout(async () => {
      try {
        const response = await getCompanyUsers(query);
        if (!controller.signal.aborted) {
          setCompanyUsers(Array.isArray(response.items) ? response.items : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCompanyUsers([]);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [serviceActionForm.reassignedTo, isServiceDeskView, canManageServiceRequests, selectedTicket?.recordId]);

  function canView(moduleName, subModuleName) {
    return hasPermission(roleMatrix, currentUserRole, moduleName, subModuleName, "view") || currentUserRole === "Admin";
  }

  function resetTicketForm() {
    setTicketForm({
      ...initialTicketForm,
      project: projectFilter || projectOptions[0] || ""
    });
    setTicketFiles([]);
  }

  function resetAccessForm() {
    setAccessForm(initialAccessForm);
  }

  function resetProjectAccessForm() {
    setProjectAccessForm(initialProjectAccessForm);
  }

  function openCreateTicket() {
    resetTicketForm();
    setSelectedTicket(null);
    setShowCreateTicket(true);
  }

  function editTicket(ticket) {
    setTicketForm({
      recordId: ticket.recordId,
      id: ticket.id,
      title: ticket.title,
      type: ticket.type,
      project: ticket.project,
      module: ticket.module,
      subModule: ticket.subModule,
      status: ticket.statusLabel,
      assignee: ticket.displayAssignee || ticket.assignee,
      requestor: ticket.requestor,
      requestorEmail: ticket.requestorEmail || CURRENT_USER.email,
      businessUsers: ticket.displayBusinessUsers || ticket.businessUsers,
      projectOwners: ticket.displayProjectOwners || ticket.projectOwners,
      resolutionComments: ticket.resolutionComments,
      followupComments: ticket.followupComments,
      ticketDescription: ticket.ticketDescription,
      attachments: ticket.attachments
    });
    setTicketFiles([]);
    setServiceFiles([]);
    setShowCreateTicket(true);
    setSelectedTicket(null);
  }

  function editAccessRequest(row) {
    setAccessForm({
      recordId: row.recordId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      role: row.role,
      status: row.status || "Approved",
      accessStatus: row.accessStatusLabel || "Approved",
      approvedBy: CURRENT_USER.email,
      comments: row.comments || "Approved from admin portal"
    });
    setActiveView("admin-new-user");
  }

  function editProjectAccess(row) {
    setProjectAccessForm({
      recordId: row.recordId,
      applicationProject: row.applicationProject,
      defaultAssignee: row.defaultAssignee,
      requestedUser: row.requestedUser,
      businessUsers: row.businessUsers,
      projectOwners: row.projectOwners
    });
    setShowProjectAccessEditor(true);
    setActiveView("admin-project-access");
  }

  async function handleCreateTicket(event) {
    event.preventDefault();

    try {
      const payload = {
        ...ticketForm,
        attachments: ticketFiles.length
          ? ticketFiles.map((file) => file.name).join(", ")
          : ticketForm.attachments
      };

      if (ticketForm.recordId) {
        await updateTicket(ticketForm.recordId, payload);
        setMessage({ text: "Ticket updated successfully.", error: false });
      } else {
        await createTicket(payload);
        setMessage({ text: "Ticket created successfully.", error: false });
      }

      setShowCreateTicket(false);
      resetTicketForm();
      await loadResources();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to save ticket.", error: true });
    }
  }

  async function handleSaveAccessRequest(event) {
    event.preventDefault();

    try {
      const payload = {
        recordId: accessForm.recordId,
        firstName: accessForm.firstName,
        lastName: accessForm.lastName,
        fullName: `${accessForm.firstName} ${accessForm.lastName}`.trim(),
        email: accessForm.email,
        role: accessForm.role,
        status: accessForm.status,
        accessStatus: accessForm.accessStatus,
        approvedBy: accessForm.approvedBy,
        comments: accessForm.comments
      };

      if (accessForm.recordId) {
        await updateAccessRequest(accessForm.recordId, payload);
        setMessage({ text: "User updated successfully.", error: false });
      } else {
        await createAccessRequest(payload);
        setMessage({ text: "User saved successfully.", error: false });
      }

      resetAccessForm();
      await loadResources();
      setActiveView("admin-existing-user");
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to save user.", error: true });
    }
  }

  async function handleSaveProjectAccess(event) {
    event.preventDefault();

    try {
      if (projectAccessForm.recordId) {
        await updateSecurityList(projectAccessForm.recordId, projectAccessForm);
        setMessage({ text: "Project access updated successfully.", error: false });
      } else {
        await createSecurityList(projectAccessForm);
        setMessage({ text: "Project access created successfully.", error: false });
      }

      setShowProjectAccessEditor(false);
      resetProjectAccessForm();
      await loadResources();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to save project access.", error: true });
    }
  }

  async function handleDeleteTicket(recordId) {
    try {
      await deleteTicket(recordId);
      if (selectedTicket?.recordId === recordId) {
        setSelectedTicket(null);
      }
      setMessage({ text: "Ticket deleted successfully.", error: false });
      await loadResources();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to delete ticket.", error: true });
    }
  }

  async function handleDeleteAccessRequest(recordId) {
    try {
      await deleteAccessRequest(recordId);
      setMessage({ text: "User deleted successfully.", error: false });
      await loadResources();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to delete user.", error: true });
    }
  }

  async function handleDeleteProjectAccess(recordId) {
    try {
      await deleteSecurityList(recordId);
      setMessage({ text: "Project access deleted successfully.", error: false });
      await loadResources();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to delete project access.", error: true });
    }
  }

  async function handleSubmitFollowup() {
    if (!selectedTicket?.recordId) {
      setMessage({ text: "Open a ticket before submitting a follow-up request.", error: true });
      return;
    }

    try {
      const attachmentNames = followupFiles.map((file) => file.name);
      const mergedAttachments = [selectedTicket.attachments, attachmentNames.join(", ")].filter(Boolean).join(", ");

      await updateTicket(selectedTicket.recordId, {
        followupComments: followupText,
        attachments: mergedAttachments
      });

      setMessage({ text: "Follow-up request updated successfully.", error: false });
      setSelectedTicket((current) => current ? {
        ...current,
        followupComments: followupText,
        attachments: mergedAttachments
      } : current);
      setFollowupText("");
      setFollowupFiles([]);
      const refreshed = await loadResources();
      const updatedTicket = refreshed.tickets.find((ticket) => ticket.recordId === selectedTicket.recordId);
      if (updatedTicket) {
        setSelectedTicket({
          ...updatedTicket,
          statusLabel: normalizeStatusLabel(updatedTicket.status, ticketStatusLabelMap),
          displayAssignee: formatPerson(updatedTicket.assignee, displayNameMap),
          displayBusinessUsers: formatPeople(updatedTicket.businessUsers, displayNameMap),
          displayProjectOwners: formatPeople(updatedTicket.projectOwners, displayNameMap)
        });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to submit follow-up request.", error: true });
    }
  }

  function handleOpenTicket(ticket) {
    setSelectedTicket(ticket);
    setShowCreateTicket(false);
    setFollowupText(ticket.followupComments || "");
    setFollowupFiles([]);
    setServiceFiles([]);
    setServiceActionForm({
      reassignedTo: ticket.displayAssignee || ticket.assignee || "",
      status: ticket.statusLabel || "Open",
      resolutionComments: ticket.resolutionComments || ""
    });
  }

  async function handleServiceTicketUpdate(nextStatus) {
    if (!selectedTicket?.recordId) {
      setMessage({ text: "Open a ticket before updating service request details.", error: true });
      return;
    }

    try {
      const payload = {
        assignee: serviceActionForm.reassignedTo,
        status: nextStatus || serviceActionForm.status,
        resolutionComments: serviceActionForm.resolutionComments,
        attachments: [selectedTicket.attachments, serviceFiles.map((file) => file.name).join(", ")].filter(Boolean).join(", ")
      };

      await updateTicket(selectedTicket.recordId, payload);
      setMessage({ text: nextStatus === "Closed" ? "Ticket closed successfully." : "Service request updated successfully.", error: false });
      const refreshed = await loadResources();
      const updatedTicket = refreshed.tickets.find((ticket) => ticket.recordId === selectedTicket.recordId);

      if (updatedTicket) {
        const nextTicket = {
          ...updatedTicket,
          statusLabel: normalizeStatusLabel(updatedTicket.status, ticketStatusLabelMap),
          displayAssignee: formatPerson(updatedTicket.assignee, displayNameMap),
          displayBusinessUsers: formatPeople(updatedTicket.businessUsers, displayNameMap),
          displayProjectOwners: formatPeople(updatedTicket.projectOwners, displayNameMap)
        };

        setSelectedTicket(nextTicket);
        setServiceActionForm({
          reassignedTo: nextTicket.displayAssignee || nextTicket.assignee || "",
          status: nextTicket.statusLabel || "Open",
          resolutionComments: nextTicket.resolutionComments || ""
        });
        setServiceFiles([]);
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to update the service request.", error: true });
    }
  }

  function toggleRolePermission(rowId, permission) {
    setRoleMatrix((current) => {
      const next = {
        ...current,
        [selectedRole]: (current[selectedRole] || []).map((row) => {
          if (row.id !== rowId || row.subModuleName === "User Roles") {
            return row;
          }

          return {
            ...row,
            [permission]: !row[permission]
          };
        })
      };

      return next;
    });
  }

  function saveRoleMatrix() {
    localStorage.setItem("portal-role-matrix", JSON.stringify(roleMatrix));
    setMessage({ text: `Role access saved for ${selectedRole}.`, error: false });
  }

  const ticketColumns = useMemo(() => ([
    { key: "id", label: "Ticket_ID" },
    { key: "title", label: "Ticket_Title" },
    { key: "type", label: "Type" },
    { key: "project", label: "Project" },
    { key: "module", label: "Module" },
    { key: "subModule", label: "Sub_Module" },
    { key: "statusLabel", label: "Status" },
    { key: "displayAssignee", label: "Assigned To" },
    { key: "resolutionComments", label: "Resolution" },
  {
    key: "action",
    label: "Action",
    filterable: false,
    render: (row) => (
      <ActionMenu
        open={actionMenu?.type === "ticket" && actionMenu?.id === row.recordId}
          onToggle={() => setActionMenu((current) => (
            current?.type === "ticket" && current?.id === row.recordId
              ? null
              : { type: "ticket", id: row.recordId }
          ))}
          onClose={() => setActionMenu(null)}
          items={[
            { label: activeView.startsWith("service-") ? "Edit" : "View", onClick: () => handleOpenTicket(row) }
          ]}
        />
      )
    }
  ]), [actionMenu, selectedTicket]);

  const existingUsersColumns = useMemo(() => ([
    { key: "email", label: "Email" },
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "role", label: "Role" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <ActionMenu
          open={actionMenu?.type === "user" && actionMenu?.id === row.recordId}
          onToggle={() => setActionMenu((current) => (
            current?.type === "user" && current?.id === row.recordId
              ? null
              : { type: "user", id: row.recordId }
          ))}
          onClose={() => setActionMenu(null)}
          items={[
            { label: "Edit", onClick: () => editAccessRequest(row) },
            { label: "Delete", danger: true, onClick: () => handleDeleteAccessRequest(row.recordId) }
          ]}
        />
      )
    }
  ]), [actionMenu]);

  const projectAccessColumns = useMemo(() => ([
    { key: "applicationProject", label: "Project" },
    { key: "defaultAssignee", label: "Default Assignee" },
    { key: "businessUsers", label: "Business Users", render: (row) => <PeopleList value={row.businessUsers} /> },
    { key: "projectOwners", label: "Project Owners", render: (row) => <PeopleList value={row.projectOwners} /> },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <ActionMenu
          open={actionMenu?.type === "project" && actionMenu?.id === row.recordId}
          onToggle={() => setActionMenu((current) => (
            current?.type === "project" && current?.id === row.recordId
              ? null
              : { type: "project", id: row.recordId }
          ))}
          onClose={() => setActionMenu(null)}
          items={[
            { label: "Edit Project", onClick: () => editProjectAccess(row) },
            { label: "Delete", danger: true, onClick: () => handleDeleteProjectAccess(row.recordId) }
          ]}
        />
      )
    }
  ]), [actionMenu]);

  function renderTicketTable() {
    return (
      <section className="table-panel">
        <DataTable
          columns={ticketColumns}
          rows={filteredTickets}
          loading={loading}
          emptyMessage="No records available"
          onRowClick={handleOpenTicket}
          selectedRowId={selectedTicket?.recordId}
          filterState={tableFilter}
          onFilterStateChange={setTableFilter}
        />
      </section>
    );
  }

  function renderCreateTicketPanel() {
    return (
      <section className="form-page">
        <div className="page-banner">
          <div className="page-banner-title">
            <span className="page-banner-icon ticket-banner-icon" aria-hidden="true" />
            <span>NEW TICKET</span>
          </div>
          <button className="ghost-button" type="button" onClick={() => { setShowCreateTicket(false); resetTicketForm(); }}>
            Back
          </button>
        </div>
        <form className="portal-form" onSubmit={handleCreateTicket}>
          <section className="portal-section">
            <h2><span className="section-icon section-icon-ticket" aria-hidden="true" />TICKET INFORMATION</h2>
            <div className="portal-grid portal-grid-4">
              <label><span>Ticket Title *</span><input value={ticketForm.title} onChange={(event) => setTicketForm({ ...ticketForm, title: event.target.value })} required /></label>
              <label><span>Project *</span><input value={ticketForm.project} onChange={(event) => setTicketForm({ ...ticketForm, project: event.target.value })} required /></label>
              <label><span>Ticket Status *</span><input value={ticketForm.status} onChange={(event) => setTicketForm({ ...ticketForm, status: event.target.value })} /></label>
              <label><span>Type *</span><select value={ticketForm.type} onChange={(event) => setTicketForm({ ...ticketForm, type: event.target.value })} required><option value="">Select type</option><option value="Bug">Bug</option><option value="Enhancement">Enhancement</option><option value="Support">Support</option><option value="Access">Access</option></select></label>
            </div>
            <div className="portal-grid portal-grid-2 ticket-info-secondary-row">
              <label><span>Module</span><input value={ticketForm.module} onChange={(event) => setTicketForm({ ...ticketForm, module: event.target.value })} /></label>
              <label><span>Sub Module</span><input value={ticketForm.subModule} onChange={(event) => setTicketForm({ ...ticketForm, subModule: event.target.value })} /></label>
            </div>
          </section>
          <section className="portal-section">
            <h2><span className="section-icon section-icon-user" aria-hidden="true" />ASSIGNMENT</h2>
            <div className="portal-grid portal-grid-2">
              <label><span>Requested by</span><input value={ticketForm.requestor} onChange={(event) => setTicketForm({ ...ticketForm, requestor: event.target.value })} /></label>
              <label><span>Assignee</span><input value={ticketForm.assignee} onChange={(event) => setTicketForm({ ...ticketForm, assignee: event.target.value })} /></label>
            </div>
          </section>
          <div className="portal-split">
            <section className="portal-section">
              <h2><span className="section-icon section-icon-doc" aria-hidden="true" />DESCRIPTION</h2>
              <textarea
                className="ticket-description-input"
                rows="10"
                placeholder="Enter ticket description"
                value={ticketForm.ticketDescription}
                onChange={(event) => setTicketForm({ ...ticketForm, ticketDescription: event.target.value })}
              />
            </section>
            <section className="portal-section">
              <h2><span className="section-icon section-icon-attach" aria-hidden="true" />ATTACHMENTS</h2>
              <label className="upload-box">
                <input className="hidden-file-input" type="file" multiple onChange={(event) => setTicketFiles(Array.from(event.target.files || []))} />
                <div className="upload-box-title">Drag & drop files here or <span>Choose File</span></div>
                <small>Selected files will be saved as attachment names to the ticket record in this pass.</small>
              </label>
              {ticketFiles.length ? <div className="file-list">{ticketFiles.map((file) => <span key={file.name}>{file.name}</span>)}</div> : null}
            </section>
          </div>
          <section className="portal-section">
            <h2><span className="section-icon section-icon-action" aria-hidden="true" />ACTIONS</h2>
            <div className="form-actions">
              <button className="flat-button" type="button" onClick={resetTicketForm}>Reset</button>
              <button className="primary-button" type="submit">{ticketForm.recordId ? "Update" : "Submit"}</button>
            </div>
          </section>
        </form>
      </section>
    );
  }

  function renderAdminPanel() {
    if (activeView === "admin-new-user") {
      return (
        <section className="admin-shell">
          <div className="admin-card">
            <div className="admin-card-body">
              <div className="section-title">USER DETAILS</div>
              <form className="form-grid form-grid-4" onSubmit={handleSaveAccessRequest}>
                <label><span>First Name</span><input value={accessForm.firstName} onChange={(event) => setAccessForm({ ...accessForm, firstName: event.target.value })} required /></label>
                <label><span>Last Name</span><input value={accessForm.lastName} onChange={(event) => setAccessForm({ ...accessForm, lastName: event.target.value })} required /></label>
                <label><span>Email</span><input type="email" value={accessForm.email} onChange={(event) => setAccessForm({ ...accessForm, email: event.target.value })} required /></label>
                <label><span>Role</span><select value={accessForm.role} onChange={(event) => setAccessForm({ ...accessForm, role: event.target.value })} required><option value="">Select role</option><option value="Admin">Admin</option><option value="Technician">Technician</option><option value="User">User</option></select></label>
                <div className="form-actions form-span-4">
                  <button className="flat-button" type="button" onClick={resetAccessForm}>Reset</button>
                  <button className="primary-button" type="submit">{accessForm.recordId ? "Update" : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      );
    }

    if (activeView === "admin-existing-user") {
      return (
        <section className="admin-shell">
          <div className="admin-card">
            <div className="admin-card-body">
              <div className="section-title">USERS LIST</div>
              <DataTable columns={existingUsersColumns} rows={existingUsersRows} loading={loading} emptyMessage="No users available" />
            </div>
          </div>
        </section>
      );
    }

    if (activeView === "admin-project-access") {
      return (
        <section className="admin-shell">
          <div className="admin-card">
            <div className="admin-card-body">
              {showProjectAccessEditor ? (
                <form className="form-grid form-grid-2 form-block" onSubmit={handleSaveProjectAccess}>
                  <div className="section-title form-span-2">PROJECT ACCESS DETAILS</div>
                  <label><span>Project</span><input value={projectAccessForm.applicationProject} onChange={(event) => setProjectAccessForm({ ...projectAccessForm, applicationProject: event.target.value })} required /></label>
                  <label><span>Default Assignee</span><input value={projectAccessForm.defaultAssignee} onChange={(event) => setProjectAccessForm({ ...projectAccessForm, defaultAssignee: event.target.value })} required /></label>
                  <label><span>Requested User</span><input value={projectAccessForm.requestedUser} onChange={(event) => setProjectAccessForm({ ...projectAccessForm, requestedUser: event.target.value })} /></label>
                  <label className="form-span-2"><span>Business Users</span><textarea rows="4" value={projectAccessForm.businessUsers} onChange={(event) => setProjectAccessForm({ ...projectAccessForm, businessUsers: event.target.value })} /></label>
                  <label className="form-span-2"><span>Project Owners</span><textarea rows="4" value={projectAccessForm.projectOwners} onChange={(event) => setProjectAccessForm({ ...projectAccessForm, projectOwners: event.target.value })} /></label>
                  <div className="form-actions form-span-2">
                    <button className="flat-button" type="button" onClick={() => { setShowProjectAccessEditor(false); resetProjectAccessForm(); }}>Reset</button>
                    <button className="primary-button" type="submit">{projectAccessForm.recordId ? "Update Project Access" : "Save Project Access"}</button>
                  </div>
                </form>
              ) : null}
              <div className="section-title">PROJECT ACCESS LIST</div>
              <div className="role-toolbar">
                <div />
                <button className="primary-button" type="button" onClick={() => { resetProjectAccessForm(); setShowProjectAccessEditor(true); }}>+ New Project</button>
              </div>
              <DataTable columns={projectAccessColumns} rows={filteredProjectAccessRows} loading={loading} emptyMessage="No project access available" />
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="admin-shell">
        <div className="admin-card">
          <div className="admin-card-body">
            <div className="section-title">USER ROLE ACCESS</div>
            <div className="role-toolbar">
              <label className="role-select">
                <span>Select Role</span>
                <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                  <option value="Admin">Admin</option>
                  <option value="Technician">Technician</option>
                  <option value="User">User</option>
                </select>
              </label>
              <button className="primary-button" type="button" onClick={saveRoleMatrix}>Submit</button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Module Name</th>
                    <th>Sub Module Name</th>
                    <th>Add</th>
                    <th>View</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {roleRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.moduleName}</td>
                      <td>{row.subModuleName}</td>
                      {["add", "view", "edit", "delete"].map((permission) => (
                        <td key={permission}>
                          <input
                            className="access-checkbox"
                            type="checkbox"
                            checked={Boolean(row[permission])}
                            disabled={row.subModuleName === "User Roles"}
                            onChange={() => toggleRolePermission(row.id, permission)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-note">Role changes are stored in this browser and immediately affect the left navigation for the selected role model.</div>
          </div>
        </div>
      </section>
    );
  }

  function renderMainPanel() {
    if (showCreateTicket) {
      return renderCreateTicketPanel();
    }

    if (activeView.startsWith("admin-")) {
      return renderAdminPanel();
    }

    if (activeView.startsWith("service-")) {
      return renderTicketTable();
    }

    return renderTicketTable();
  }

  return (
    <main className={`app-shell ${selectedTicket ? "has-drawer" : ""}`}>
      <div className="portal-topbar">
        <div className="toolbar-left">
          <div className="toolbar-projects">
            <span className="toolbar-label">Projects</span>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="">Find items</option>
              {projectOptions.map((project) => <option key={project} value={project}>{project}</option>)}
            </select>
            {!showCreateTicket ? <button className="primary-button" type="button" onClick={openCreateTicket}>Create Ticket</button> : null}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="user-badge">C</div>
          <div className="user-copy">
            <strong>{CURRENT_USER.name}</strong>
            <span>{currentUserRole}</span>
          </div>
          <button className="secondary-button" type="button">Logout</button>
        </div>
      </div>

      <div className={`portal-layout ${showCreateTicket ? "is-create-mode" : ""}`}>
        {!showCreateTicket ? (
        <aside className="portal-sidebar" aria-label="Portal navigation">
          <div className="sidebar-card">
            {canView("Home", "Open") || canView("Home", "In Progress") || canView("Home", "Closed") ? (
              <section className="sidebar-section">
                <button className="accordion-toggle" type="button" onClick={() => { setActiveAccordion("home"); setActiveView("home-open"); setShowCreateTicket(false); }}>
                  <span className="nav-title"><span className="nav-icon nav-icon-home" aria-hidden="true" /><span>Home</span></span>
                  <span className={`nav-chevron ${activeAccordion === "home" ? "is-open" : ""}`} aria-hidden="true" />
                </button>
                {activeAccordion === "home" ? (
                  <div className="accordion-panel">
                    {canView("Home", "Open") ? <button className={`submenu-btn ${activeView === "home-open" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("home-open"); setShowCreateTicket(false); }}><span>Open</span><span className="submenu-count">{homeCounts.open}</span></button> : null}
                    {canView("Home", "In Progress") ? <button className={`submenu-btn ${activeView === "home-inprogress" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("home-inprogress"); setShowCreateTicket(false); }}><span>In Progress</span><span className="submenu-count">{homeCounts.inprogress}</span></button> : null}
                    {canView("Home", "Closed") ? <button className={`submenu-btn ${activeView === "home-closed" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("home-closed"); setShowCreateTicket(false); }}><span>Closed</span><span className="submenu-count">{homeCounts.closed}</span></button> : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {canView("Service Requests", "All Requests") || canView("Service Requests", "Open Requests") || canView("Service Requests", "Closed Requests") ? (
              <section className="sidebar-section">
                <button className="accordion-toggle" type="button" onClick={() => { setActiveAccordion("service"); setActiveView("service-all"); setShowCreateTicket(false); }}>
                  <span className="nav-title"><span className="nav-icon nav-icon-service" aria-hidden="true" /><span>Service Requests</span></span>
                  <span className={`nav-chevron ${activeAccordion === "service" ? "is-open" : ""}`} aria-hidden="true" />
                </button>
                {activeAccordion === "service" ? (
                  <div className="accordion-panel">
                    {canView("Service Requests", "All Requests") ? <button className={`submenu-btn ${activeView === "service-all" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("service-all"); setShowCreateTicket(false); }}><span>All Requests</span><span className="submenu-count">{serviceCounts.all}</span></button> : null}
                    {canView("Service Requests", "Open Requests") ? <button className={`submenu-btn ${activeView === "service-open" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("service-open"); setShowCreateTicket(false); }}><span>Open Requests</span><span className="submenu-count">{serviceCounts.open}</span></button> : null}
                    {canView("Service Requests", "Closed Requests") ? <button className={`submenu-btn ${activeView === "service-closed" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("service-closed"); setShowCreateTicket(false); }}><span>Closed Requests</span><span className="submenu-count">{serviceCounts.closed}</span></button> : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {currentUserRole === "Admin" ? (
              <section className="sidebar-section">
                <button className="accordion-toggle" type="button" onClick={() => { setActiveAccordion("admin"); setActiveView("admin-new-user"); setShowCreateTicket(false); }}>
                  <span className="nav-title"><span className="nav-icon nav-icon-admin" aria-hidden="true" /><span>Admin</span></span>
                  <span className={`nav-chevron ${activeAccordion === "admin" ? "is-open" : ""}`} aria-hidden="true" />
                </button>
                {activeAccordion === "admin" ? (
                  <div className="accordion-panel">
                    <button className="submenu-btn section-toggle" type="button" onClick={() => setAdminProfileExpanded((value) => !value)}>
                      <span>Profile</span>
                      <span className={`nav-chevron nav-chevron-small ${adminProfileExpanded ? "is-open" : ""}`} aria-hidden="true" />
                    </button>
                    {adminProfileExpanded ? (
                      <div className="nested-links">
                        <button className={`submenu-btn compact ${activeView === "admin-new-user" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("admin-new-user"); setShowCreateTicket(false); }}>New User</button>
                        <button className={`submenu-btn compact ${activeView === "admin-existing-user" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("admin-existing-user"); setShowCreateTicket(false); }}>Existing User</button>
                      </div>
                    ) : null}
                    <button className="submenu-btn section-toggle" type="button" onClick={() => setAdminAccessExpanded((value) => !value)}>
                      <span>Access</span>
                      <span className={`nav-chevron nav-chevron-small ${adminAccessExpanded ? "is-open" : ""}`} aria-hidden="true" />
                    </button>
                    {adminAccessExpanded ? (
                      <div className="nested-links">
                        <button className={`submenu-btn compact ${activeView === "admin-project-access" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("admin-project-access"); setShowCreateTicket(false); }}>Project Access</button>
                        <button className={`submenu-btn compact ${activeView === "admin-user-roles" ? "is-active" : ""}`} type="button" onClick={() => { setActiveView("admin-user-roles"); setShowCreateTicket(false); }}>User Roles</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </aside>
        ) : null}

        <div className="portal-main">
          <div className={`portal-message ${message.text ? "is-open" : ""} ${message.error ? "is-error" : ""}`}>{message.text}</div>
          {renderMainPanel()}
        </div>
      </div>

      {selectedTicket ? (
        <aside className="ticket-drawer">
          <button className="drawer-close" type="button" onClick={() => setSelectedTicket(null)}>x</button>
          <div className="drawer-title">Ticket Details</div>
          <div className="drawer-section">
            <div className="drawer-heading">Ticket Information</div>
            <div className="detail-grid">
              <div><span>Ticket ID</span><strong>{selectedTicket.id || "-"}</strong></div>
              <div><span>Ticket Title</span><strong>{selectedTicket.title || "-"}</strong></div>
              <div><span>Type</span><strong>{selectedTicket.type || "-"}</strong></div>
              <div><span>Project</span><strong>{selectedTicket.project || "-"}</strong></div>
              <div><span>Module</span><strong>{selectedTicket.module || "-"}</strong></div>
              <div><span>Sub Module</span><strong>{selectedTicket.subModule || "-"}</strong></div>
              <div><span>Status</span><strong>{selectedTicket.statusLabel || "-"}</strong></div>
              <div><span>Assigned To</span><strong>{selectedTicket.displayAssignee || selectedTicket.assignee || "-"}</strong></div>
              <div><span>Resolution</span><strong>{selectedTicket.resolutionComments || "-"}</strong></div>
            </div>
          </div>
          <div className="drawer-section">
            <div className="drawer-heading">Requested by</div>
            <div className="detail-grid">
              <div><span>Business User</span><strong>{selectedTicket.displayBusinessUsers || selectedTicket.businessUsers || "-"}</strong></div>
              <div><span>Requested by</span><strong>{selectedTicket.requestor || "-"}</strong></div>
            </div>
          </div>
          <div className="drawer-section">
            <div className="drawer-heading">Attachments</div>
            <div className="drawer-box">{selectedTicket.attachments || "No attachments available for this ticket in the current view."}</div>
            {isServiceDeskView && canManageServiceRequests ? (
              <label className="followup-upload drawer-upload">
                <input type="file" multiple onChange={(event) => setServiceFiles(Array.from(event.target.files || []))} />
                <div>+ Add Attachment</div>
                <small>Technicians can attach new files while updating the ticket.</small>
              </label>
            ) : null}
            {serviceFiles.length ? <div className="file-list">{serviceFiles.map((file) => <span key={file.name}>{file.name}</span>)}</div> : null}
          </div>
          {isServiceDeskView && canManageServiceRequests ? (
            <div className="drawer-section">
              <div className="drawer-heading">Service Request Action</div>
              <label className="drawer-field">
                <span>Reassigned</span>
                <div className="user-search-shell">
                  <input
                    value={serviceActionForm.reassignedTo}
                    onFocus={() => setIsUserSearchOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsUserSearchOpen(false), 120);
                    }}
                    onChange={(event) => {
                      setServiceActionForm({ ...serviceActionForm, reassignedTo: event.target.value });
                      setIsUserSearchOpen(true);
                    }}
                    placeholder="Type ETG user name"
                    autoComplete="off"
                  />
                  {isUserSearchOpen && String(serviceActionForm.reassignedTo || "").trim().length >= 2 && reassignableUsers.length ? (
                    <div className="user-search-results">
                      {reassignableUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="user-search-result"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setServiceActionForm({ ...serviceActionForm, reassignedTo: user.name });
                            setIsUserSearchOpen(false);
                          }}
                        >
                          <strong>{user.name}</strong>
                          {user.email ? <span>{user.email}</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>
              <label className="drawer-field">
                <span>Status</span>
                <select
                  value={serviceActionForm.status}
                  onChange={(event) => setServiceActionForm({ ...serviceActionForm, status: event.target.value })}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>
              <label className="drawer-field">
                <span>Resolution Comments</span>
                <textarea
                  rows="6"
                  value={serviceActionForm.resolutionComments}
                  onChange={(event) => setServiceActionForm({ ...serviceActionForm, resolutionComments: event.target.value })}
                  placeholder="Add resolution comments"
                />
              </label>
              <div className="form-actions">
                <button className="flat-button" type="button" onClick={() => {
                  setServiceActionForm({
                    reassignedTo: selectedTicket.displayAssignee || selectedTicket.assignee || "",
                    status: selectedTicket.statusLabel || "Open",
                    resolutionComments: selectedTicket.resolutionComments || ""
                  });
                  setServiceFiles([]);
                }}>Reset</button>
                <button className="secondary-button" type="button" onClick={() => handleServiceTicketUpdate("Closed")}>Close Ticket</button>
                <button className="primary-button" type="button" onClick={() => handleServiceTicketUpdate()}>Update</button>
              </div>
            </div>
          ) : (
            <div className="drawer-section">
              <div className="drawer-heading">Follow-up Request</div>
              <textarea rows="6" maxLength={1000} value={followupText} onChange={(event) => setFollowupText(event.target.value)} />
              <label className="followup-upload">
                <input type="file" multiple onChange={(event) => setFollowupFiles(Array.from(event.target.files || []))} />
                <div>+ Add Attachment</div>
                <small>Optional. Attach files with your follow-up request.</small>
              </label>
              {followupFiles.length ? <div className="file-list">{followupFiles.map((file) => <span key={file.name}>{file.name}</span>)}</div> : null}
              <div className="drawer-counter">{followupText.length} / 1000</div>
              <div className="form-actions">
                <button className="flat-button" type="button" onClick={() => { setFollowupText(""); setFollowupFiles([]); }}>Reset</button>
                <button className="primary-button" type="button" onClick={handleSubmitFollowup}>Submit</button>
              </div>
            </div>
          )}
        </aside>
      ) : null}
    </main>
  );
}

