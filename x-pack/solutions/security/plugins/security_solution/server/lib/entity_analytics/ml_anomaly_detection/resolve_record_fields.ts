/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity, EntityType } from '@kbn/entity-store/common';
import type { RawAnomalyRecord } from './types';

type AnomalyRecordCause = NonNullable<RawAnomalyRecord['causes']>[number];

/** Identity field path (e.g. `user.name`) → values of the entity for that field. */
export type EntityIdentityFields = Map<string, Set<string>>;

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

// The namespace whose fields identify an entity of each type in source documents (and therefore
// in anomaly record dimensions). Other namespaces on the record (e.g. `host.*` on a user) are
// context shared with other entities and must not select a cause.
const IDENTITY_NAMESPACE: Record<EntityType, string> = {
  user: 'user',
  host: 'host',
  service: 'service',
  generic: 'entity',
};

const collectIdentityFields = (path: string, value: unknown, into: EntityIdentityFields): void => {
  if (typeof value === 'string') {
    into.set(path, (into.get(path) ?? new Set()).add(value));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectIdentityFields(path, item, into));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) =>
      collectIdentityFields(`${path}.${key}`, nested, into)
    );
  }
};

/**
 * Identity field → values of these entities (e.g. `user.name` → {alice}), restricted to the
 * entity type's own namespace, used to pick the cause that belongs to the entity.
 */
export const getEntityIdentityFields = (
  entityType: EntityType,
  entityRecords: Entity[]
): EntityIdentityFields => {
  const namespace = IDENTITY_NAMESPACE[entityType];
  const fields: EntityIdentityFields = new Map();
  for (const record of entityRecords) {
    collectIdentityFields(
      namespace,
      (record as Partial<Record<string, unknown>>)[namespace],
      fields
    );
  }
  return fields;
};

/** Identity fields of each entity record, keyed by `entity.id`, for per-hit cause selection. */
export const getIdentityFieldsByEntityId = (
  entityType: EntityType,
  entityRecords: Entity[]
): Map<string, EntityIdentityFields> =>
  new Map(
    entityRecords.flatMap((record) =>
      record.entity?.id
        ? [[record.entity.id, getEntityIdentityFields(entityType, [record])] as const]
        : []
    )
  );

const causeDimensions = (cause: AnomalyRecordCause): Array<[string, string]> =>
  (
    [
      [cause.by_field_name, cause.by_field_value],
      [cause.over_field_name, cause.over_field_value],
      [cause.partition_field_name, cause.partition_field_value],
    ] as Array<[string | undefined, string | number | undefined]>
  )
    .filter(([name, value]) => name != null && value != null)
    .map(([name, value]) => [String(name), String(value)]);

const countMatchingDimensions = (
  cause: AnomalyRecordCause,
  identityFields: EntityIdentityFields
): number =>
  causeDimensions(cause).filter(([name, value]) => identityFields.get(name)?.has(value) ?? false)
    .length;

/**
 * The cause relevant to the entity: the one with the most by/over/partition dimensions equal to
 * one of the entity's identity fields (earliest wins ties), else the first (most anomalous) cause.
 */
export const selectCause = (
  causes: RawAnomalyRecord['causes'],
  identityFields?: EntityIdentityFields
): AnomalyRecordCause | undefined => {
  if (!causes?.length) return undefined;
  if (!identityFields?.size) return causes[0];

  let best: AnomalyRecordCause | undefined;
  let bestScore = 0;
  for (const cause of causes) {
    const score = countMatchingDimensions(cause, identityFields);
    if (score > bestScore) {
      best = cause;
      bestScore = score;
    }
  }
  return best ?? causes[0];
};

/**
 * Values and dimensions of an anomaly record. Population-analysis records (detector with
 * `over_field_name`) carry `actual` / `typical` and often `by_field_value` on their causes rather
 * than at the top level, so top-level fields are completed from the entity's cause.
 */
export const resolveRecordFields = (
  src: RawAnomalyRecord,
  identityFields?: EntityIdentityFields
): ResolvedRecordFields => {
  const cause = selectCause(src.causes, identityFields);
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
