/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_COLUMN } from '../inventory/generator';
import type { EntityRow, EsqlScalar, EsqlValue, KeyedAlertGroups, MatchKey } from './types';

const isList = (value: EsqlValue | undefined): value is readonly EsqlScalar[] =>
  Array.isArray(value);

/** The value as text, taking the first of a multi-value, or `null` when there is none. */
const toText = (value: EsqlValue | undefined): string | null => {
  const scalar = isList(value) ? value[0] : value;
  return scalar === null || scalar === undefined ? null : String(scalar);
};

/** The entity's value at each column of the key, or `null` when any is missing. */
export const entityTuple = (entity: EntityRow, key: MatchKey): string[] | null => {
  const values = key.map((column) => toText(entity[column]));
  return values.every((value): value is string => value !== null) ? values : null;
};

const tupleId = (values: readonly string[]): string => JSON.stringify(values);

/** Joins each entity to the alerts whose grouping equals its values, over every key given. */
export const attributeAlertsToEntities = (
  entities: readonly EntityRow[],
  keyedGroups: readonly KeyedAlertGroups[]
): ReadonlyMap<string, ReadonlySet<string>> => {
  const alertIdsByEntity = new Map<string, Set<string>>();

  for (const { key, groups } of keyedGroups) {
    const alertIdsByTuple = new Map(
      groups.map(({ values, alertIds }) => [tupleId(values), alertIds])
    );

    for (const entity of entities) {
      const entityId = toText(entity[ENTITY_ID_COLUMN]);
      const tuple = entityTuple(entity, key);
      const alertIds = tuple && alertIdsByTuple.get(tupleId(tuple));
      if (entityId === null || !alertIds) {
        continue;
      }
      const attributed = alertIdsByEntity.get(entityId) ?? new Set<string>();
      alertIds.forEach((alertId) => attributed.add(alertId));
      alertIdsByEntity.set(entityId, attributed);
    }
  }

  return alertIdsByEntity;
};
