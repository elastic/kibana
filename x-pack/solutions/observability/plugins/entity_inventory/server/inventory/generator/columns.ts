/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DynamicMetricAgg,
  DynamicMetricUnit,
  EntityDefinitionWithoutId,
} from '@kbn/entity-store/common';
import type { OutputColumnKind } from '../../../common';
import { getDynamicBlock } from './dynamic';
import { InventoryDefinitionError } from './errors';
import type { IdentityPlan } from './identity';
import { ENTITY_ID_COLUMN } from './identity';
import { listMetricsUnsupportedOnEngine } from './metrics/utils';
import type { QueryPlan } from './types';

/** The column holding the newest `@timestamp` of an entity. */
export const LAST_SEEN_COLUMN = 'last_seen';

/** One column of the inventory output. */
export interface OutputColumn {
  name: string;
  kind: OutputColumnKind;
  /** Attributes and metrics: plan index to the source field read in that plan. */
  fieldByPlan?: Record<number, string>;
  /** Metrics only: the aggregate every source declared for this column. */
  agg?: DynamicMetricAgg;
  /** Metrics only: optional unit for client formatting. */
  unit?: DynamicMetricUnit;
}

const RESERVED_COLUMNS: ReadonlySet<string> = new Set([ENTITY_ID_COLUMN, LAST_SEEN_COLUMN]);

/**
 * Rejects attribute/metric names that collide with inventory output columns, identity fields, or
 * identity-compiler helpers. The entity-store schema also reserves some of these for metrics at
 * registration; attributes and helper-column names are enforced here because the schema does not.
 */
const assertSafeOutputName = (
  name: string,
  kind: 'attribute' | 'metric',
  definitionType: string,
  identityFields: ReadonlySet<string>,
  helperColumnNames: ReadonlySet<string>
): void => {
  if (RESERVED_COLUMNS.has(name)) {
    throw new InventoryDefinitionError(
      `${kind} name "${name}" is reserved by the inventory query generator for its own output column`
    );
  }
  if (helperColumnNames.has(name)) {
    throw new InventoryDefinitionError(
      `${kind} name "${name}" is a column the identity compiler generates for definition "${definitionType}"`
    );
  }
  if (identityFields.has(name)) {
    throw new InventoryDefinitionError(
      `${kind} name "${name}" collides with an identity field of definition "${definitionType}"`
    );
  }
};

/**
 * Builds the ordered output columns from the resolved identity: `entity.id`, the identity fields
 * other than `entity.id`, the attributes then metrics in plan order (one column per name), then
 * `last_seen`.
 */
export const buildColumns = (
  definition: EntityDefinitionWithoutId,
  plans: ReadonlyArray<Pick<QueryPlan, 'index' | 'attributes' | 'metrics'>>,
  { groupingFields, helperColumns }: IdentityPlan
): OutputColumn[] => {
  getDynamicBlock(definition);
  const identityFields = new Set(groupingFields);
  const helperColumnNames = new Set(helperColumns);
  const attributeColumns = new Map<string, Record<number, string>>();
  const metricColumns = new Map<
    string,
    { fieldByPlan: Record<number, string>; agg: DynamicMetricAgg; unit?: DynamicMetricUnit }
  >();

  plans.forEach(({ index, attributes, metrics }) => {
    attributes.forEach(({ name, field }) => {
      assertSafeOutputName(name, 'attribute', definition.type, identityFields, helperColumnNames);
      if (metricColumns.has(name)) {
        throw new InventoryDefinitionError(
          `attribute name "${name}" collides with a metric of definition "${definition.type}"`
        );
      }
      const fieldByPlan = attributeColumns.get(name) ?? {};
      fieldByPlan[index] = field;
      attributeColumns.set(name, fieldByPlan);
    });

    metrics.forEach(({ name, field, agg, unit }) => {
      assertSafeOutputName(name, 'metric', definition.type, identityFields, helperColumnNames);
      if (attributeColumns.has(name)) {
        throw new InventoryDefinitionError(
          `metric name "${name}" collides with an attribute of definition "${definition.type}"`
        );
      }
      const prior = metricColumns.get(name);
      if (prior === undefined) {
        metricColumns.set(name, { fieldByPlan: { [index]: field }, agg, unit });
        return;
      }
      if (prior.agg !== agg || prior.unit !== unit) {
        throw new InventoryDefinitionError(
          `metric "${name}" must keep the same agg and unit across plans of definition "${definition.type}"`
        );
      }
      prior.fieldByPlan[index] = field;
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
    ...[...metricColumns].map(
      ([name, { fieldByPlan, agg, unit }]): OutputColumn => ({
        name,
        kind: 'metric',
        fieldByPlan,
        agg,
        ...(unit !== undefined ? { unit } : {}),
      })
    ),
    { name: LAST_SEEN_COLUMN, kind: 'last_seen' },
  ];
};

/**
 * Names of the columns a plan produces, in column order. Attributes/metrics the plan does not carry
 * are left out; metrics the plan's engine cannot compute (rates under `FROM`) are left out too.
 */
export const planColumnNames = (columns: OutputColumn[], plan: QueryPlan): string[] => {
  const unsupportedMetricNames = new Set(
    listMetricsUnsupportedOnEngine(plan.metrics, plan.engine).map(({ name }) => name)
  );
  return columns
    .filter(({ kind, name, fieldByPlan }) => {
      if (kind === 'attribute') {
        return fieldByPlan?.[plan.index] !== undefined;
      }
      if (kind === 'metric') {
        return fieldByPlan?.[plan.index] !== undefined && !unsupportedMetricNames.has(name);
      }
      return true;
    })
    .map(({ name }) => name);
};
