import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public donation flow is connected to durable APIs", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /fetch\("\/api\/bootstrap"\)/);
  assert.match(page, /fetch\("\/api\/donations"/);
  assert.match(page, /\/api\/donations\/track/);
  assert.match(page, /QRCodeSVG/);
  assert.match(page, /Cetak kuitansi/);
});

test("admin surface is protected and supports operations", async () => {
  const [page, dashboard, api, layout, css] = await Promise.all([
    readFile(new URL("app/admin/page.tsx", root), "utf8"),
    readFile(new URL("app/admin/AdminDashboard.tsx", root), "utf8"),
    readFile(new URL("app/api/admin/route.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /requireChatGPTUser\("\/admin"\)/);
  for (const feature of ["Program", "Transaksi", "Penyaluran", "Tim & Peran", "Audit", "Ekspor CSV"]) assert.match(dashboard, new RegExp(feature));
  assert.match(api, /requireAdmin/);
  assert.match(api, /audit\(/);
  assert.match(layout, /width: "device-width"/);
  assert.match(dashboard, /aria-pressed=\{tab===id\}/);
  assert.match(css, /Dashboard responsif/);
  assert.match(css, /overflow-x:auto/);
});

test("database and payment webhook are configured", async () => {
  const [hosting, schema, webhook] = await Promise.all([
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/api/webhooks/xendit/route.ts", root), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  for (const table of ["programs", "transactions", "disbursements", "adminUsers", "auditLogs"]) assert.match(schema, new RegExp(`export const ${table}`));
  assert.match(webhook, /XENDIT_WEBHOOK_TOKEN/);
});
