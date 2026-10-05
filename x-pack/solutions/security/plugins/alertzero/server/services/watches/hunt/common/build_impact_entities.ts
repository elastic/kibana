/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_IDS,
  MAX_ENTITY_NAME_LENGTH,
} from '@kbn/agentic-investigations-plugin/common';
import type {
  AttachmentEntityField,
  AttachmentEntityRef,
} from '../../../../../common/attachment_entity';

export type HuntImpactEntityType = 'host' | 'user';

export interface HuntImpactEntity {
  id: string;
  name: string;
  type: HuntImpactEntityType;
}

/**
 * Half of what one Investigation's merged impact may hold. Every sweep of a report merges onto
 * the same Investigation, and a merge past `MAX_ENTITY_IDS` is rejected whole, so leaving room
 * keeps a later sweep (or another writer) from being locked out by this one.
 */
export const MAX_HUNT_IMPACT_ENTITIES = MAX_ENTITY_IDS / 2;

/**
 * `service.name` is left out on purpose: the SSE mapper puts assumed-role and service-principal
 * identities there, which are not the services Impact's `service` type describes.
 */
const TYPE_BY_FIELD: Partial<Record<AttachmentEntityField, HuntImpactEntityType>> = {
  'host.name': 'host',
  'host.hostname': 'host',
  'user.name': 'user',
};

/**
 * The hosts and users this run's SSE entries name, as investigation impact entities.
 *
 * Ids use the `host:` / `user:` form the Alert Triage Worker uses. The hunt only collects names,
 * so a host Alert Triage keys by `host.id` shows up as a separate Impact pill. The value is cut so
 * the prefixed id fits the shared id limit: an over-long id would fail the whole attach.
 *
 * Entries keep the mapper's order (Tier 1 assets by hit count, alternating with Tier 2), so the
 * cap drops the lowest-priority entities.
 */
export const buildImpactEntities = (
  sse: ReadonlyArray<{ data: { entities: AttachmentEntityRef[] } }>
): HuntImpactEntity[] => {
  const byId = new Map<string, HuntImpactEntity>();

  for (const entry of sse) {
    for (const { field, value } of entry.data.entities) {
      const type = TYPE_BY_FIELD[field];
      if (!type) {
        continue;
      }
      const prefix = `${type}:`;
      const id = `${prefix}${value.slice(0, MAX_ENTITY_ID_LENGTH - prefix.length)}`;
      if (byId.has(id)) {
        continue;
      }
      byId.set(id, { id, name: value.slice(0, MAX_ENTITY_NAME_LENGTH), type });
      if (byId.size === MAX_HUNT_IMPACT_ENTITIES) {
        return [...byId.values()];
      }
    }
  }

  return [...byId.values()];
};
