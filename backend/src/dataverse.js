function getConfig() {
  return {
    baseUrl: process.env.DATAVERSE_URL || "",
    tenantId: process.env.DATAVERSE_TENANT_ID || "",
    clientId: process.env.DATAVERSE_CLIENT_ID || "",
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET || "",
    ticketsEntitySet: process.env.DATAVERSE_TICKETS_ENTITY_SET || "cr2b4_it_ticketses",
    accessRequestsEntitySet: process.env.DATAVERSE_ACCESS_REQUESTS_ENTITY_SET || "cr2b4_it_access_requestses",
    securityListEntitySet: process.env.DATAVERSE_SECURITY_LIST_ENTITY_SET || "cr2b4_it_security_lists",
    contactsEntitySet: process.env.DATAVERSE_CONTACTS_ENTITY_SET || "contacts"
  };
}

const ticketStatusMap = {
  Open: 2,
  "In Progress": 1,
  Closed: 3,
  Resolved: 3
};

const accessStatusMap = {
  Requested: 1,
  Approved: 2,
  Rejected: 0,
  Pending: 1
};

function hasDataverseConfig() {
  const config = getConfig();

  return Boolean(
    config.baseUrl &&
    config.tenantId &&
    config.clientId &&
    config.clientSecret
  );
}

function ensureDataverseConfig() {
  if (!hasDataverseConfig()) {
    throw new Error("Dataverse environment is not configured.");
  }
}

function mapChoiceValue(value, map) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value).trim();
  return map[normalized] ?? map[normalized.toLowerCase()] ?? normalized;
}

