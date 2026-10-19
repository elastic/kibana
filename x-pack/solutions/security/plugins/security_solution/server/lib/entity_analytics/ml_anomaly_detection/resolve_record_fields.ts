/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { RawAnomalyRecord } from './types';

type AnomalyRecordCause = NonNullable<RawAnomalyRecord['causes']>[number];

export interface ResolvedRecordFields {
  actual?: number;
  typical?: number;
  detectorFunction?: string;
  fieldName?: string;
  byFieldName?: string;
  byFieldValue?: string;
  overFieldName?: string;
  overFieldValue?: string;
  partitionFieldName?: string;
  partitionFieldValue?: string;
}

const IDENTITY_NAMESPACES = ['user', 'host', 'service'] as const;

const collectStrings = (value: unknown, into: Set<string>): void => {
  if (typeof value === 'string') {
    into.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, into));
  }
};

/**
 * String values an anomaly record's by/over/partition fields may take for these entities
 * (e.g. `user.name`, `host.id`), used to pick the cause that belongs to the entity.
 */
export const getEntityIdentityValues = (entityRecords: Entity[]): Set<string> => {
  const values = new Set<string>();
  for (const record of entityRecords) {
    collectStrings(record.entity?.name, values);
    for (const namespace of IDENTITY_NAMESPACES) {
      const fields = (record as Partial<Record<typeof namespace, Record<string, unknown>>>)[
        namespace
      ];
      if (fields) {
        Object.values(fields).forEach((value) => collectStrings(value, values));
      }
    }
  }
  return values;
};

const causeDimensionValues = (cause: AnomalyRecordCause): string[] =>
  [cause.by_field_value, cause.over_field_value, cause.partition_field_value]
    .filter((value): value is string | number => value != null)
    .map(String);

/**
 * The cause relevant to the entity: the one whose by/over/partition value is one of the entity's
 * identity values, else the first (most anomalous) cause.
 */
export const selectCause = (
  causes: RawAnomalyRecord['causes'],
  identityValues?: Set<string>
): AnomalyRecordCause | undefined => {
  if (!causes?.length) return undefined;
  if (identityValues?.size) {
    const match = causes.find((cause) =>
      causeDimensionValues(cause).some((value) => identityValues.has(value))
    );
    if (match) return match;
  }
  return causes[0];
};

/**
 * Values and dimensions of an anomaly record. Population-analysis records (detector with
 * `over_field_name`) carry `actual` / `typical` and often `by_field_value` on their causes rather
 * than at the top level, so top-level fields are completed from the entity's cause.
 */
export const resolveRecordFields = (
  src: RawAnomalyRecord,
  identityValues?: Set<string>
): ResolvedRecordFields => {
  const cause = selectCause(src.causes, identityValues);
  const partitionFieldValue = src.partition_field_value ?? cause?.partition_field_value;
  return {
    actual: src.actual?.[0] ?? cause?.actual?.[0],
    typical: src.typical?.[0] ?? cause?.typical?.[0],
    detectorFunction: src.function ?? cause?.function,
    fieldName: src.field_name ?? cause?.field_name,
    byFieldName: src.by_field_name ?? cause?.by_field_name,
    byFieldValue: src.by_field_value ?? cause?.by_field_value,
    overFieldName: src.over_field_name ?? cause?.over_field_name,
    overFieldValue: src.over_field_value ?? cause?.over_field_value,
    partitionFieldName: src.partition_field_name ?? cause?.partition_field_name,
    partitionFieldValue: partitionFieldValue != null ? String(partitionFieldValue) : undefined,
  };
};
