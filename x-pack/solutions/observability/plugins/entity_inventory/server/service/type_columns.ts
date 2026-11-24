/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DynamicDisplayLabel } from '@kbn/entity-store/common';
import type { InventoryTypeColumn } from '../../common';
import { ENTITY_ID_COLUMN, LAST_SEEN_COLUMN } from '../inventory/generator';
import type { OutputColumn } from '../inventory/generator';

/** The text of the columns the generator adds itself, which no definition declares. */
const getDefaultColumnLabel = (name: string): string | undefined => {
  switch (name) {
    case ENTITY_ID_COLUMN:
      return i18n.translate('xpack.entityInventory.columns.id', { defaultMessage: 'ID' });
    case LAST_SEEN_COLUMN:
      return i18n.translate('xpack.entityInventory.columns.lastSeen', {
        defaultMessage: 'Last seen',
      });
    default:
      return undefined;
  }
};

/**
 * The columns of a type for the `types` response: each column's label is the definition's display
 * label for its name, else the default of a generated column, else none. A metric column also
 * carries the `agg` it is computed with and the `unit` the definition declared, so the client can
 * format its values.
 */
export const toTypeColumns = (
  columns: OutputColumn[],
  displayLabels: readonly DynamicDisplayLabel[] = []
): InventoryTypeColumn[] => {
  const authored = new Map(displayLabels.map(({ name, label }) => [name, label]));
  return columns.map(({ name, kind, agg, unit }) => {
    const label = authored.get(name) ?? getDefaultColumnLabel(name);
    return {
      name,
      kind,
      ...(label !== undefined ? { label } : {}),
      ...(agg !== undefined ? { agg } : {}),
      ...(unit !== undefined ? { unit } : {}),
    };
  });
};
