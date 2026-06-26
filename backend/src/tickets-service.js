import {
  createDataverseTicket,
  deleteDataverseTicket,
  getDataverseMode,
  listDataverseTickets,
  updateDataverseTicket
} from "./dataverse.js";

export async function listTickets() {
  const dataverse = await listDataverseTickets();
  return {
    items: dataverse.items,
    count: dataverse.items.length,
    source: getDataverseMode()
  };
}

export async function createTicket(input) {
  const dataverse = await createDataverseTicket(input);

  return {
    item: dataverse.item || input,
    recordId: dataverse.recordId,
    source: getDataverseMode()
  };
}

export async function updateTicket(recordId, input) {
  await updateDataverseTicket(recordId, input);

  return {
    recordId,
    source: getDataverseMode()
  };
}

export async function deleteTicket(recordId) {
  await deleteDataverseTicket(recordId);

  return {
    recordId,
    source: getDataverseMode()
  };
}
