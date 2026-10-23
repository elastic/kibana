/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { getDynamicBlock } from './dynamic';
import { InventoryDefinitionError } from './errors';
import type { IdentityPlan } from './identity';
import { ENTITY_ID_COLUMN } from './identity';
import type { QueryPlan } from './types';

/** The column holding the newest `@timestamp` of an entity. */
export const LAST_SEEN_COLUMN = 'last_seen';

/** What an output column holds. */
export type OutputColumnKind = 'id' | 'identity' | 'attribute' | 'last_seen';

/** One column of the inventory output. */
export interface OutputColumn {
  name: string;
  kind: OutputColumnKind;
  /** Attributes only: plan index to the source field read in that plan. */
  fieldByPlan?: Record<number, string>;
}

const RESERVED_COLUMNS: ReadonlySet<string> = new Set([ENTITY_ID_COLUMN, LAST_SEEN_COLUMN]);

/**
 * Builds the ordered output columns from the resolved identity: `entity.id`, the identity fields
 * other than `entity.id`, the attributes in plan order (one column per name), then `last_seen`.
 */
export const buildColumns = (
  definition: EntityDefinitionWithoutId,
  plans: QueryPlan[],
  { groupingFields, helperColumns }: IdentityPlan
): OutputColumn[] => {
  getDynamicBlock(definition);
  const identityFields = new Set(groupingFields);
  const helperColumnNames = new Set(helperColumns);
  const attributeColumns = new Map<string, Record<number, string>>();

  plans.forEach(({ index, attributes }) => {
    attributes.forEach(({ name, field }) => {
      if (RESERVED_COLUMNS.has(name)) {
        throw new InventoryDefinitionError(
          `attribute name "${name}" is reserved by the inventory query generator for its own output column`
        );
      }
      if (helperColumnNames.has(name)) {
        throw new InventoryDefinitionError(
          `attribute name "${name}" is a column the identity compiler generates for definition "${definition.type}"`
        );
      }
      if (identityFields.has(name)) {
        throw new InventoryDefinitionError(
          `attribute name "${name}" collides with an identity field of definition "${definition.type}"`
        );
      }
      const fieldByPlan = attributeColumns.get(name) ?? {};
      fieldByPlan[index] = field;
      attributeColumns.set(name, fieldByPlan);
    });
  });

  return [
    { name: ENTITY_ID_COLUMN, kind: 'id' },
    // An identity field named `entity.id` is already the id column; list it once.
    ...groupingFields
      .filter((name) => name !== ENTITY_ID_COLUMN)
      .map((name): OutputColumn => ({ name, kind: 'identity' })),
    ...[...attributeColumns].map(
      ([name, fieldByPlan]): OutputColumn => ({ name, kind: 'attribute', fieldByPlan })
    ),
    { name: LAST_SEEN_COLUMN, kind: 'last_seen' },
  ];
};

/** Names of the columns a plan produces, in column order; attributes it does not carry are left out. */
export const planColumnNames = (columns: OutputColumn[], plan: QueryPlan): string[] =>
  columns
    .filter(
      ({ kind, fieldByPlan }) => kind !== 'attribute' || fieldByPlan?.[plan.index] !== undefined
    )
    .map(({ name }) => name);
