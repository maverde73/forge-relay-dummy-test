import { test } from "node:test";
import assert from "node:assert/strict";

import { computeInvoice, renderMarkdown, renderHtml, InvoiceError } from "../src/invoice.js";
import { round2 } from "../src/money.js";

const sample = {
  number: "2026-001",
  date: "2026-08-15",
  seller: { name: "Studio Verde", vatId: "IT01234567890" },
  client: { name: "ACME Srl", vatId: "IT09876543210" },
  vatRate: 22,
  items: [
    { description: "Sviluppo", qty: 3, unitPrice: 500 },
    { description: "Consulenza", qty: 2, unitPrice: 120.5 },
  ],
};

test("round2 arrotonda ai centesimi", () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(2.005), 2.01);
});

test("computeInvoice calcola subtotale, IVA e totale", () => {
  const inv = computeInvoice(sample);
  assert.equal(inv.items[0].lineTotal, 1500);
  assert.equal(inv.items[1].lineTotal, 241);
  assert.equal(inv.subtotal, 1741);
  assert.equal(inv.vat, round2(1741 * 0.22));
  assert.equal(inv.total, round2(1741 + inv.vat));
});

test("vatRate 0 produce IVA nulla", () => {
  const inv = computeInvoice({ ...sample, vatRate: 0 });
  assert.equal(inv.vat, 0);
  assert.equal(inv.total, inv.subtotal);
});

test("computeInvoice richiede almeno una voce", () => {
  assert.throws(() => computeInvoice({ items: [] }), InvoiceError);
});

test("computeInvoice rifiuta prezzi non validi", () => {
  assert.throws(() => computeInvoice({ items: [{ description: "x", qty: 1, unitPrice: "abc" }] }), InvoiceError);
});

test("renderMarkdown include totale e descrizioni", () => {
  const md = renderMarkdown(sample);
  assert.match(md, /Fattura 2026-001/);
  assert.match(md, /Sviluppo/);
  assert.match(md, /Totale/);
});

test("renderHtml produce una pagina valida ed esegue l'escape", () => {
  const html = renderHtml({ ...sample, client: { name: "A & <b>B</b>" } });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /A &amp; &lt;b&gt;/);
});
