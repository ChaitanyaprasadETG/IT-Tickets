import {
  createDataverseContact,
  deleteDataverseContact,
  getDataverseMode,
  listDataverseContacts,
  updateDataverseContact
} from "./dataverse.js";

export async function listContacts() {
  const dataverse = await listDataverseContacts();
  return {
    items: dataverse.items,
    count: dataverse.items.length,
    source: getDataverseMode()
  };
}

export async function createContact(input) {
  const dataverse = await createDataverseContact(input);

  return {
    item: dataverse.item || input,
    recordId: dataverse.recordId,
    source: getDataverseMode()
  };
}

export async function updateContact(recordId, input) {
  await updateDataverseContact(recordId, input);

  return {
    recordId,
    source: getDataverseMode()
  };
}

export async function deleteContact(recordId) {
  await deleteDataverseContact(recordId);

  return {
    recordId,
    source: getDataverseMode()
  };
}
