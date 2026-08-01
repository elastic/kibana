/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { get } from 'lodash/fp';
import type { DataTableRecord } from '@kbn/discover-utils';

export const ATTACK_DISCOVERY_ENTITIES_FIELD = 'kibana.alert.attack_discovery.entities';
export const ATTACK_DISCOVERY_OBSERVABLE_ENTITIES_FIELD =
  'kibana.alert.attack_discovery.observable_entities';

export type PersistedAttackEntityType = 'host' | 'user' | 'service';

const PERSISTED_ENTITY_TYPES: readonly PersistedAttackEntityType[] = ['host', 'user', 'service'];

/**
 * One correlated Entity Store entity persisted on the attack discovery alert document
 * (written by the correlateEntities workflow step).
 */
export interface PersistedAttackEntity {
  /** Canonical EUID, e.g. `user:jane@acme.com@okta` or `host:HW-UUID` */
  id: string;
  type: PersistedAttackEntityType;
}

/**
 * One extracted-but-unmatched observable value persisted on the attack discovery alert document.
 */
export interface AttackObservableEntity {
  /** Observable type key, e.g. `observable-type-ipv4` */
  typeKey: string;
  value: string;
}

export interface UsePersistedAttackEntitiesResult {
  /**
   * Entities persisted on the document. `undefined` when the field is absent (older documents
   * generated before entity correlation) — callers must fall back to the aggregation path.
   * An empty array means correlation ran and found no entities.
   */
  persistedEntities: PersistedAttackEntity[] | undefined;
  /** Unmatched observable values persisted on the document. Empty when the field is absent. */
  observableEntities: AttackObservableEntity[];
}

/**
 * Alert documents usually store dotted keys at the top level of `_source`, but tolerate the
 * fully-nested shape too.
 */
const readSourceField = (source: Record<string, unknown>, path: string): unknown =>
  path in source ? source[path] : get(path, source);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

export const parsePersistedEntities = (value: unknown): PersistedAttackEntity[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entities: PersistedAttackEntity[] = [];
  for (const item of value) {
    if (
      isRecord(item) &&
      typeof item.id === 'string' &&
      item.id !== '' &&
      PERSISTED_ENTITY_TYPES.includes(item.type as PersistedAttackEntityType)
    ) {
      entities.push({ id: item.id, type: item.type as PersistedAttackEntityType });
    }
  }
  return entities;
};

export const parseObservableEntities = (value: unknown): AttackObservableEntity[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const observables: AttackObservableEntity[] = [];
  for (const item of value) {
    if (
      isRecord(item) &&
      typeof item.type_key === 'string' &&
      item.type_key !== '' &&
      typeof item.value === 'string' &&
      item.value !== ''
    ) {
      observables.push({ typeKey: item.type_key, value: item.value });
    }
  }
  return observables;
};

/**
 * Reads the entity-correlation fields persisted on an attack discovery alert document.
 * Reads from `hit.raw._source` because the nested array-of-objects shape is preserved there
 * (`hit.flattened` breaks arrays of objects into parallel leaf arrays).
 */
export const usePersistedAttackEntities = (
  hit: DataTableRecord
): UsePersistedAttackEntitiesResult => {
  const source = hit.raw._source as Record<string, unknown> | undefined;

  return useMemo(() => {
    if (source == null || !isRecord(source)) {
      return { persistedEntities: undefined, observableEntities: [] };
    }
    return {
      persistedEntities: parsePersistedEntities(
        readSourceField(source, ATTACK_DISCOVERY_ENTITIES_FIELD)
      ),
      observableEntities: parseObservableEntities(
        readSourceField(source, ATTACK_DISCOVERY_OBSERVABLE_ENTITIES_FIELD)
      ),
    };
  }, [source]);
};
