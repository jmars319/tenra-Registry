import type { BrowserWindow } from "electron";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusDocument(title: string, body: string, details = "") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, "Avenir Next", Arial, sans-serif;
        background: #0D0D0F;
        color: #f2f2f5;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
      }
      main {
        width: min(760px, calc(100vw - 48px));
        border: 1px solid rgba(242, 242, 245, 0.14);
        border-radius: 8px;
        background: #1E1E22;
        padding: 28px;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
      }
      p {
        line-height: 1.55;
        color: #A0A0A0;
      }
      pre {
        max-height: 280px;
        overflow: auto;
        white-space: pre-wrap;
        border-radius: 6px;
        background: #211f1a;
        color: #f8f1df;
        padding: 14px;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
      ${details ? `<pre>${escapeHtml(details)}</pre>` : ""}
    </main>
  </body>
</html>`;
}

export async function showStatus(window: BrowserWindow | undefined, title: string, body: string, details = "") {
  if (!window) return;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(statusDocument(title, body, details))}`);
}
