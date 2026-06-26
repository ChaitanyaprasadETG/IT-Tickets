import {
  createDataverseAccessRequest,
  deleteDataverseAccessRequest,
  getDataverseMode,
  listDataverseAccessRequests,
  updateDataverseAccessRequest
} from "./dataverse.js";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact
} from "./contacts-service.js";

function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

async function syncContactForAccessRequest(input) {
  const email = String(input.email || "").trim();
  if (!email) {
    return;
  }

  const nameParts = splitFullName(input.fullName);
  const existing = await listContacts();
  const match = existing.items.find((contact) => String(contact.email || "").trim().toLowerCase() === email.toLowerCase());
  const payload = {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email,
    jobTitle: String(input.role || "").trim()
  };

  if (match?.recordId) {
    await updateContact(match.recordId, payload);
    return;
  }

  await createContact(payload);
}

async function removeContactForAccessRequest(recordId) {
  const requests = await listDataverseAccessRequests();
  const target = requests.items.find((item) => item.recordId === recordId);

  if (!target?.email) {
    return;
  }

  const contacts = await listContacts();
  const match = contacts.items.find((contact) => String(contact.email || "").trim().toLowerCase() === String(target.email || "").trim().toLowerCase());

  if (match?.recordId) {
    await deleteContact(match.recordId);
  }
}

export async function listAccessRequests() {
  const dataverse = await listDataverseAccessRequests();
  return {
    items: dataverse.items,
    count: dataverse.items.length,
    source: getDataverseMode()
  };
}

export async function createAccessRequest(input) {
  const dataverse = await createDataverseAccessRequest(input);
  await syncContactForAccessRequest(input);

  return {
    item: dataverse.item || input,
    recordId: dataverse.recordId,
    source: getDataverseMode()
  };
}

export async function updateAccessRequest(recordId, input) {
  await updateDataverseAccessRequest(recordId, input);
  await syncContactForAccessRequest(input);

  return {
    recordId,
    source: getDataverseMode()
  };
}

export async function deleteAccessRequest(recordId) {
  await removeContactForAccessRequest(recordId);
  await deleteDataverseAccessRequest(recordId);

  return {
    recordId,
    source: getDataverseMode()
  };
}
