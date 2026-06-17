/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntityIndexPattern } from '@kbn/entity-store/common/domain/entity_index';
import type { RelationshipIntegrationConfig } from '../engine/types';
import {
  buildRawIdentifiersEsqlQuery,
  buildRawIdentifiersExistenceGate,
  type DirectEuidRule,
} from '../engine/build_raw_identifiers_query';

const RELATIONSHIP_KEY = 'administers';

/**
 * Active Directory's directly-constructible administers identifiers.
 *
 * AD populates raw_identifiers.host.name with the FQDN (a host EUID basis) and
 * raw_identifiers.host.id with the LDAP DN. Only host.name is listed here —
 * host.id (a DN) is NOT a valid host EUID and would resolve to a dangling
 * `host:CN=…` (it needs a LOOKUP JOIN in the log index).
 */
const AD_ADMINISTERS_RULES: DirectEuidRule[] = [{ field: 'host.name', euidType: 'host' }];

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
      relationshipKey: RELATIONSHIP_KEY,
      // Discover actors by entity.id (present on every entity). Without this the
      // engine defaults to USER_IDENTITY_FIELDS, which host entities lack → 0 buckets.
      customActor: {
        fields: ['entity.id'],
      },
      // Entity-index source: disable the engine's @timestamp now-30d lookback (a
      // log-index assumption that would drop entities) and gate on last_seen instead.
      disableLookbackWindow: true,
      compositeAggAdditionalFilters: [
        // Gate to entities with administers raw_identifiers.* match host.name
        // (Step 2 resolves from host.name only).
        buildRawIdentifiersExistenceGate({
          relationshipKey: RELATIONSHIP_KEY,
          fields: ['host.name'],
        }),
        // Watermark gate (last_seen, not @timestamp — see buildRawIdentifiersEsqlQuery).
        ...(lastProcessedTimestamp
          ? [{ range: { 'entity.lifecycle.last_seen': { gt: lastProcessedTimestamp } } }]
          : []),
      ],
      esqlQueryOverride: (ns) =>
        buildRawIdentifiersEsqlQuery({
          relationshipKey: RELATIONSHIP_KEY,
          rules: AD_ADMINISTERS_RULES,
          namespace: ns,
          lastProcessedTimestamp,
        }),
    },
  ];
}

// Static export for tests that don't need a watermark.
export const ADMINISTERS_INTEGRATION_RELATIONSHIP_CONFIGS = buildAdministersConfigs();
