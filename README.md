# fatturina 🧾

Genera **fatture professionali** (Markdown o HTML stampabile) da un semplice
descrittore JSON. Pensata per freelance e piccole attività: descrivi le voci,
lei calcola imponibile, IVA e totale e produce un documento pronto da inviare.

> Progetto d'esempio usato come contesto realistico per i test di **ForgeRelay**.

## Uso

```bash
# Markdown su stdout
node bin/fatturina.js example.json

# HTML stampabile su file
node bin/fatturina.js example.json --html -o fattura.html

# solo i totali (per integrazioni)
node bin/fatturina.js example.json --totals

# da stdin
cat example.json | node bin/fatturina.js -
```

## Descrittore

```json
{
  "number": "2026-001",
  "date": "2026-08-15",
  "seller": { "name": "...", "vatId": "IT...", "address": "..." },
  "client": { "name": "...", "vatId": "IT...", "address": "..." },
  "vatRate": 22,
  "items": [
    { "description": "Sviluppo", "qty": 5, "unitPrice": 500 }
  ],
  "notes": "Pagamento a 30 giorni."
}
```

## Come libreria

```js
import { computeInvoice, renderHtml } from "./src/invoice.js";

const inv = computeInvoice(data);
console.log(inv.total);        // totale con IVA
const html = renderHtml(data); // pagina HTML autonoma
```

## Test

```bash
npm test
```

## Licenza

MIT
