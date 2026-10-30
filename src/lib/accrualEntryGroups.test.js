import { groupAccrualRowsBySequence } from "./accrualEntryGroups";

test("rows sharing a sequence are submitted together under the first row's header", () => {
  const first = { id: 1, sequence: "1", expenseclass: "Travel", grossAmount: "100" };
  const second = { id: 2, sequence: "2", expenseclass: "Meals", grossAmount: "50" };
  const third = { id: 3, sequence: "1", expenseclass: "Travel", grossAmount: "25" };

  const groups = groupAccrualRowsBySequence([first, second, third]);

  expect(groups).toHaveLength(2);
  expect(groups[0].headerItem).toBe(first);
  expect(groups[0].items).toEqual([first, third]);
  expect(groups[1].items).toEqual([second]);
});

test("invalid or blank sequences remain separate instead of merging", () => {
  const rows = [
    { id: 1, sequence: "", grossAmount: "100" },
    { id: 2, sequence: "0", grossAmount: "50" },
  ];

  expect(groupAccrualRowsBySequence(rows).map((group) => group.items)).toEqual([[rows[0]], [rows[1]]]);
});
