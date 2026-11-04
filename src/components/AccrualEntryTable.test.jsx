import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AccrualEntryTable from './AccrualEntryTable';

const props = {
  lineItems: [{ id: 1, sequence: '1', expenseclass: '', company: '', supplierSearch: '', supplierName: '', invoiceNo: '', grossAmount: '', glSearch: '', glaccountName: '', profitSearch: '', profitcenterName: '', transType: '', vat: '', taxCode: '', remarks: '' }],
  expenseClass: [], expenseClassRules: [], companies: [], transactionTypes: [], taxCodes: [], lineItemErrors: [{}],
};

test('routes Excel ranges to the selected column while leaving single cell paste native', () => {
  const paste = jest.fn();
  render(<AccrualEntryTable {...props} onExcelPaste={paste} />);
  const amount = document.getElementById('gross-amount-1');
  fireEvent.paste(amount, { clipboardData: { getData: () => '100\tGL1\n200\tGL2' } });
  expect(paste).toHaveBeenCalledWith('100\tGL1\n200\tGL2', 0, 6);
  paste.mockClear();
  fireEvent.paste(amount, { clipboardData: { getData: () => '100' } });
  expect(paste).not.toHaveBeenCalled();
});

test('offers undo and prevents edits while the table is locked', () => {
  const undo = jest.fn();
  const paste = jest.fn();
  const { rerender } = render(<AccrualEntryTable {...props} deletedEntryCount={2} undoDelete={undo} onExcelPaste={paste} />);
  fireEvent.click(screen.getByRole('button', { name: 'Undo delete' }));
  expect(undo).toHaveBeenCalledTimes(1);
  rerender(<AccrualEntryTable {...props} deletedEntryCount={2} undoDelete={undo} onExcelPaste={paste} isDisabled />);
  expect(screen.getByRole('button', { name: 'Undo delete' })).toBeDisabled();
  fireEvent.paste(document.getElementById('gross-amount-1'), { clipboardData: { getData: () => '100\tGL1' } });
  expect(paste).not.toHaveBeenCalled();
});
