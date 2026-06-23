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
      "const html = `<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "<meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
      "<title>IT Support Portal</title>",
      "<style>",
      "body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#f2f5f7;color:#0f1f3c;display:grid;place-items:center;min-height:100vh;padding:24px;}",
      ".card{max-width:720px;background:#fff;border:1px solid #d9e1e7;border-radius:18px;box-shadow:0 20px 48px rgba(21,36,52,.12);padding:32px;}",
      "h1{margin:0 0 12px;font-size:32px;}",
      "p{margin:0 0 10px;line-height:1.55;color:#43566d;}",
      "code{background:#eef5fb;padding:2px 6px;border-radius:6px;}",
      "</style>",
      "</head>",
      "<body>",
      "<div class=\"card\">",
      "<h1>IT Support portal package is deployed</h1>",
      "<p>The Sites packaging scaffold is now compatible with the deployment runtime.</p>",
      "<p>Source content from the Power Pages export is bundled in this deployment package.</p>",
      "<p>Build entrypoint: <code>dist/index.mjs</code></p>",
      "</div>",
      "</body>",
      "</html>`;",
      "",
      "export default {",
      "  async fetch() {",
      "    return new Response(html, {",
      "      headers: { 'content-type': 'text/html; charset=utf-8' }",
      "    });",
      "  }",
      "};",
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
