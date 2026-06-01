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
 * Builds the Step 2 ES|QL override query for the administers maintainer.
 *
 * Assumption (this iteration): raw_identifiers.host.name contains the FQDN
 * (e.g. "workstation-01.corp.com"), allowing inline EUID construction as
 * CONCAT("host:", fqdn). No cross-entity lookup is required.
 *
 * Both user and host entities can be actors (AD managedObjects applies to both).
 * The query does not filter by entity.type so both are processed in one pass.
 * actorUserId is set to entity.id which already carries the full type-prefixed
 * EUID (e.g. "user:alice@corp.com" or "host:workstation-01.corp.com").
 *
 * Override column contract (required by parseTargetsPerActorRows):
 *   - actorUserId  — full actor EUID string
 *   - administers  — array of resolved target EUIDs
 *
 * Future iteration: when raw_identifiers.host.name contains only the bare CN
 * (e.g. "WORKSTATION-01"), replace the inline CONCAT with a LOOKUP JOIN against
 * host.hostname in the entity index.
 */
function buildAdministersEsqlQuery(namespace: string, lastProcessedTimestamp?: string): string {
  const entityIndex = getLatestEntityIndexPattern(namespace);
  const watermarkClause = lastProcessedTimestamp
    ? `\n    AND @timestamp > "${lastProcessedTimestamp}"`
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
      // Step 1 (composite agg actor discovery) queries the entity index.
      // Actors are entity documents (users or hosts), not raw log events.
      indexPattern: getLatestEntityIndexPattern,
      targetEntityType: 'host',
      relationshipKey: 'administers',
      // entity.id is present on every entity document regardless of type,
      // so Step 1 discovers both user and host actors. Without this, the
      // engine defaults to USER_IDENTITY_FIELDS (user.name, user.email, etc.)
      // which don't exist on host entity documents, producing 0 buckets.
      customActor: {
        fields: ['entity.id'],
      },
      compositeAggAdditionalFilters: [
        // Step 1: narrow to entities that actually have administers raw_identifiers.
        {
          exists: {
            field: 'entity.relationships.administers.raw_identifiers.host.name',
          },
        },
        // When a watermark exists, Step 1 also filters by @timestamp so it
        // surfaces only actors that changed since the last run.
        ...(lastProcessedTimestamp
          ? [{ range: { '@timestamp': { gt: lastProcessedTimestamp } } }]
          : []),
      ],
      esqlQueryOverride: (ns) => buildAdministersEsqlQuery(ns, lastProcessedTimestamp),
    },
  ];
}

// Static export for tests that don't need a watermark.
export const ADMINISTERS_INTEGRATION_RELATIONSHIP_CONFIGS = buildAdministersConfigs();
