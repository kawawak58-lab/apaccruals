// Columns follow the visible table, including the automatically filled names.
export const PASTE_COLUMNS = [
  ['sequence', 'Seq.'], ['expenseclass', 'Expense Classification'], ['company', 'Company Charging'],
  ['supplier', 'Supplier'], ['supplierName', 'Supplier Name'], ['invoiceNo', 'Invoice No.'],
  ['grossAmount', 'Gross Amount'], ['glaccount', 'GL Account'], ['glaccountName', 'GL Account Name'],
  ['profitcenter', 'Profit Center'], ['profitcenterName', 'Profit Center Name'],
  ['transType', 'Transaction Type'], ['vat', 'VAT'], ['taxCode', 'Tax Code'], ['remarks', 'Remarks'],
];

export function parseExcelClipboard(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && (quoted || !value)) {
      if (quoted && input[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (!quoted && (char === '\t' || char === '\n')) {
      row.push(value); value = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else value += char;
  }
  if (quoted) throw new Error('The copied cells contain an unclosed quote. Copy the range again.');
  row.push(value);
  rows.push(row);
  while (rows.length && rows[rows.length - 1].every((cell) => cell === '')) rows.pop();
  if (!rows.length) throw new Error('Copy a range of cells from Excel first.');
  if (rows.length > 1000) throw new Error('Paste up to 1,000 rows at a time.');
  return rows;
}

export function restoreDeletedEntry(items, errors, deleted) {
  if (items.some((item) => item.id === deleted.item.id)) return { items, errors };
  const nextIndex = items.findIndex((item) => item.id === deleted.nextId);
  const previousIndex = items.findIndex((item) => item.id === deleted.previousId);
  const index = nextIndex >= 0 ? nextIndex : previousIndex >= 0 ? previousIndex + 1 : Math.min(deleted.index, items.length);
  // Invoice header edits made since deletion also apply to the restored line.
  const sibling = items.find((item) => String(item.sequence) === String(deleted.item.sequence));
  const restored = { ...deleted.item, showSupplierDropdown: false, showGLDropdown: false, showProfitDropdown: false };
  if (sibling) ['expenseclass', 'company', 'supplier', 'supplierName', 'supplierSearch', 'invoiceNo'].forEach((key) => { restored[key] = sibling[key]; });
  if (sibling && sibling.company !== deleted.item.company) {
    ['glaccount', 'glaccountName', 'glSearch', 'profitcenter', 'profitcenterName', 'profitSearch'].forEach((key) => { restored[key] = ''; });
  }
  return {
    items: [...items.slice(0, index), restored, ...items.slice(index)],
    errors: [...errors.slice(0, index), {}, ...errors.slice(index)],
  };
}

export async function prepareExcelPaste({ text, startRow, startColumn, items, counter, createRow, lists, rules, lookup, editing }) {
  const cells = parseExcelClipboard(text);
  if (startColumn < 0 || cells.some((row) => startColumn + row.length > PASTE_COLUMNS.length)) {
    throw new Error('The copied range extends beyond the Remarks column.');
  }
  const result = items.map((item) => ({ ...item }));
  const errors = [];
  const changes = [];
  const headerFields = ['expenseclass', 'company', 'supplier', 'invoiceNo'];
  const names = ['supplierName', 'glaccountName', 'profitcenterName'];
  const groupWrites = new Map();
  let nextId = counter;
  const canonical = (options, value, label) => {
    if (!value) return '';
    const match = options.find((option) => String(option).toLowerCase() === value.toLowerCase());
    if (!match) throw new Error(`${label}: “${value}” is not a valid option.`);
    return match;
  };
  for (let offset = 0; offset < cells.length; offset += 1) {
    const index = startRow + offset;
    if (!result[index]) {
      const source = result[index - 1];
      const sequence = startColumn <= 5 ? String(Math.max(0, ...result.map((item) => Number(item.sequence) || 0)) + 1) : source.sequence;
      result.push({ ...createRow(++nextId), sequence,
        ...(startColumn > 5 ? Object.fromEntries([...headerFields, 'supplierName', 'supplierSearch'].map((key) => [key, source[key]])) : {}) });
    }
    const target = result[index];
    const writes = Object.fromEntries(cells[offset].map((value, column) => [PASTE_COLUMNS[startColumn + column][0], value.trim()]));
    try {
      if ('sequence' in writes) {
        if (editing && writes.sequence !== target.sequence) throw new Error('Seq. cannot change when editing an existing accrual.');
        if (!/^[1-9]\d*$/.test(writes.sequence)) throw new Error('Seq. must be a positive whole number.');
        const sequence = String(Number(writes.sequence));
        if (sequence !== target.sequence) {
          const sibling = result.find((item) => item.id !== target.id && item.sequence === sequence);
          if (sibling) [...headerFields, 'supplierName', 'supplierSearch'].forEach((key) => { target[key] = sibling[key]; });
        }
        target.sequence = sequence;
      }
      for (const field of headerFields) {
        if (!(field in writes)) continue;
        let value = writes[field];
        if (lists[field]) value = canonical(lists[field], value, field);
        if (field === 'invoiceNo') {
          const rule = rules.find((entry) => entry.name === target.expenseclass);
          if (rule?.disabled_fields?.includes('invoice_no')) value = String(rule.default_invoice_no ?? '').trim();
        }
        const key = `${target.sequence}:${field}`;
        if (groupWrites.has(key) && groupWrites.get(key) !== value) throw new Error(`Conflicting ${field} values for Seq. ${target.sequence}.`);
        groupWrites.set(key, value);
        const siblings = result.filter((item) => item.sequence === target.sequence);
        siblings.forEach((item) => {
          if (field === 'company' && item.company !== value) {
            ['supplier', 'supplierName', 'supplierSearch', 'glaccount', 'glaccountName', 'glSearch', 'profitcenter', 'profitcenterName', 'profitSearch'].forEach((key) => { item[key] = ''; });
          }
          if (field === 'expenseclass' && item.expenseclass !== value) item.invoiceNo = rules.find((rule) => rule.name === value)?.default_invoice_no || '';
          item[field] = value;
        });
      }
      for (const [field, raw] of Object.entries(writes)) {
        if (names.includes(field) || headerFields.includes(field) || field === 'sequence') continue;
        let value = raw;
        if (lists[field]) value = canonical(lists[field], value, field);
        if (field === 'grossAmount' && value) {
          value = value.replace(/,/g, '');
          if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))) throw new Error('Gross Amount must be numeric.');
        }
        target[field] = value;
      }
      const disabled = rules.find((rule) => rule.name === target.expenseclass)?.disabled_fields || [];
      for (const [field, ruleKey] of [['supplier', 'supplier'], ['profitcenter', 'profit_center'], ['vat', 'vat'], ['taxCode', 'tax_code']]) {
        if (field in writes && writes[field] && disabled.includes(ruleKey)) throw new Error(`${field} is disabled for this expense classification.`);
      }
      changes.push({ index, columns: Object.keys(writes).filter((key) => !names.includes(key)) });
    } catch (error) { errors.push(`Row ${index + 1}: ${error.message}`); }
  }
  // Resolve every affected code after header propagation, using the company on the final row.
  const affected = result.filter((item, index) => (index >= startRow && index < startRow + cells.length) || headerFields.some((key) => groupWrites.has(`${item.sequence}:${key}`)));
  const cache = new Map();
  for (const item of affected) {
    for (const [field, name, search] of [['supplier', 'supplierName', 'supplierSearch'], ['glaccount', 'glaccountName', 'glSearch'], ['profitcenter', 'profitcenterName', 'profitSearch']]) {
      item[search] = item[field];
      item[name] = '';
      if (!item[field]) continue;
      const key = JSON.stringify([field, item.company, item[field]]);
      if (!cache.has(key)) cache.set(key, lookup(field, item.company, item[field]));
      const match = await cache.get(key);
      if (!match) errors.push(`Row ${result.indexOf(item) + 1}: ${field} “${item[field]}” does not exist for this company.`);
      else item[name] = match.name;
    }
    item.showSupplierDropdown = false; item.showGLDropdown = false; item.showProfitDropdown = false;
  }
  const sequences = [...new Set(result.map((item) => Number(item.sequence)))].sort((a, b) => a - b);
  if (sequences.some((sequence, index) => sequence !== index + 1)) errors.push('Seq. numbers must be consecutive starting at 1.');
  return { items: result, counter: nextId, errors, changes, rowCount: cells.length };
}
