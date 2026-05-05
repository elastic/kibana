/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadEntity, Observation } from '../types';

/** Returns a stable string key for a LeadEntity: "type:name" */
export const entityToKey = (entity: LeadEntity): string => `${entity.type}:${entity.name}`;

/**
 * Creates an Observation, automatically filling entityId and moduleId.
 * Every builder in every module uses this to avoid boilerplate.
 */
export const makeObservation = (
  entity: LeadEntity,
  moduleId: string,
  fields: Omit<Observation, 'entityId' | 'moduleId'>
): Observation => ({ entityId: entityToKey(entity), moduleId, ...fields });

/** Reads the nested `entity` field common to all Entity Store V2 record types. */
export const getEntityField = (entity: LeadEntity): Record<string, unknown> | undefined =>
  (entity.record as Record<string, unknown>).entity as Record<string, unknown> | undefined;

/**
 * Watchlist ID prefix for privileged-user monitoring.
 * A space-scoped suffix may be appended (e.g. `...-default`),
 * so consumers should match with `startsWith`.
 */
export const PRIVILEGED_USER_WATCHLIST_ID = 'privileged-user-monitoring-watchlist-id';

/** Returns true if the entity is on a privileged-user monitoring watchlist. */
export const extractIsPrivileged = (entity: LeadEntity): boolean => {
  const attrs = getEntityField(entity)?.attributes as { watchlists?: string[] } | undefined;
  const watchlists = attrs?.watchlists;
  if (!Array.isArray(watchlists)) return false;
  return watchlists.some(
    (w) => typeof w === 'string' && w.startsWith(PRIVILEGED_USER_WATCHLIST_ID)
  );
};

/** Extracts the EUID (`entity.id`) from a LeadEntity record, e.g. `"host:InnoDB"`. */
export const getEntityId = (entity: LeadEntity): string | undefined =>
  (getEntityField(entity) as { id?: string } | undefined)?.id;

/** Capitalises the entity type for use in human-readable descriptions (e.g. "host" → "Host"). */
export const entityTypeLabel = (entity: LeadEntity): string =>
  entity.type.charAt(0).toUpperCase() + entity.type.slice(1);

/** Groups entities by their type field. */
export const groupEntitiesByType = (entities: LeadEntity[]): Map<string, LeadEntity[]> =>
  entities.reduce((map, e) => {
    const existing = map.get(e.type) ?? [];
    map.set(e.type, [...existing, e]);
    return map;
  }, new Map<string, LeadEntity[]>());