async function getAccessToken() {
  const config = getConfig();
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: `${config.baseUrl}/.default`
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Dataverse token request failed with ${response.status}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

async function dataverseRequest(path, options = {}) {
  ensureDataverseConfig();

  const config = getConfig();
  const token = await getAccessToken();

  return fetch(`${config.baseUrl}/api/data/v9.2/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      ...(options.headers || {})
    }
  });
}

function extractGuid(source) {
  const match = String(source || "").match(/\(([0-9a-f-]{36})\)/i);
  return match ? match[1] : "";
}

function extractCreatedRecordId(response) {
  return (
    extractGuid(response.headers.get("OData-EntityId")) ||
    extractGuid(response.headers.get("odata-entityid")) ||
    ""
  );
}

function normalizeTicket(record) {
  return {
    recordId: String(record.cr2b4_it_ticketsid || record.cr2b4_it_ticketid || record.id || "").trim(),
    entitySet: getConfig().ticketsEntitySet,
    id: String(record.cr2b4_ticket_id || record.id || "").trim(),
    title: String(record.cr2b4_ticket_title || "Untitled Ticket").trim(),
    type: String(record.cr2b4_issue_type || "").trim(),
    status: String(
      record["cr2b4_status@OData.Community.Display.V1.FormattedValue"] ||
      record.cr2b4_status ||
      record["cr2b4_current_status@OData.Community.Display.V1.FormattedValue"] ||
      record.cr2b4_current_status ||
      "Unknown"
    ).trim(),
    project: String(record.cr2b4_applicationproject || "").trim(),
    module: String(record.cr2b4_module || "").trim(),
    subModule: String(record.cr2b4_sub_module || "").trim(),
    assignee: String(record.cr2b4_defaultassignee || "Unassigned").trim(),
    requestor: String(record.cr2b4_requestor || "").trim(),
    businessUsers: String(record.cr2b4_businessusers || "").trim(),
    projectOwners: String(record.cr2b4_projectowners || "").trim(),
    resolutionComments: String(record.cr2b4_resolution_comments || "").trim(),
    followupComments: String(record.cr2b4_followup_comments || "").trim(),
    ticketDescription: String(record.cr2b4_ticket_description || "").trim(),
    attachments: String(record.cr2b4_attachments || "").trim()
  };
}

function normalizeAccessRequest(record) {
  return {
    recordId: String(record.cr2b4_it_access_requestsid || record.cr2b4_it_access_requestid || record.id || "").trim(),
    entitySet: getConfig().accessRequestsEntitySet,
    id: String(record.cr2b4_email || record.cr2b4_fullname || "").trim(),
    fullName: String(record.cr2b4_fullname || "").trim(),
    email: String(record.cr2b4_email || "").trim(),
    role: String(record.cr2b4_role || "").trim(),
    status: String(record.cr2b4_status || "").trim(),
    accessStatus: String(
      record["cr2b4_access_status@OData.Community.Display.V1.FormattedValue"] ||
      record.cr2b4_access_status ||
      ""
    ).trim(),
    approvedBy: String(record.cr2b4_approvedby || "").trim(),
    comments: String(record.cr2b4_comments || "").trim()
  };
}

function normalizeSecurityList(record) {
  return {
    recordId: String(record.cr2b4_it_security_listid || record.id || "").trim(),
    entitySet: getConfig().securityListEntitySet,
    id: String(record.cr2b4_applicationproject || record.cr2b4_requesteduser || "").trim(),
    applicationProject: String(record.cr2b4_applicationproject || "").trim(),
    defaultAssignee: String(record.cr2b4_defaultassignee || "").trim(),
    requestedUser: String(record.cr2b4_requesteduser || "").trim(),
    businessUsers: String(record.cr2b4_businessusers || "").trim(),
    projectOwners: String(record.cr2b4_projectowners || "").trim()
  };
}

function normalizeContact(record) {
  return {
    recordId: String(record.contactid || record.id || "").trim(),
    entitySet: getConfig().contactsEntitySet,
    id: String(record.emailaddress1 || record.fullname || "").trim(),
    fullName: String(record.fullname || "").trim(),
    firstName: String(record.firstname || "").trim(),
    lastName: String(record.lastname || "").trim(),
    email: String(record.emailaddress1 || "").trim(),
    jobTitle: String(record.jobtitle || "").trim(),
    companyName: String(record["parentcustomerid@OData.Community.Display.V1.FormattedValue"] || record.parentcustomeridname || "").trim()
  };
}

async function parseResponseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

async function ensureOk(response, messagePrefix) {
  if (response.ok) {
    return;
  }

  const details = await parseResponseBody(response);
  throw new Error(`${messagePrefix} with ${response.status}: ${typeof details === "string" ? details : JSON.stringify(details)}`);
}

async function listDataverseRecords(entitySetName, selectColumns, mapper, errorPrefix) {
  const response = await dataverseRequest(`${entitySetName}?$select=${selectColumns.join(",")}`, {
    method: "GET"
  });

  await ensureOk(response, errorPrefix);

  const payload = await response.json();

  return {
    items: Array.isArray(payload.value) ? payload.value.map(mapper) : []
  };
}

async function createDataverseRecord(entitySetName, payload, errorPrefix) {
  const response = await dataverseRequest(entitySetName, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=representation"
    }
  });

  await ensureOk(response, errorPrefix);

  return {
    recordId: extractCreatedRecordId(response),
    item: await parseResponseBody(response)
  };
}

async function updateDataverseRecord(entitySetName, recordId, payload, errorPrefix) {
  const response = await dataverseRequest(`${entitySetName}(${recordId})`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  await ensureOk(response, errorPrefix);

  return {
    ok: true
  };
}

async function deleteDataverseRecord(entitySetName, recordId, errorPrefix) {
  const response = await dataverseRequest(`${entitySetName}(${recordId})`, {
    method: "DELETE"
  });

  await ensureOk(response, errorPrefix);

  return {
    ok: true
  };
}

export async function listDataverseTickets() {
  const config = getConfig();

  return listDataverseRecords(
    config.ticketsEntitySet,
    [
      "cr2b4_it_ticketsid",
      "cr2b4_ticket_id",
      "cr2b4_ticket_title",
      "cr2b4_issue_type",
      "cr2b4_status",
      "cr2b4_current_status",
      "cr2b4_applicationproject",
      "cr2b4_module",
      "cr2b4_sub_module",
      "cr2b4_defaultassignee",
      "cr2b4_requestor",
      "cr2b4_businessusers",
      "cr2b4_projectowners",
      "cr2b4_resolution_comments",
      "cr2b4_followup_comments",
      "cr2b4_ticket_description",
      "cr2b4_attachments"
    ],
    normalizeTicket,
    "Dataverse ticket request failed"
  );
}

export async function createDataverseTicket(input) {
  const config = getConfig();
  const payload = {
    cr2b4_ticket_id: input.id,
    cr2b4_ticket_title: input.title,
    cr2b4_ticket_description: input.ticketDescription || "",
    cr2b4_applicationproject: input.project,
    cr2b4_issue_type: input.type,
    cr2b4_status: mapChoiceValue(input.status || "Open", ticketStatusMap),
    cr2b4_current_status: mapChoiceValue(input.status || "Open", ticketStatusMap),
    cr2b4_defaultassignee: input.assignee || "",
    cr2b4_businessusers: input.businessUsers || "",
    cr2b4_projectowners: input.projectOwners || "",
    cr2b4_module: input.module || "",
    cr2b4_sub_module: input.subModule || "",
    cr2b4_requestor: input.requestor || "",
    cr2b4_resolution_comments: input.resolutionComments || "",
    cr2b4_followup_comments: input.followupComments || "",
    cr2b4_attachments: input.attachments || ""
  };

  return createDataverseRecord(config.ticketsEntitySet, payload, "Dataverse ticket create failed");
}

export async function updateDataverseTicket(recordId, input) {
  const config = getConfig();
  const payload = {};

  if (input.title !== undefined) payload.cr2b4_ticket_title = input.title;
  if (input.ticketDescription !== undefined) payload.cr2b4_ticket_description = input.ticketDescription;
  if (input.project !== undefined) payload.cr2b4_applicationproject = input.project;
  if (input.type !== undefined) payload.cr2b4_issue_type = input.type;
  if (input.status !== undefined) {
    payload.cr2b4_status = mapChoiceValue(input.status, ticketStatusMap);
    payload.cr2b4_current_status = mapChoiceValue(input.status, ticketStatusMap);
  }
  if (input.assignee !== undefined) payload.cr2b4_defaultassignee = input.assignee;
  if (input.businessUsers !== undefined) payload.cr2b4_businessusers = input.businessUsers;
  if (input.projectOwners !== undefined) payload.cr2b4_projectowners = input.projectOwners;
  if (input.module !== undefined) payload.cr2b4_module = input.module;
  if (input.subModule !== undefined) payload.cr2b4_sub_module = input.subModule;
  if (input.requestor !== undefined) payload.cr2b4_requestor = input.requestor;
  if (input.resolutionComments !== undefined) payload.cr2b4_resolution_comments = input.resolutionComments;
  if (input.followupComments !== undefined) payload.cr2b4_followup_comments = input.followupComments;
  if (input.attachments !== undefined) payload.cr2b4_attachments = input.attachments;

  return updateDataverseRecord(config.ticketsEntitySet, recordId, payload, "Dataverse ticket update failed");
}

export async function deleteDataverseTicket(recordId) {
  const config = getConfig();
  return deleteDataverseRecord(config.ticketsEntitySet, recordId, "Dataverse ticket delete failed");
}

export async function listDataverseAccessRequests() {
  const config = getConfig();

  return listDataverseRecords(
    config.accessRequestsEntitySet,
    [
      "cr2b4_it_access_requestsid",
      "cr2b4_access_status",
      "cr2b4_approvedby",
      "cr2b4_comments",
      "cr2b4_email",
      "cr2b4_fullname",
      "cr2b4_role",
      "cr2b4_status"
    ],
    normalizeAccessRequest,
    "Dataverse access request failed"
  );
}

export async function createDataverseAccessRequest(input) {
  const config = getConfig();
  const payload = {
    cr2b4_fullname: input.fullName,
    cr2b4_email: input.email,
    cr2b4_role: input.role,
    cr2b4_status: String(input.status || "Approved"),
    cr2b4_access_status: String(input.accessStatus || "Approved"),
    cr2b4_approvedby: input.approvedBy || "",
    cr2b4_comments: input.comments || "Approved from admin portal"
  };

  return createDataverseRecord(config.accessRequestsEntitySet, payload, "Dataverse access request create failed");
}

export async function updateDataverseAccessRequest(recordId, input) {
  const config = getConfig();
  const payload = {};

  if (input.fullName !== undefined) payload.cr2b4_fullname = input.fullName;
  if (input.email !== undefined) payload.cr2b4_email = input.email;
  if (input.role !== undefined) payload.cr2b4_role = input.role;
  if (input.status !== undefined) payload.cr2b4_status = String(input.status);
  if (input.accessStatus !== undefined) payload.cr2b4_access_status = String(input.accessStatus);
  if (input.approvedBy !== undefined) payload.cr2b4_approvedby = input.approvedBy;
  if (input.comments !== undefined) payload.cr2b4_comments = input.comments;

  return updateDataverseRecord(config.accessRequestsEntitySet, recordId, payload, "Dataverse access request update failed");
}

export async function deleteDataverseAccessRequest(recordId) {
  const config = getConfig();
  return deleteDataverseRecord(config.accessRequestsEntitySet, recordId, "Dataverse access request delete failed");
}

export async function listDataverseSecurityList() {
  const config = getConfig();

  return listDataverseRecords(
    config.securityListEntitySet,
    [
      "cr2b4_it_security_listid",
      "cr2b4_applicationproject",
      "cr2b4_businessusers",
      "cr2b4_defaultassignee",
      "cr2b4_projectowners",
      "cr2b4_requesteduser"
    ],
    normalizeSecurityList,
    "Dataverse security list request failed"
  );
}

export async function createDataverseSecurityList(input) {
  const config = getConfig();
  const payload = {
    cr2b4_applicationproject: input.applicationProject,
    cr2b4_defaultassignee: input.defaultAssignee,
    cr2b4_requesteduser: input.requestedUser || "",
    cr2b4_businessusers: input.businessUsers || "",
    cr2b4_projectowners: input.projectOwners || ""
  };

  return createDataverseRecord(config.securityListEntitySet, payload, "Dataverse security list create failed");
}

export async function updateDataverseSecurityList(recordId, input) {
  const config = getConfig();
  const payload = {};

  if (input.applicationProject !== undefined) payload.cr2b4_applicationproject = input.applicationProject;
  if (input.defaultAssignee !== undefined) payload.cr2b4_defaultassignee = input.defaultAssignee;
  if (input.requestedUser !== undefined) payload.cr2b4_requesteduser = input.requestedUser;
  if (input.businessUsers !== undefined) payload.cr2b4_businessusers = input.businessUsers;
  if (input.projectOwners !== undefined) payload.cr2b4_projectowners = input.projectOwners;

  return updateDataverseRecord(config.securityListEntitySet, recordId, payload, "Dataverse security list update failed");
}

export async function deleteDataverseSecurityList(recordId) {
  const config = getConfig();
  return deleteDataverseRecord(config.securityListEntitySet, recordId, "Dataverse security list delete failed");
}

export async function listDataverseContacts() {
  const config = getConfig();

  return listDataverseRecords(
    config.contactsEntitySet,
    [
      "contactid",
      "firstname",
      "lastname",
      "fullname",
      "emailaddress1",
      "jobtitle",
      "parentcustomerid"
    ],
    normalizeContact,
    "Dataverse contact request failed"
  );
}

export async function createDataverseContact(input) {
  const config = getConfig();
  const payload = {
    firstname: input.firstName || "",
    lastname: input.lastName || "",
    emailaddress1: input.email || "",
    jobtitle: input.jobTitle || ""
  };

  return createDataverseRecord(config.contactsEntitySet, payload, "Dataverse contact create failed");
}

export async function updateDataverseContact(recordId, input) {
  const config = getConfig();
  const payload = {};

  if (input.firstName !== undefined) payload.firstname = input.firstName;
  if (input.lastName !== undefined) payload.lastname = input.lastName;
  if (input.email !== undefined) payload.emailaddress1 = input.email;
  if (input.jobTitle !== undefined) payload.jobtitle = input.jobTitle;

  return updateDataverseRecord(config.contactsEntitySet, recordId, payload, "Dataverse contact update failed");
}

export async function deleteDataverseContact(recordId) {
  const config = getConfig();
  return deleteDataverseRecord(config.contactsEntitySet, recordId, "Dataverse contact delete failed");
}

export function getDataverseMode() {
  return hasDataverseConfig() ? "dataverse-configured" : "not-configured";
}
