/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { getEntityType } from '../../../../common/entity_analytics/entity_store/sanitize_entity_record_for_upsert';
import { resolveDisplayName } from '../lead_generation/entity_conversion';
import { matchesPrivilegedWatchlist } from '../lead_generation/observation_modules/utils';
import type { EntityRef, EntityRefType } from './signals/types';

export const typeFromEuid = (euid: string): EntityRefType => {
  const [prefix] = euid.split(':');
  return prefix === 'user' || prefix === 'host' || prefix === 'service' ? prefix : 'generic';
};

/** Best-effort display name for an entity with no document in the store. */
export const nameFromEuid = (euid: string): string => {
  const separator = euid.indexOf(':');
  const body = separator === -1 ? euid : euid.slice(separator + 1);
  return typeFromEuid(euid) === 'user' ? body.split('@')[0] : body;
};

/** The record's entity type, or the EUID's when the record has no known type. */
export const entityTypeOf = (record: Entity, euid: string): EntityRefType => {
  try {
    return getEntityType(record);
  } catch {
    return typeFromEuid(euid);
  }
};

export const entityDisplayName = (record: Entity, euid: string): string =>
  resolveDisplayName(record, entityTypeOf(record, euid), euid);

export const toEntityRef = (record: Entity, euid: string): EntityRef => ({
  euid,
  type: entityTypeOf(record, euid),
  name: entityDisplayName(record, euid),
});

/** A record for an entity the store has no document for. */
export const minimalEntityRecord = ({ euid, type, name }: EntityRef): Entity => ({
  entity: { id: euid, name, type },
});

/** Whether the entity is privileged, and the other watchlists it is on. */
export const watchlistsOf = ({ entity }: Entity): { privileged: boolean; others: string[] } => {
  const watchlists = entity?.attributes?.watchlists ?? [];
  return {
    privileged: matchesPrivilegedWatchlist(watchlists),
    others: watchlists.filter((id) => !matchesPrivilegedWatchlist([id])),
  };
};
