export function getAccrualSequenceKey(value, fallbackId) {
  const sequence = Number(value);
  return Number.isInteger(sequence) && sequence > 0 ? String(sequence) : `entry-${fallbackId}`;
}

export function groupAccrualRowsBySequence(rows) {
  const groups = [];
  const groupsBySequence = new Map();

  rows.forEach((item) => {
    const sequenceKey = getAccrualSequenceKey(item.sequence, item.id);
    let group = groupsBySequence.get(sequenceKey);
    if (!group) {
      group = { sequenceKey, headerItem: item, items: [] };
      groupsBySequence.set(sequenceKey, group);
      groups.push(group);
    }
    group.items.push(item);
  });

  return groups;
}
