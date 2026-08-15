/**
 * Nucleo di `fatturina`: calcolo e rendering di una fattura.
 *
 * Input atteso (JSON):
 * {
 *   "number": "2026-001",
 *   "date": "2026-08-15",
 *   "seller": { "name": "...", "vatId": "IT01234567890", "address": "..." },
 *   "client": { "name": "...", "vatId": "...", "address": "..." },
 *   "currency": "EUR",
 *   "vatRate": 22,
 *   "items": [ { "description": "Sviluppo", "qty": 3, "unitPrice": 500 } ],
 *   "notes": "Pagamento a 30 giorni."
 * }
 */

import { round2, formatEUR } from "./money.js";

export class InvoiceError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvoiceError";
  }
}

/** Normalizza gli item e calcola subtotale, IVA e totale. */
export function computeInvoice(input) {
  if (!input || typeof input !== "object") {
    throw new InvoiceError("La fattura deve essere un oggetto.");
  }
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) {
    throw new InvoiceError("La fattura deve contenere almeno una voce (items).");
  }

  const items = rawItems.map((it, i) => {
    const qty = Number(it.qty ?? it.quantity ?? 1);
    const unitPrice = Number(it.unitPrice ?? it.price);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new InvoiceError(`Voce ${i + 1}: quantità non valida.`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new InvoiceError(`Voce ${i + 1}: prezzo unitario non valido.`);
    }
    const description = String(it.description ?? "").trim() || `Voce ${i + 1}`;
    return { description, qty, unitPrice, lineTotal: round2(qty * unitPrice) };
  });

  const subtotal = round2(items.reduce((sum, it) => sum + it.lineTotal, 0));
  const vatRate = input.vatRate === undefined ? 22 : Number(input.vatRate);
  if (!Number.isFinite(vatRate) || vatRate < 0) {
    throw new InvoiceError("Aliquota IVA (vatRate) non valida.");
  }
  const vat = round2((subtotal * vatRate) / 100);
  const total = round2(subtotal + vat);

  return {
    number: input.number ?? "—",
    date: input.date ?? "—",
    seller: input.seller ?? {},
    client: input.client ?? {},
    currency: input.currency ?? "EUR",
    notes: input.notes,
    items,
    subtotal,
    vatRate,
    vat,
    total,
  };
}

function partyLines(party) {
  return [party.name, party.vatId ? `P.IVA ${party.vatId}` : null, party.address]
    .filter(Boolean)
    .join("  \n");
}

/** Come partyLines ma con escape HTML su ogni campo, per il rendering HTML. */
function partyLinesHtml(party) {
  return [party.name, party.vatId ? `P.IVA ${party.vatId}` : null, party.address]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
}

/** Rende la fattura calcolata in Markdown. */
export function renderMarkdown(inputOrComputed) {
  const inv = inputOrComputed.items?.[0]?.lineTotal !== undefined
    ? inputOrComputed
    : computeInvoice(inputOrComputed);

  const rows = inv.items
    .map(
      (it) =>
        `| ${it.description} | ${it.qty} | ${formatEUR(it.unitPrice)} | ${formatEUR(it.lineTotal)} |`,
    )
    .join("\n");

  return `# Fattura ${inv.number}

**Data:** ${inv.date}

**Da:**
${partyLines(inv.seller) || "—"}

**A:**
${partyLines(inv.client) || "—"}

| Descrizione | Q.tà | Prezzo unitario | Totale |
|---|---:|---:|---:|
${rows}

|  |  |
|---|---:|
| Imponibile | ${formatEUR(inv.subtotal)} |
| IVA (${inv.vatRate}%) | ${formatEUR(inv.vat)} |
| **Totale** | **${formatEUR(inv.total)}** |
${inv.notes ? `\n> ${inv.notes}\n` : ""}`;
}

/** Rende la fattura calcolata in una pagina HTML autonoma e stampabile. */
export function renderHtml(inputOrComputed) {
  const inv = inputOrComputed.items?.[0]?.lineTotal !== undefined
    ? inputOrComputed
    : computeInvoice(inputOrComputed);

  const rows = inv.items
    .map(
      (it) => `<tr>
      <td>${escapeHtml(it.description)}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${formatEUR(it.unitPrice)}</td>
      <td class="num">${formatEUR(it.lineTotal)}</td>
    </tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Fattura ${escapeHtml(inv.number)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; color: #1a1a1a; }
  h1 { margin-bottom: .25rem; }
  .parties { display: flex; gap: 2rem; margin: 1.5rem 0; }
  .parties div { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: .5rem .6rem; border-bottom: 1px solid #ddd; text-align: left; }
  .num { text-align: right; }
  tfoot td { font-weight: 600; border-bottom: none; }
  .total { font-size: 1.15rem; }
  .notes { margin-top: 1.5rem; color: #555; }
</style>
</head>
<body>
  <h1>Fattura ${escapeHtml(inv.number)}</h1>
  <div>Data: ${escapeHtml(inv.date)}</div>
  <div class="parties">
    <div><strong>Da</strong><br>${partyLinesHtml(inv.seller) || "—"}</div>
    <div><strong>A</strong><br>${partyLinesHtml(inv.client) || "—"}</div>
  </div>
  <table>
    <thead>
      <tr><th>Descrizione</th><th class="num">Q.tà</th><th class="num">Prezzo</th><th class="num">Totale</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
    <tfoot>
      <tr><td colspan="3" class="num">Imponibile</td><td class="num">${formatEUR(inv.subtotal)}</td></tr>
      <tr><td colspan="3" class="num">IVA (${inv.vatRate}%)</td><td class="num">${formatEUR(inv.vat)}</td></tr>
      <tr class="total"><td colspan="3" class="num">Totale</td><td class="num">${formatEUR(inv.total)}</td></tr>
    </tfoot>
  </table>
  ${inv.notes ? `<p class="notes">${escapeHtml(inv.notes)}</p>` : ""}
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
