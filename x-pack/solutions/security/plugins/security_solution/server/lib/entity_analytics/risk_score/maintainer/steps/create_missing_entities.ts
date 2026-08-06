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
  abortSignal?: AbortSignal;
}

/** EUID + reason, so logs and metrics can name the affected score's identifier. */
export interface CreateMissingEntitiesOutcome {
  euid: string;
  reason: string;
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
   * Scores never attempted because the creation policy would reject (or did reject) them:
   * `no_alert_document` (no representative alert document was found) or an
   * `EntityCreationRejectionReason` from `createEntitiesFromSource`.
   */
  skipped: CreateMissingEntitiesOutcome[];
  /**
   * Scores that were policy-eligible but didn't end up written: `euid_mismatch`,
   * `reserved_field`, or `bulk_create_failed` from `createEntitiesFromSource`.
   */
  failed: CreateMissingEntitiesOutcome[];
}

const NO_ALERT_DOCUMENT_REASON = 'no_alert_document';

const emptyResult = (): CreateMissingEntitiesResult => ({
  created: [],
  alreadyExists: [],
  skipped: [],
  failed: [],
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
    const source = alertDocs.get(score.id_value);
    if (source) {
      requests.push({
        type: entityType,
        source,
        expectedEntityId: score.id_value,
        createdBy: ENTITY_CREATED_BY.RiskScoreMaintainer,
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
