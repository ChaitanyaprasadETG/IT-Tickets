import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, "frontend");
const frontendDistDir = path.join(frontendDir, "dist");
const backendSrcDir = path.join(rootDir, "backend", "src");
const outputDir = path.join(rootDir, "dist");
const publicDir = path.join(outputDir, "public");
const backendOutDir = path.join(outputDir, "backend", "src");
const entryPointPath = path.join(outputDir, "index.mjs");

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function removeIfExists(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
      continue;
    }

    await fs.copyFile(sourcePath, destinationPath);
  }
}

function buildSiteEntryPoint() {
  return [
    "import fs from 'node:fs/promises';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "import { createAccessRequest, deleteAccessRequest, listAccessRequests, updateAccessRequest } from './backend/src/access-requests-service.js';",
    "import { createContact, deleteContact, listContacts, updateContact } from './backend/src/contacts-service.js';",
    "import { createSecurityListItem, deleteSecurityListItem, listSecurityList, updateSecurityListItem } from './backend/src/security-list-service.js';",
    "import { createTicket, deleteTicket, listTickets, updateTicket } from './backend/src/tickets-service.js';",
    "import { loadLocalEnv } from './backend/src/env.js';",
    "",
    "loadLocalEnv();",
    "",
    "const currentDir = path.dirname(fileURLToPath(import.meta.url));",
    "const publicDir = path.join(currentDir, 'public');",
    "",
    "function getEntraConfig() {",
    "  return {",
    "    tenantId: process.env.DATAVERSE_TENANT_ID || process.env.ENTRA_TENANT_ID || '',",
    "    clientId: process.env.DATAVERSE_CLIENT_ID || process.env.ENTRA_CLIENT_ID || '',",
    "    clientSecret: process.env.DATAVERSE_CLIENT_SECRET || process.env.ENTRA_CLIENT_SECRET || ''",
    "  };",
    "}",
    "",
    "async function getGraphAccessToken() {",
    "  const config = getEntraConfig();",
    "  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;",
    "  const body = new URLSearchParams({",
    "    client_id: config.clientId,",
    "    client_secret: config.clientSecret,",
    "    grant_type: 'client_credentials',",
    "    scope: 'https://graph.microsoft.com/.default'",
    "  });",
    "",
    "  const response = await fetch(tokenUrl, {",
    "    method: 'POST',",
    "    headers: {",
    "      'Content-Type': 'application/x-www-form-urlencoded'",
    "    },",
    "    body",
    "  });",
    "",
    "  if (!response.ok) {",
    "    throw new Error(`Microsoft Graph token request failed with ${response.status}`);",
    "  }",
    "",
    "  const payload = await response.json();",
    "  return payload.access_token;",
    "}",
    "",
    "function escapeGraphFilterValue(value) {",
    "  return String(value || '').trim().replace(/'/g, \"''\");",
    "}",
    "",
    "async function listCompanyUsers(query) {",
    "  const config = getEntraConfig();",
    "",
    "  if (!config.tenantId || !config.clientId || !config.clientSecret) {",
    "    return [];",
    "  }",
    "",
    "  const token = await getGraphAccessToken();",
    "  const search = escapeGraphFilterValue(query);",
    "  const filter = search",
    "    ? `startswith(displayName,'${search}') or startswith(mail,'${search}') or startswith(userPrincipalName,'${search}')`",
    "    : '';",
    "  const url = new URL('https://graph.microsoft.com/v1.0/users');",
    "",
    "  url.searchParams.set('$select', 'id,displayName,mail,userPrincipalName,jobTitle');",
    "  url.searchParams.set('$top', '25');",
    "  if (filter) {",
    "    url.searchParams.set('$filter', filter);",
    "  }",
    "",
    "  const response = await fetch(url, {",
    "    headers: {",
    "      Authorization: `Bearer ${token}`",
    "    }",
    "  });",
    "",
    "  if (!response.ok) {",
    "    const body = await response.text();",
    "    throw new Error(`Microsoft Graph users lookup failed with ${response.status}: ${body}`);",
    "  }",
    "",
    "  const payload = await response.json();",
    "  return Array.isArray(payload.value)",
    "    ? payload.value.map((item) => ({",
    "        id: String(item.id || '').trim(),",
    "        displayName: String(item.displayName || '').trim(),",
    "        email: String(item.mail || item.userPrincipalName || '').trim(),",
    "        userPrincipalName: String(item.userPrincipalName || '').trim(),",
    "        jobTitle: String(item.jobTitle || '').trim()",
    "      }))",
    "    : [];",
    "}",
    "",
    "function contentType(filePath) {",
    "  const extension = path.extname(filePath).toLowerCase();",
    "  if (extension === '.html') return 'text/html; charset=utf-8';",
    "  if (extension === '.js' || extension === '.mjs') return 'application/javascript; charset=utf-8';",
    "  if (extension === '.css') return 'text/css; charset=utf-8';",
    "  if (extension === '.json') return 'application/json; charset=utf-8';",
    "  if (extension === '.svg') return 'image/svg+xml';",
    "  if (extension === '.png') return 'image/png';",
    "  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';",
    "  if (extension === '.ico') return 'image/x-icon';",
    "  if (extension === '.woff') return 'font/woff';",
    "  if (extension === '.woff2') return 'font/woff2';",
    "  return 'application/octet-stream';",
    "}",
    "",
    "async function readJsonBody(request) {",
    "  const text = await request.text();",
    "  return text ? JSON.parse(text) : {};",
    "}",
    "",
    "async function sendJson(statusCode, payload) {",
    "  return new Response(JSON.stringify(payload), {",
    "    status: statusCode,",
    "    headers: {",
    "      'Content-Type': 'application/json; charset=utf-8',",
    "      'Access-Control-Allow-Origin': '*',",
    "      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',",
    "      'Access-Control-Allow-Headers': 'Content-Type, Authorization'",
    "    }",
    "  });",
    "}",
    "",
    "async function serveStaticFile(filePath) {",
    "  try {",
    "    const data = await fs.readFile(filePath);",
    "    return new Response(data, {",
    "      headers: {",
    "        'Content-Type': contentType(filePath),",
    "        'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable'",
    "      }",
    "    });",
    "  } catch (error) {",
    "    return null;",
    "  }",
    "}",
    "",
    "async function serveAppShell() {",
    "  const indexPath = path.join(publicDir, 'index.html');",
    "  return serveStaticFile(indexPath) || new Response('Not Found', { status: 404 });",
    "}",
    "",
    "export default {",
    "  async fetch(request) {",
    "    const url = new URL(request.url);",
    "",
    "    try {",
    "      if (request.method === 'OPTIONS') {",
    "        return new Response(null, {",
    "          status: 204,",
    "          headers: {",
    "            'Access-Control-Allow-Origin': '*',",
    "            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',",
    "            'Access-Control-Allow-Headers': 'Content-Type, Authorization'",
    "          }",
    "        });",
    "      }",
    "",
    "      if (request.method === 'GET' && url.pathname === '/health') {",
    "        return sendJson(200, { ok: true, mode: 'dataverse-configured' });",
    "      }",
    "",
    "      if (request.method === 'GET' && url.pathname === '/api/tickets') {",
    "        return sendJson(200, await listTickets());",
    "      }",
    "",
    "      if (request.method === 'POST' && url.pathname === '/api/tickets') {",
    "        return sendJson(201, await createTicket(await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'PATCH' && url.pathname.startsWith('/api/tickets/')) {",
    "        return sendJson(200, await updateTicket(url.pathname.replace('/api/tickets/', ''), await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'DELETE' && url.pathname.startsWith('/api/tickets/')) {",
    "        return sendJson(200, await deleteTicket(url.pathname.replace('/api/tickets/', '')));",
    "      }",
    "",
    "      if (request.method === 'GET' && url.pathname === '/api/access-requests') {",
    "        return sendJson(200, await listAccessRequests());",
    "      }",
    "",
    "      if (request.method === 'POST' && url.pathname === '/api/access-requests') {",
    "        return sendJson(201, await createAccessRequest(await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'PATCH' && url.pathname.startsWith('/api/access-requests/')) {",
    "        return sendJson(200, await updateAccessRequest(url.pathname.replace('/api/access-requests/', ''), await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'DELETE' && url.pathname.startsWith('/api/access-requests/')) {",
    "        return sendJson(200, await deleteAccessRequest(url.pathname.replace('/api/access-requests/', '')));",
    "      }",
    "",
    "      if (request.method === 'GET' && url.pathname === '/api/contacts') {",
    "        return sendJson(200, await listContacts());",
    "      }",
    "",
    "      if (request.method === 'POST' && url.pathname === '/api/contacts') {",
    "        return sendJson(201, await createContact(await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'PATCH' && url.pathname.startsWith('/api/contacts/')) {",
    "        return sendJson(200, await updateContact(url.pathname.replace('/api/contacts/', ''), await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'DELETE' && url.pathname.startsWith('/api/contacts/')) {",
    "        return sendJson(200, await deleteContact(url.pathname.replace('/api/contacts/', '')));",
    "      }",
    "",
    "      if (request.method === 'GET' && url.pathname === '/api/security-list') {",
    "        return sendJson(200, await listSecurityList());",
    "      }",
    "",
    "      if (request.method === 'POST' && url.pathname === '/api/security-list') {",
    "        return sendJson(201, await createSecurityListItem(await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'PATCH' && url.pathname.startsWith('/api/security-list/')) {",
    "        return sendJson(200, await updateSecurityListItem(url.pathname.replace('/api/security-list/', ''), await readJsonBody(request)));",
    "      }",
    "",
    "      if (request.method === 'DELETE' && url.pathname.startsWith('/api/security-list/')) {",
    "        return sendJson(200, await deleteSecurityListItem(url.pathname.replace('/api/security-list/', '')));",
    "      }",
    "",
    "      if (request.method === 'GET' && url.pathname === '/api/users') {",
    "        const query = url.searchParams.get('q') || '';",
    "        return sendJson(200, { items: await listCompanyUsers(query) });",
    "      }",
    "",
    "      if (request.method === 'GET') {",
    "        const relativePath = url.pathname === '/' ? '/index.html' : url.pathname;",
    "        const normalizedPath = relativePath.replace(/^\\/+/, '');",
    "        const assetPath = path.join(publicDir, normalizedPath);",
    "        const servedAsset = await serveStaticFile(assetPath);",
    "",
    "        if (servedAsset) {",
    "          return servedAsset;",
    "        }",
    "",
    "        return serveAppShell();",
    "      }",
    "",
    "      return sendJson(404, { error: 'Not Found' });",
    "    } catch (error) {",
    "      return sendJson(500, { error: error instanceof Error ? error.message : 'Unexpected server error' });",
    "    }",
    "  }",
    "};",
    ""
  ].join("\n");
}

async function main() {
  execSync(`${npmCommand()} run build`, {
    cwd: frontendDir,
    stdio: "inherit",
    shell: true
  });

  await removeIfExists(outputDir);
  await fs.mkdir(outputDir, { recursive: true });
  await copyDirectory(frontendDistDir, publicDir);
  await copyDirectory(backendSrcDir, backendOutDir);
  await fs.writeFile(entryPointPath, buildSiteEntryPoint(), "utf8");

  console.log(`Built deployable site bundle into ${path.relative(rootDir, outputDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
