/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntityIndexPattern } from '@kbn/entity-store/common/domain/entity_index';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import type { RelationshipIntegrationConfig } from '../engine/types';

/**
 * Step 2 ES|QL override for the administers maintainer.
 *
 * Assumes raw_identifiers.host.name is the FQDN, so the target EUID is built
 * inline as CONCAT("host:", fqdn) with no cross-entity lookup. actorUserId =
 * entity.id (already type-prefixed), so user and host actors are handled in one
 * pass without filtering by entity.type.
 *
 * Required output columns (see parseTargetsPerActorRows): actorUserId, administers.
 *
 * Future: when raw_identifiers.host.name is a bare CN, replace the CONCAT with a
 * LOOKUP JOIN against host.hostname.
 */
function buildAdministersEsqlQuery(namespace: string, lastProcessedTimestamp?: string): string {
  const entityIndex = getLatestEntityIndexPattern(namespace);
  // Watermark on entity.lifecycle.last_seen (advances only on real activity), not
  // @timestamp (the entity index's transform write time, which churns unrelatedly).
  const watermarkClause = lastProcessedTimestamp
    ? `\n    AND entity.lifecycle.last_seen > "${lastProcessedTimestamp}"`
    : '';

  return `FROM ${entityIndex}
| WHERE entity.relationships.administers.raw_identifiers.host.name IS NOT NULL${watermarkClause}
| EVAL actorUserId = entity.id
| EVAL rawHostnames = entity.relationships.administers.raw_identifiers.host.name
| MV_EXPAND rawHostnames
| WHERE COALESCE(rawHostnames, "") != ""
| EVAL targetEntityId = CONCAT("host:", rawHostnames)
| STATS administers = VALUES(targetEntityId) BY actorUserId
| WHERE COALESCE(actorUserId, "") != ""
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

export function buildAdministersConfigs(
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig[] {
  return [
    {
      kind: 'override',
      id: 'entityanalytics_ad',
      name: 'Active Directory Entity Analytics',
      // Step 1 actor discovery reads the entity index (actors are entity docs,
      // users or hosts), not raw logs.
      indexPattern: getLatestEntityIndexPattern,
      targetEntityType: 'host',
      relationshipKey: 'administers',
      // Discover actors by entity.id (present on every entity). Without this the
      // engine defaults to USER_IDENTITY_FIELDS, which host entities lack → 0 buckets.
      customActor: {
        fields: ['entity.id'],
      },
      // Entity-index source: disable the engine's @timestamp now-30d lookback (a
      // log-index assumption that would drop entities) and gate on last_seen instead.
      disableLookbackWindow: true,
      compositeAggAdditionalFilters: [
        // Gate to entities with administers raw_identifiers. Match host.name OR
        // host.id so an actor whose DN parsed an id but no CN is still surfaced
        // (Step 2 resolves from host.name only).
        {
          bool: {
            should: [
              { exists: { field: 'entity.relationships.administers.raw_identifiers.host.name' } },
              { exists: { field: 'entity.relationships.administers.raw_identifiers.host.id' } },
            ],
            minimum_should_match: 1,
          },
        },
        // Watermark gate (last_seen, not @timestamp — see buildAdministersEsqlQuery).
        ...(lastProcessedTimestamp
          ? [{ range: { 'entity.lifecycle.last_seen': { gt: lastProcessedTimestamp } } }]
          : []),
      ],
      esqlQueryOverride: (ns) => buildAdministersEsqlQuery(ns, lastProcessedTimestamp),
    },
  ];
}

// Static export for tests that don't need a watermark.
export const ADMINISTERS_INTEGRATION_RELATIONSHIP_CONFIGS = buildAdministersConfigs();
