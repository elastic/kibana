/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryCellValue } from '../../inventory_api/types';

/** Formats a cell as text, or returns `null` when the cell has no value. */
export const formatCellValue = (value: InventoryCellValue | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    return String(value);
  }
  const present = value.filter((item) => item !== null);
  return present.length > 0 ? present.join(', ') : null;
};
