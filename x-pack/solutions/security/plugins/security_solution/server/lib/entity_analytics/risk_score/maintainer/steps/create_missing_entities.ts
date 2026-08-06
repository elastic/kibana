/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient, CreateEntityFromSourceRequest } from '@kbn/entity-store/server';
import { ENTITY_CREATED_BY } from '@kbn/entity-store/common';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import { fetchAlertIdentityDocs } from '../utils/fetch_alert_identity_docs';
import type { ScopedLogger } from '../utils/with_log_context';

interface CreateMissingEntitiesParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  entityType: EntityType;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
  logger: ScopedLogger;
  /** Base scores whose `id_value` had no entity store record as of `fetchEntitiesByIds`. */
  missingScores: EntityRiskScoreRecord[];
}

export interface CreateMissingEntitiesResult {
  /**
   * EUIDs newly created. Their create document already carries `entity.risk.*`, so callers
   * should route their scores to the risk index but skip the redundant entity-store update.
   */
  created: string[];
  /**
   * EUIDs that already existed by the time the bulk create ran (raced with another creator,
   * e.g. logs extraction). Callers should fall back to the normal update path for these.
   */
  alreadyExists: string[];
  /**
   * Total scores dropped: no representative alert document, the creation policy rejected them,
   * or the bulk create itself failed.
   */
  rejectedCount: number;
  /**
   * Rejection counts by reason, for telemetry (`no_alert_document`, policy rejection reasons, or
   * `bulk_create_failed`).
   */
  rejectedByReason: Record<string, number>;
}

const NO_ALERT_DOCUMENT_REASON = 'no_alert_document';

const emptyResult = (): CreateMissingEntitiesResult => ({
  created: [],
  alreadyExists: [],
  rejectedCount: 0,
  rejectedByReason: {},
});

/**
 * Create-if-missing path for base scoring: for EUID-valid scores with no entity store record,
 * fetch a representative alert document per EUID and attempt a policy-gated create instead of
 * silently dropping the score (see `creatable_from_document.ts` in the entity_store plugin).
 *
 * The maintainer's own EUID can't be trusted for gating (the ES|QL base-scoring query applies
 * only `documentsFilter`, not `postAggFilter`), so this re-derives everything from a real source
 * document via `fetchAlertIdentityDocs` + `createEntitiesFromSource`.
 */
export const createMissingEntities = async ({
  esClient,
  crudClient,
  entityType,
  alertsIndex,
  alertFilters,
  logger,
  missingScores,
}: CreateMissingEntitiesParams): Promise<CreateMissingEntitiesResult> => {
  if (missingScores.length === 0) {
    return emptyResult();
  }

  const result = emptyResult();
  const euids = missingScores.map((score) => score.id_value);
  const alertDocs = await fetchAlertIdentityDocs({
    esClient,
    entityType,
    alertsIndex,
    alertFilters,
    euids,
    logger,
  });

  const requests: CreateEntityFromSourceRequest[] = [];
  for (const score of missingScores) {
    const source = alertDocs.get(score.id_value);
    if (source) {
      requests.push({
        type: entityType,
        source,
        createdBy: ENTITY_CREATED_BY.RiskScoreMaintainer,
        fields: {
          'entity.risk.calculated_level': score.calculated_level,
          'entity.risk.calculated_score': score.calculated_score,
          'entity.risk.calculated_score_norm': score.calculated_score_norm,
        },
      });
    } else {
      result.rejectedCount += 1;
      result.rejectedByReason[NO_ALERT_DOCUMENT_REASON] =
        (result.rejectedByReason[NO_ALERT_DOCUMENT_REASON] ?? 0) + 1;
    }
  }

  if (requests.length === 0) {
    return result;
  }

  logger.debug(
    `create-if-missing: attempting to create ${requests.length} of ${missingScores.length} ` +
      `not_in_store scores (${result.rejectedCount} had no representative alert document)`
  );

  const { created, alreadyExists, rejected } = await crudClient.createEntitiesFromSource(requests);

  result.created.push(...created);
  result.alreadyExists.push(...alreadyExists);
  result.rejectedCount += rejected.length;
  for (const { reason } of rejected) {
    result.rejectedByReason[reason] = (result.rejectedByReason[reason] ?? 0) + 1;
  }

  if (rejected.length > 0) {
    logger.debug(
      `create-if-missing: creation policy rejected ${rejected.length} candidate(s): ` +
        `${JSON.stringify(result.rejectedByReason)}`
    );
  }

  return result;
};
