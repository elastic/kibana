/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { InventoryDefinitionError } from '../generator';

/** Where a classic (alerting v1) alert stores the value of each field its rule grouped by. */
export const CLASSIC_ALERT_GROUPING_PREFIX = 'kibana.alert.grouping.';

// The keys of an identity that name a document field: `{ field }` and `singleField`.
const FIELD_KEYS = new Set(['field', 'singleField']);

const prefixFields = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(prefixFields);
  }
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        FIELD_KEYS.has(key) && typeof value === 'string'
          ? `${CLASSIC_ALERT_GROUPING_PREFIX}${value}`
          : prefixFields(value),
      ])
    );
  }
  return node;
};

/**
 * Returns the definition with every identity field renamed to the column a classic alert stores
 * that field's value in, so the entity store's own id and presence logic runs unchanged over the
 * alert index and yields the same `entity.id` the list query yields for the entity.
 *
 * Throws an {@link InventoryDefinitionError} for an identity with `fieldEvaluations`: those derive
 * the id from computed columns an alert does not carry, so renaming their sources is not enough.
 */
export const toClassicAlertDefinition = (
  definition: EntityDefinitionWithoutId
): EntityDefinitionWithoutId => {
  const { identityField } = definition;
  if ('fieldEvaluations' in identityField && (identityField.fieldEvaluations ?? []).length > 0) {
    throw new InventoryDefinitionError(
      `the identity of "${definition.type}" uses fieldEvaluations, which alerts cannot be joined on yet`
    );
  }
  return {
    ...definition,
    identityField: prefixFields(identityField) as EntityDefinitionWithoutId['identityField'],
  };
};
