#!/usr/bin/env node
/**
 * CLI di fatturina: da un descrittore JSON produce la fattura in Markdown o HTML.
 *
 *   fatturina fattura.json                 # Markdown su stdout
 *   fatturina fattura.json --html          # HTML su stdout
 *   fatturina fattura.json --html -o f.html
 *   cat fattura.json | fatturina -         # legge da stdin
 */

import { readFileSync, writeFileSync } from "node:fs";
import { computeInvoice, renderMarkdown, renderHtml, InvoiceError } from "../src/invoice.js";

function parseArgs(argv) {
  const opts = { file: undefined, html: false, out: undefined, totalsOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--html") opts.html = true;
    else if (a === "--totals") opts.totalsOnly = true;
    else if (a === "-o" || a === "--out") opts.out = argv[++i];
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (!a.startsWith("-") || a === "-") opts.file = a;
    else throw new Error(`Opzione sconosciuta: ${a}`);
  }
  return opts;
}

const HELP = `fatturina — genera una fattura da un descrittore JSON.

USO
  fatturina <fattura.json> [--html] [-o file] [--totals]
  cat fattura.json | fatturina -

OPZIONI
  --html        Output HTML (default: Markdown).
  -o, --out     Scrive su file invece che su stdout.
  --totals      Stampa solo imponibile/IVA/totale in JSON.
  -h, --help    Mostra questo aiuto.
`;

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.file) {
    process.stdout.write(HELP);
    return opts.file ? 0 : 1;
  }
  const raw = opts.file === "-" ? readFileSync(0, "utf8") : readFileSync(opts.file, "utf8");
  const data = JSON.parse(raw);

  if (opts.totalsOnly) {
    const inv = computeInvoice(data);
    const out = JSON.stringify(
      { subtotal: inv.subtotal, vatRate: inv.vatRate, vat: inv.vat, total: inv.total },
      null,
      2,
    );
    process.stdout.write(out + "\n");
    return 0;
  }

  const output = opts.html ? renderHtml(data) : renderMarkdown(data);
  if (opts.out) {
    writeFileSync(opts.out, output);
    process.stderr.write(`Scritto ${opts.out}\n`);
  } else {
    process.stdout.write(output + "\n");
  }
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  const msg = err instanceof InvoiceError || err instanceof Error ? err.message : String(err);
  process.stderr.write(`Errore: ${msg}\n`);
  process.exit(1);
}
