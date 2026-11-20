/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLValue } from '@kbn/entity-inventory-plugin/common';

/** Formats a cell as text, or returns `null` when the cell has no value. */
export const formatCellValue = (value: ESQLValue | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    return String(value);
  }
  const present = value.filter((item) => item !== null);
  return present.length > 0 ? present.join(', ') : null;
};
