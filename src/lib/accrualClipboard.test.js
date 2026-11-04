import { parseExcelClipboard, prepareExcelPaste, restoreDeletedEntry } from './accrualClipboard';

test('reads Excel quotes, embedded line breaks, blank cells, and trailing newline', () => {
  expect(parseExcelClipboard('12\t"two\nlines"\t"a ""quote"""\t\r\n')).toEqual([['12', 'two\nlines', 'a "quote"', '']]);
  expect(() => parseExcelClipboard('"unfinished')).toThrow('unclosed quote');
});

const createRow = (id) => ({ id, sequence: String(id), expenseclass: '', company: '', supplier: '', invoiceNo: '', grossAmount: '', remarks: '' });
const base = { ...createRow(1), expenseclass: 'Expense', company: 'Company', invoiceNo: 'INV-1' };
const context = {
  items: [base], counter: 1, createRow, startRow: 0, startColumn: 6,
  lists: { company: ['Company'], expenseclass: ['Expense'], transType: ['Service'], vat: ['Vatable'] },
  rules: [], lookup: async (field, company, code) => code === 'bad' ? null : { name: `${field} name` },
};

test('previews multiple rows and resolves names without changing the original data', async () => {
  const preview = await prepareExcelPaste({ ...context, text: '1,200\tGL1\tignored\tPC1\tignored\tService\tVatable\t\tFirst\n250\tGL2\t\tPC2\t\tService\tVatable\t\tSecond' });
  expect(preview.errors).toEqual([]);
  expect(preview.items[0]).toMatchObject({ grossAmount: '1200', glaccountName: 'glaccount name', remarks: 'First' });
  expect(preview.items[1]).toMatchObject({ id: 2, sequence: '1', company: 'Company', invoiceNo: 'INV-1', remarks: 'Second' });
  expect(base.grossAmount).toBe('');
});

test('rejects invalid codes, numeric values, and overflowing ranges', async () => {
  expect((await prepareExcelPaste({ ...context, text: '10\tbad' })).errors.join()).toContain('does not exist');
  expect((await prepareExcelPaste({ ...context, text: 'abc\tGL1' })).errors.join()).toContain('numeric');
  await expect(prepareExcelPaste({ ...context, startColumn: 14, text: 'a\tb' })).rejects.toThrow('beyond');
});

test('propagates pasted invoice details to sibling lines and rejects conflicting headers', async () => {
  const items = [base, { ...base, id: 2 }];
  const preview = await prepareExcelPaste({ ...context, items, counter: 2, startColumn: 5, text: 'NEW\t10' });
  expect(preview.items.map((item) => item.invoiceNo)).toEqual(['NEW', 'NEW']);
  expect((await prepareExcelPaste({ ...context, items, counter: 2, startColumn: 5, text: 'A\nB' })).errors.join()).toContain('Conflicting');
});

test('restores deleted entry between surviving neighbors and preserves subsequent invoice edits', () => {
  const items = [{ ...base, invoiceNo: 'UPDATED' }, { ...base, id: 3 }];
  const deleted = { item: { ...base, id: 2, remarks: 'Keep me' }, index: 1, previousId: 1, nextId: 3 };
  const restored = restoreDeletedEntry(items, [{ remarks: true }, {}], deleted);
  expect(restored.items.map((item) => item.id)).toEqual([1, 2, 3]);
  expect(restored.items[1]).toMatchObject({ invoiceNo: 'UPDATED', remarks: 'Keep me' });
  expect(restored.errors).toEqual([{ remarks: true }, {}, {}]);
  expect(restoreDeletedEntry(restored.items, restored.errors, deleted).items).toHaveLength(3);
});

test('uses the configured disabled invoice default instead of pasted values, before checking group conflicts', async () => {
  for (const defaultInvoice of ['0000', '00000']) {
    const preview = await prepareExcelPaste({
      ...context, items: [base, { ...base, id: 2 }], counter: 2, startColumn: 5,
      rules: [{ name: 'Expense', disabled_fields: ['invoice_no'], default_invoice_no: defaultInvoice }],
      text: '0\t100\nOTHER-INVOICE\t200',
    });
    expect(preview.errors).toEqual([]);
    expect(preview.items.map((item) => item.invoiceNo)).toEqual([defaultInvoice, defaultInvoice]);
  }
});
