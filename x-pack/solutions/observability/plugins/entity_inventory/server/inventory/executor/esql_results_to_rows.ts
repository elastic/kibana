/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';
import type { ESQLValue, InventoryRow } from './types';

/** Keys each row's values by column name; multi-values stay arrays. */
export const esqlResultsToRows = (columns: ESQLColumn[], values: ESQLValue[][]): InventoryRow[] =>
  values.map((cells) => {
    const row: InventoryRow = {};
    columns.forEach(({ name }, index) => {
      row[name] = cells[index];
    });
    return row;
  });
