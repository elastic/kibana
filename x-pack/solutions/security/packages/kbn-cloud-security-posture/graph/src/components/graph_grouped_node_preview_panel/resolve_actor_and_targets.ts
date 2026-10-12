/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ALL_ENTITY_TYPES } from '@kbn/entity-store/common';
import type { EntityType } from '@kbn/entity-store/common';
import type { EntityStoreEuid } from '@kbn/entity-store/public';
import {
  getGraphActorEuidSourceFields,
  getGraphTargetEuidSourceFields,
} from '@kbn/cloud-security-posture-common/constants';

/** Upper bound on multi-value combinations resolved per entity type for one document. */
export const MAX_VALUE_COMBINATIONS = 100;

export interface ResolvedActorAndTargets {
  /** EUID of the highest-ranked actor, if the document identifies one. */
  actorId?: string;
  /** EUIDs of every target found across all entity types, deduplicated, in rank order. */
  targetIds: string[];
}

type Source = Record<string, unknown>;

/** Non-empty values as strings, truncated so a huge multi-value field cannot blow up the product. */
const toValues = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value])
    .filter((item) => item !== undefined && item !== null && item !== '')
    .slice(0, MAX_VALUE_COMBINATIONS)
    .map(String);

/** Cartesian product of the per-field values: one single-valued record per combination. */
const expandCombinations = (
  fieldValues: Array<[string, string[]]>
): Array<Record<string, string>> =>
  fieldValues.reduce<Array<Record<string, string>>>(
    (combinations, [field, values]) =>
      values.length === 0
        ? combinations
        : combinations
            .flatMap((combination) => values.map((value) => ({ ...combination, [field]: value })))
            .slice(0, MAX_VALUE_COMBINATIONS),
    [{}]
  );

const readNamespace = (source: Source, fields: string[]): Source =>
  Object.fromEntries(
    fields.flatMap((field): Array<[string, unknown]> => {
      const value = get(source, field);
      return value === undefined || value === null || value === '' ? [] : [[field, value]];
    })
  );

/**
 * Resolves the EUIDs one entity type finds in `source`. `fieldPairs` maps the field name the
 * entity definition reads (`viewField`) to the document field that supplies its value.
 * `getEuidFromObjectForSearch` only reads the first element of an array, so multi-value fields
 * are expanded here and resolved one value at a time.
 */
const resolveEuidsForType = (
  euid: EntityStoreEuid,
  type: EntityType,
  source: Source,
  namespace: Source,
  fieldPairs: Array<[string, string]>
): string[] =>
  expandCombinations(
    fieldPairs.map(([viewField, sourceField]): [string, string[]] => [
      viewField,
      toValues(get(source, sourceField)),
    ])
  ).flatMap((combination) => {
    const id = euid.getEuidFromObjectForSearch(type, { ...namespace, ...combination });
    return id ? [id] : [];
  });

/**
 * Resolves, from a document's own fields, the actor (first match in the entity store's
 * `ALL_ENTITY_TYPES` order: user, host, service, generic, the same order the graph's ES|QL
 * resolution uses) and all targets the graph would show for it. Values that integrations compute
 * only in the graph's runtime ES|QL evaluations are not visible here.
 */
export const resolveActorAndTargets = (
  source: Source,
  euid: EntityStoreEuid
): ResolvedActorAndTargets => {
  const actorFields = getGraphActorEuidSourceFields(euid);
  const targetFields = getGraphTargetEuidSourceFields(euid);
  const namespace = readNamespace(source, actorFields.all);

  let actorId: string | undefined;
  for (const type of ALL_ENTITY_TYPES) {
    [actorId] = resolveEuidsForType(
      euid,
      type,
      source,
      namespace,
      actorFields[type].map((field): [string, string] => [field, field])
    );
    if (actorId) break;
  }

  const targetIds = ALL_ENTITY_TYPES.flatMap((type) =>
    resolveEuidsForType(
      euid,
      type,
      source,
      namespace,
      actorFields[type].map((field, index): [string, string] => [field, targetFields[type][index]])
    )
  );

  return { actorId, targetIds: [...new Set(targetIds)] };
};
