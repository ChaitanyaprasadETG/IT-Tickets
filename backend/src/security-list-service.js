import {
  createDataverseSecurityList,
  deleteDataverseSecurityList,
  getDataverseMode,
  listDataverseSecurityList,
  updateDataverseSecurityList
} from "./dataverse.js";

export async function listSecurityList() {
  const dataverse = await listDataverseSecurityList();
  return {
    items: dataverse.items,
    count: dataverse.items.length,
    source: getDataverseMode()
  };
}

export async function createSecurityListItem(input) {
  const dataverse = await createDataverseSecurityList(input);

  return {
    item: dataverse.item || input,
    recordId: dataverse.recordId,
    source: getDataverseMode()
  };
}

export async function updateSecurityListItem(recordId, input) {
  await updateDataverseSecurityList(recordId, input);

  return {
    recordId,
    source: getDataverseMode()
  };
}

export async function deleteSecurityListItem(recordId) {
  await deleteDataverseSecurityList(recordId);

  return {
    recordId,
    source: getDataverseMode()
  };
}
