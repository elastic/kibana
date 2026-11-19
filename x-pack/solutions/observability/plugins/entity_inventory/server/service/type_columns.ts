/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicDisplayLabel } from '@kbn/entity-store/common';
import type { InventoryTypeColumn } from '../../common';
import { ENTITY_ID_COLUMN, LAST_SEEN_COLUMN } from '../inventory/generator';
import type { OutputColumn } from '../inventory/generator';

/** The text of the columns the generator adds itself, which no definition declares. */
const DEFAULT_COLUMN_LABELS: ReadonlyMap<string, string> = new Map([
  [ENTITY_ID_COLUMN, 'ID'],
  [LAST_SEEN_COLUMN, 'Last seen'],
]);

/**
 * The columns of a type for the `types` response: each column's label is the definition's display
 * label for its name, else the default of a generated column, else none.
 */
export const toTypeColumns = (
  columns: OutputColumn[],
  displayLabels: readonly DynamicDisplayLabel[] = []
): InventoryTypeColumn[] => {
  const authored = new Map(displayLabels.map(({ name, label }) => [name, label]));
  return columns.map(({ name, kind }) => {
    const label = authored.get(name) ?? DEFAULT_COLUMN_LABELS.get(name);
    return label === undefined ? { name, kind } : { name, kind, label };
  });
};
