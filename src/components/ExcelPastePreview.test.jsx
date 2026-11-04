import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExcelPastePreview from './ExcelPastePreview';

test('blocks invalid data and supports cancelling by Escape', () => {
  const cancel = jest.fn();
  const apply = jest.fn();
  render(<ExcelPastePreview preview={{ errors: ['Invalid supplier'] }} onCancel={cancel} onApply={apply} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid supplier');
  fireEvent.click(screen.getByRole('button', { name: 'Apply paste' }));
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByRole('alert')).toHaveClass('excelPasteErrorsAttention');
  const previousPanel = screen.getByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Apply paste' }));
  expect(screen.getByRole('alert')).not.toBe(previousPanel);
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(apply).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(cancel).toHaveBeenCalledTimes(1);
});

test('allows reviewed data to be applied and returns focus when closed', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  const apply = jest.fn();
  const { unmount } = render(<ExcelPastePreview preview={{ errors: [], changes: [], rowCount: 2 }} onCancel={() => {}} onApply={apply} />);
  expect(screen.getByRole('dialog')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Apply paste' }));
  expect(apply).toHaveBeenCalledTimes(1);
  unmount();
  expect(input).toHaveFocus();
  input.remove();
});
