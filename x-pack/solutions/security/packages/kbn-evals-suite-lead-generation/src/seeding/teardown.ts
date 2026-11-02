/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  getEntitiesAlias,
  ENTITY_LATEST,
  ENTITY_METADATA,
  RELATIONSHIP_KINDS,
} from '@kbn/entity-store/common';
import { getAlertsIndex } from '@kbn/security-solution-plugin/common/entity_analytics/utils';
import { getRiskScoreTimeSeriesIndex } from '@kbn/security-solution-plugin/common/entity_analytics/risk_engine/indices';
import { getLeadsIndexName } from '@kbn/security-solution-plugin/common/entity_analytics/lead_generation/constants';
import { getHistorySnapshotIndexPattern } from '@kbn/entity-store/server/domain/asset_manager/history_snapshot_index';

const ENTITY_TYPES = ['host', 'user', 'service'] as const;

const deleteByQuerySafe = async (
  esClient: Client,
  index: string,
  query: QueryDslQueryContainer
): Promise<void> => {
  await esClient
    .deleteByQuery({
      index,
      query,
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    })
    .catch(() => {
      // Index may not exist yet — nothing to clean up.
    });
};

export const cleanupSeededEntities = async ({
  esClient,
  namespace = 'default',
  euids,
}: {
  esClient: Client;
  namespace?: string;
  euids: readonly string[];
}): Promise<void> => {
  if (euids.length === 0) return;

  await deleteByQuerySafe(esClient, getEntitiesAlias(ENTITY_LATEST, namespace), {
    terms: { 'entity.id': [...euids] },
  });

  await deleteByQuerySafe(esClient, getEntitiesAlias(ENTITY_METADATA, namespace), {
    bool: {
      should: [
        { terms: { 'entity.id': [...euids] } },
        ...RELATIONSHIP_KINDS.map((kind) => ({
          terms: { [`entity.relationships.${kind}.target`]: [...euids] },
        })),
      ],
      minimum_should_match: 1,
    },
  });
};

const namesFromEuids = (euids: readonly string[]): string[] =>
  euids.map((euid) => euid.split(':').slice(1).join(':')).filter((name) => name.length > 0);

export const cleanupSeededAlerts = async ({
  esClient,
  spaceId = 'default',
  euids,
}: {
  esClient: Client;
  spaceId?: string;
  euids: readonly string[];
}): Promise<void> => {
  const names = namesFromEuids(euids);
  if (names.length === 0) return;

  await deleteByQuerySafe(esClient, getAlertsIndex(spaceId), {
    bool: {
      should: ENTITY_TYPES.map((type) => ({ terms: { [`${type}.name`]: names } })),
      minimum_should_match: 1,
    },
  });
};

export const cleanupSeededRiskScoreHistory = async ({
  esClient,
  spaceId = 'default',
  euids,
}: {
  esClient: Client;
  spaceId?: string;
  euids: readonly string[];
}): Promise<void> => {
  if (euids.length === 0) return;

  await deleteByQuerySafe(esClient, getRiskScoreTimeSeriesIndex(spaceId), {
    bool: {
      should: ENTITY_TYPES.map((type) => ({
        terms: { [`${type}.risk.id_value`]: [...euids] },
      })),
      minimum_should_match: 1,
    },
  });
};

export const cleanupSeededLeads = async ({
  esClient,
  spaceId = 'default',
  euids,
}: {
  esClient: Client;
  spaceId?: string;
  euids: readonly string[];
}): Promise<void> => {
  if (euids.length === 0) return;

  await deleteByQuerySafe(esClient, getLeadsIndexName(spaceId), {
    terms: { 'entity.id': [...euids] },
  });
};

export const cleanupSeededHistorySnapshots = async ({
  esClient,
  namespace = 'default',
  euids,
}: {
  esClient: Client;
  namespace?: string;
  euids: readonly string[];
}): Promise<void> => {
  if (euids.length === 0) return;

  await deleteByQuerySafe(esClient, getHistorySnapshotIndexPattern(namespace), {
    terms: { 'entity.id': [...euids] },
  });
};

/**
 * Deletes all seeded data (entities, relationship metadata, alerts,
 * risk-score history, history snapshots, and leads) for the given EUIDs
 */
export const cleanupAllSeededData = async ({
  esClient,
  namespace = 'default',
  spaceId = namespace,
  euids,
}: {
  esClient: Client;
  namespace?: string;
  spaceId?: string;
  euids: readonly string[];
}): Promise<void> => {
  await Promise.all([
    cleanupSeededEntities({ esClient, namespace, euids }),
    cleanupSeededAlerts({ esClient, spaceId, euids }),
    cleanupSeededRiskScoreHistory({ esClient, spaceId, euids }),
    cleanupSeededHistorySnapshots({ esClient, namespace, euids }),
    cleanupSeededLeads({ esClient, spaceId, euids }),
  ]);
};
