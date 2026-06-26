import http from "node:http";
import { loadLocalEnv } from "./env.js";
import { getDataverseMode } from "./dataverse.js";
import { createContact, deleteContact, listContacts, updateContact } from "./contacts-service.js";
import { createAccessRequest, deleteAccessRequest, listAccessRequests, updateAccessRequest } from "./access-requests-service.js";
import { createSecurityListItem, deleteSecurityListItem, listSecurityList, updateSecurityListItem } from "./security-list-service.js";
import { createTicket, deleteTicket, listTickets, updateTicket } from "./tickets-service.js";

loadLocalEnv();

const port = Number(process.env.PORT || 3001);

function getEntraConfig() {
  return {
    tenantId: process.env.DATAVERSE_TENANT_ID || process.env.ENTRA_TENANT_ID || "",
    clientId: process.env.DATAVERSE_CLIENT_ID || process.env.ENTRA_CLIENT_ID || "",
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET || process.env.ENTRA_CLIENT_SECRET || ""
  };
}

async function getGraphAccessToken() {
  const config = getEntraConfig();
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default"
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Microsoft Graph token request failed with ${response.status}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

function escapeGraphFilterValue(value) {
  return String(value || "").trim().replace(/'/g, "''");
}

async function listCompanyUsers(query) {
  const config = getEntraConfig();

  if (!config.tenantId || !config.clientId || !config.clientSecret) {
    return [];
  }

  const token = await getGraphAccessToken();
  const search = escapeGraphFilterValue(query);
  const filter = search
    ? `startswith(displayName,'${search}') or startswith(mail,'${search}') or startswith(userPrincipalName,'${search}')`
    : "";
  const url = new URL("https://graph.microsoft.com/v1.0/users");

  url.searchParams.set("$select", "id,displayName,mail,userPrincipalName,jobTitle");
  url.searchParams.set("$top", "25");
  if (filter) {
    url.searchParams.set("$filter", filter);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Microsoft Graph users lookup failed with ${response.status}: ${body}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.value)
    ? payload.value.map((item) => ({
        id: String(item.id || "").trim(),
        displayName: String(item.displayName || "").trim(),
        email: String(item.mail || item.userPrincipalName || "").trim(),
        userPrincipalName: String(item.userPrincipalName || "").trim(),
        jobTitle: String(item.jobTitle || "").trim()
      }))
    : [];
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        mode: getDataverseMode()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/tickets") {
      sendJson(res, 200, await listTickets());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/tickets") {
      const payload = await readJsonBody(req);
      sendJson(res, 201, await createTicket(payload));
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/tickets/")) {
      const payload = await readJsonBody(req);
      sendJson(res, 200, await updateTicket(url.pathname.replace("/api/tickets/", ""), payload));
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/tickets/")) {
      sendJson(res, 200, await deleteTicket(url.pathname.replace("/api/tickets/", "")));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/access-requests") {
      sendJson(res, 200, await listAccessRequests());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/access-requests") {
      const payload = await readJsonBody(req);
      sendJson(res, 201, await createAccessRequest(payload));
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/access-requests/")) {
      const payload = await readJsonBody(req);
      sendJson(res, 200, await updateAccessRequest(url.pathname.replace("/api/access-requests/", ""), payload));
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/access-requests/")) {
      sendJson(res, 200, await deleteAccessRequest(url.pathname.replace("/api/access-requests/", "")));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/contacts") {
      sendJson(res, 200, await listContacts());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/contacts") {
      const payload = await readJsonBody(req);
      sendJson(res, 201, await createContact(payload));
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/contacts/")) {
      const payload = await readJsonBody(req);
      sendJson(res, 200, await updateContact(url.pathname.replace("/api/contacts/", ""), payload));
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/contacts/")) {
      sendJson(res, 200, await deleteContact(url.pathname.replace("/api/contacts/", "")));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/security-list") {
      sendJson(res, 200, await listSecurityList());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/users") {
      const query = url.searchParams.get("q") || "";
      sendJson(res, 200, { items: await listCompanyUsers(query) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/security-list") {
      const payload = await readJsonBody(req);
      sendJson(res, 201, await createSecurityListItem(payload));
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/security-list/")) {
      const payload = await readJsonBody(req);
      sendJson(res, 200, await updateSecurityListItem(url.pathname.replace("/api/security-list/", ""), payload));
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/security-list/")) {
      sendJson(res, 200, await deleteSecurityListItem(url.pathname.replace("/api/security-list/", "")));
      return;
    }

    sendJson(res, 404, {
      error: "Not Found"
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error"
    });
  }
});

server.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
