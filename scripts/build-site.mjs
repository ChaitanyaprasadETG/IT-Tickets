import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "it-support---etgithubportal", "it-support---etgithubportal");
const outputDir = path.join(rootDir, "dist");
const entryPointPath = path.join(outputDir, "index.mjs");

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

async function main() {
  await removeIfExists(outputDir);
  await copyDirectory(sourceDir, outputDir);
  await fs.writeFile(
    entryPointPath,
    [
      "import http from 'node:http';",
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      "import { fileURLToPath } from 'node:url';",
      "",
      "const port = Number(process.env.PORT || process.env.NEXT_PUBLIC_PORT || 3000);",
      "const rootDir = path.dirname(fileURLToPath(import.meta.url));",
      "",
      "function send(res, statusCode, body, contentType) {",
      "  res.writeHead(statusCode, { 'content-type': contentType || 'text/plain; charset=utf-8' });",
      "  res.end(body);",
      "}",
      "",
      "function serveFile(res, filePath) {",
      "  fs.readFile(filePath, (error, data) => {",
      "    if (error) {",
      "      send(res, 404, 'Not Found');",
      "      return;",
      "    }",
      "",
      "    const ext = path.extname(filePath).toLowerCase();",
      "    const contentType = ext === '.html' ? 'text/html; charset=utf-8' :",
      "      ext === '.js' ? 'application/javascript; charset=utf-8' :",
      "      ext === '.css' ? 'text/css; charset=utf-8' : 'application/octet-stream';",
      "    send(res, 200, data, contentType);",
      "  });",
      "}",
      "",
      "http.createServer((req, res) => {",
      "  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);",
      "  if (requestPath === '/' || requestPath === '') {",
      "    send(",
      "      res,",
      "      200,",
      "      '<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>IT Support Portal</title></head><body style=\"font-family:Segoe UI,Arial,sans-serif;padding:40px;background:#f2f5f7;color:#0f1f3c\"><h1>IT Support portal package is ready</h1><p>The Sites build scaffold is deployed successfully.</p></body></html>',",
      "      'text/html; charset=utf-8'",
      "    );",
      "    return;",
      "  }",
      "",
      "  const filePath = path.join(rootDir, requestPath);",
      "  if (!filePath.startsWith(rootDir)) {",
      "    send(res, 403, 'Forbidden');",
      "    return;",
      "  }",
      "",
      "  fs.stat(filePath, (error, stat) => {",
      "    if (!error && stat.isFile()) {",
      "      serveFile(res, filePath);",
      "      return;",
      "    }",
      "",
      "    send(res, 404, 'Not Found');",
      "  });",
      "}).listen(port, () => {",
      "  console.log(`IT Support portal scaffold listening on ${port}`);",
      "});",
      ""
    ].join("\n"),
    "utf8"
  );
  console.log(`Built portal export into ${path.relative(rootDir, outputDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
