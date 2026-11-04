/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnSortingConfig } from '@elastic/eui';
import { ATTACK_TAB_COLUMN_ID } from '../utils';
import type { AttackRow } from './attack_tab_row';
import { getAlertCount, getDetectedOn, getRiskScore, getTitle } from './attack_tab_row';

export const DEFAULT_SORTING: EuiDataGridColumnSortingConfig[] = [
  { id: ATTACK_TAB_COLUMN_ID.detectedOn, direction: 'desc' },
];

/** The value a column sorts on, or `undefined` when the row has nothing to sort by. */
const getSortValue = (
  { attack, metadata, attachedBy, createdAt }: AttackRow,
  columnId: string
): string | number | undefined => {
  switch (columnId) {
    case ATTACK_TAB_COLUMN_ID.detectedOn:
      return getDetectedOn(attack, metadata);
    case ATTACK_TAB_COLUMN_ID.title:
      return getTitle(attack, metadata);
    case ATTACK_TAB_COLUMN_ID.alerts:
      return getAlertCount(attack, metadata);
    case ATTACK_TAB_COLUMN_ID.riskScore:
      return getRiskScore(attack, metadata);
    case ATTACK_TAB_COLUMN_ID.status:
      return attack?.alertWorkflowStatus;
    case ATTACK_TAB_COLUMN_ID.attachedBy:
      return attachedBy;
    case ATTACK_TAB_COLUMN_ID.attachedAt:
      return createdAt;
    default:
      return undefined;
  }
};

const compareBySortColumn = (
  a: AttackRow,
  b: AttackRow,
  { id, direction }: EuiDataGridColumnSortingConfig
): number => {
  const left = getSortValue(a, id);
  const right = getSortValue(b, id);

  if (left == null && right == null) {
    return 0;
  }
  // Rows missing the value sort last in either direction, so this precedes the direction flip.
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }

  const order =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right));

  return direction === 'asc' ? order : -order;
};

/** Sorts client-side, since attachment provenance and snapshots exist only on the client. */
export const compareRows = (
  a: AttackRow,
  b: AttackRow,
  sortingColumns: EuiDataGridColumnSortingConfig[]
): number => {
  for (const sortingColumn of sortingColumns) {
    const order = compareBySortColumn(a, b, sortingColumn);
    if (order !== 0) {
      return order;
    }
  }

  return 0;
};
