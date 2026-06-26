async function getResource(path) {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = await response.json();
      details = payload.error || JSON.stringify(payload);
    } catch (error) {
      details = await response.text();
    }

    throw new Error(details || `API request failed with ${response.status}`);
  }

  return response.json();
}

async function sendResource(path, method, payload) {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = await response.json();
      details = payload.error || JSON.stringify(payload);
    } catch (error) {
      details = await response.text();
    }

    throw new Error(details || `API request failed with ${response.status}`);
  }

  return response.json();
}

async function deleteResource(path) {
  const response = await fetch(path, {
    method: "DELETE",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    let details = "";

    try {
      const payload = await response.json();
      details = payload.error || JSON.stringify(payload);
    } catch (error) {
      details = await response.text();
    }

    throw new Error(details || `API request failed with ${response.status}`);
  }

  return response.json();
}

export function getTickets() {
  return getResource("/api/tickets");
}

export function getAccessRequests() {
  return getResource("/api/access-requests");
}

export function getSecurityList() {
  return getResource("/api/security-list");
}

export function getContacts() {
  return getResource("/api/contacts");
}

export function getCompanyUsers(query = "") {
  const search = query ? `?q=${encodeURIComponent(query)}` : "";
  return getResource(`/api/users${search}`);
}

export function createTicket(payload) {
  return sendResource("/api/tickets", "POST", payload);
}

export function updateTicket(recordId, payload) {
  return sendResource(`/api/tickets/${recordId}`, "PATCH", payload);
}

export function deleteTicket(recordId) {
  return deleteResource(`/api/tickets/${recordId}`);
}

export function createAccessRequest(payload) {
  return sendResource("/api/access-requests", "POST", payload);
}

export function updateAccessRequest(recordId, payload) {
  return sendResource(`/api/access-requests/${recordId}`, "PATCH", payload);
}

export function deleteAccessRequest(recordId) {
  return deleteResource(`/api/access-requests/${recordId}`);
}

export function createContact(payload) {
  return sendResource("/api/contacts", "POST", payload);
}

export function updateContact(recordId, payload) {
  return sendResource(`/api/contacts/${recordId}`, "PATCH", payload);
}

export function deleteContact(recordId) {
  return deleteResource(`/api/contacts/${recordId}`);
}

export function createSecurityList(payload) {
  return sendResource("/api/security-list", "POST", payload);
}

export function updateSecurityList(recordId, payload) {
  return sendResource(`/api/security-list/${recordId}`, "PATCH", payload);
}

export function deleteSecurityList(recordId) {
  return deleteResource(`/api/security-list/${recordId}`);
}
