/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient, CreateEntityFromSourceRequest } from '@kbn/entity-store/server';
import { ENTITY_CREATED_BY } from '@kbn/entity-store/common/domain/definitions/common_fields';
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
  abortSignal?: AbortSignal;
}

export interface CreateMissingEntitiesOutcome {
  euid: string;
  reason: string;
}

export interface CreateMissingEntitiesResult {
  /** Newly created EUIDs; their documents already include `entity.risk.*`. */
  created: string[];
  /** EUIDs that lost a create race and must use the normal update path. */
  alreadyExists: string[];
  /** Scores with no representative alert or rejected by policy; neither reached Elasticsearch. */
  skipped: CreateMissingEntitiesOutcome[];
  /** Requests rejected by EUID/field validation or bulk creation. */
  failed: CreateMissingEntitiesOutcome[];
}

const NO_ALERT_DOCUMENT_REASON = 'no_alert_document';

const emptyResult = (): CreateMissingEntitiesResult => ({
  created: [],
  alreadyExists: [],
  skipped: [],
  failed: [],
});

/** Revalidates missing score EUIDs against representative alerts because base scoring omits `postAggFilter`, then attempts policy-gated creation. */
export const createMissingEntities = async ({
  esClient,
  crudClient,
  entityType,
  alertsIndex,
  alertFilters,
  logger,
  missingScores,
  abortSignal,
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
    abortSignal,
  });

  const requests: CreateEntityFromSourceRequest[] = [];
  for (const score of missingScores) {
    const alertDoc = alertDocs.get(score.id_value);
    if (alertDoc) {
      requests.push({
        type: entityType,
        source: alertDoc.source,
        expectedEntityId: score.id_value,
        createdBy: ENTITY_CREATED_BY.RiskScoreMaintainer,
        firstSeen: alertDoc.firstSeen,
        fields: {
          'entity.risk.calculated_level': score.calculated_level,
          'entity.risk.calculated_score': score.calculated_score,
          'entity.risk.calculated_score_norm': score.calculated_score_norm,
        },
      });
    } else {
      result.skipped.push({ euid: score.id_value, reason: NO_ALERT_DOCUMENT_REASON });
    }
  }

  if (requests.length === 0) {
    return result;
  }

  logger.debug(
    `create-if-missing: attempting to create ${requests.length} of ${missingScores.length} ` +
      `not_in_store scores (${result.skipped.length} had no representative alert document)`
  );

  const { created, alreadyExists, skipped, failed } = await crudClient.createEntitiesFromSource(
    requests
  );

  result.created.push(...created);
  result.alreadyExists.push(...alreadyExists);
  result.skipped.push(...skipped);
  result.failed.push(...failed);

  if (skipped.length > 0 || failed.length > 0) {
    logger.debug(
      `create-if-missing: creation policy skipped ${skipped.length} and failed ${failed.length} ` +
        `candidate(s): ${JSON.stringify([...skipped, ...failed])}`
    );
  }

  return result;
};
