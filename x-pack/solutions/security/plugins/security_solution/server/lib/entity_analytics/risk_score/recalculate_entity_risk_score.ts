/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import Boom from '@hapi/boom';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { DEFAULT_RISK_SCORE_PAGE_SIZE } from '../../../../common/constants';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { getConfiguration } from '../risk_engine/utils/saved_object_configuration';
import { getRiskInputsIndex } from './get_risk_inputs_index';
import { buildAlertFilters } from './maintainer/steps/build_alert_filters';
import { getLookupIndexName } from './maintainer/lookup/lookup_index';
import { persistZeroBaseScore, scoreBaseEntities } from './maintainer/steps/score_base_entities';
import { runResolutionScoringStep } from './maintainer/steps/run_resolution_scoring_step';
import { fetchWatchlistConfigs } from './maintainer/utils/fetch_watchlist_configs';
import type { RiskEngineDataWriter } from './risk_engine_data_writer';
import type { RiskEngineConfiguration } from '../types';

export interface RecalculateEntityRiskScoreParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  crudClient: EntityStoreCRUDClient;
  namespace: string;
  entityId: string;
  identifierType: string;
  /**
   * Factory called to obtain the risk score data writer.
   * Callers are responsible for constructing the writer from their own context
   * (e.g., from securityContext.getRiskScoreDataClient() in HTTP handlers, or
   * from a fresh RiskScoreDataClient instance in non-HTTP contexts such as tools).
   */
  getWriter: (namespace: string) => Promise<RiskEngineDataWriter>;
  /**
   * Whether id-based risk scoring (Entity Store V2) is enabled.
   * HTTP route callers can derive this from getIsIdBasedRiskScoringEnabled().
   */
  idBasedRiskScoringEnabled: boolean;
  logger: Logger;
  alertSampleSizePerShard?: number;
  collectScores?: boolean;
}

/**
 * Entity Store V2 only
 * Recalculates the risk score for a single entity on demand
 */
export const recalculateEntityRiskScore = async ({
  esClient,
  soClient,
  crudClient,
  namespace,
  entityId,
  identifierType,
  getWriter,
  idBasedRiskScoringEnabled,
  logger,
  alertSampleSizePerShard = 10000,
  collectScores = false,
}: RecalculateEntityRiskScoreParams) => {
  const engineConfig = await getConfiguration({
    savedObjectsClient: soClient,
    logger,
    namespace,
  });

  if (!engineConfig) {
    throw Boom.badRequest('No Risk engine configuration found');
  }

  const scoringContext = await buildScoringContext({
    entityId,
    identifierType,
    engineConfig,
    logger,
    crudClient,
  });

  if (!scoringContext) {
    throw Boom.badRequest(`Entity not found in store: ${entityId}`);
  }

  const { alertFilters, resolutionTargetId, hasExistingBaseScore } = scoringContext;

  const { dataViewId } = engineConfig;
  const pageSize = engineConfig.pageSize ?? DEFAULT_RISK_SCORE_PAGE_SIZE;
  const sampleSize = engineConfig.alertSampleSizePerShard ?? alertSampleSizePerShard;

  const { index: alertsIndex } = await getRiskInputsIndex({ dataViewId, logger, soClient });
  const writer = await getWriter(namespace);
  const watchlistConfigs = await fetchWatchlistConfigs({ soClient, esClient, namespace, logger });
  const lookupIndex = getLookupIndexName(namespace);
  const calculationRunId = uuidv4();
  const now = new Date().toISOString();

  const { scores: baseScores, scoresCalculated } = await scoreBaseEntities({
    esClient,
    crudClient,
    logger,
    entityType: identifierType as EntityType,
    alertFilters,
    alertsIndex,
    pageSize,
    sampleSize,
    now,
    watchlistConfigs,
    calculationRunId,
    writer,
    idBasedRiskScoringEnabled,
    // The entity was already confirmed to exist in buildScoringContext above, so there's nothing
    // for create-if-missing to do here.
    createMissingEntities: false,
    refresh: 'wait_for',
    collectScores,
  });

  // The alerts are filtered down to this one entity, so nothing calculated means it has no alert
  // in the engine's range. Write a zero score so the entity's current criticality and watchlists
  // land on a fresh document. Two conditions on purpose:
  //  - `scoresCalculated`, not the written count, which is also 0 when a write fails. Zeroing
  //    then would drop the score of an entity that does have alerts.
  //  - only for entities that already have a score, since writing one for an entity that was
  //    never scored would put a 0 on screen where there was nothing before.
  if (scoresCalculated === 0 && hasExistingBaseScore) {
    await persistZeroBaseScore({
      crudClient,
      logger,
      entityType: identifierType as EntityType,
      entityId,
      now,
      watchlistConfigs,
      calculationRunId,
      writer,
      idBasedRiskScoringEnabled,
      refresh: 'wait_for',
    });
  }

  const { scores: resolutionScores } = await runResolutionScoringStep({
    esClient,
    crudClient,
    logger,
    entityType: identifierType as EntityType,
    alertsIndex,
    lookupIndex,
    pageSize,
    sampleSize,
    now,
    calculationRunId,
    watchlistConfigs,
    idBasedRiskScoringEnabled,
    writer,
    targetEntityIds: [resolutionTargetId],
    refresh: 'wait_for',
    collectScores: true,
  });

  return {
    baseScore: entityId in baseScores ? baseScores[entityId] : undefined,
    resolutionScore:
      resolutionTargetId in resolutionScores ? resolutionScores[resolutionTargetId] : undefined,
  };
};

async function buildScoringContext({
  entityId,
  identifierType,
  engineConfig,
  logger,
  crudClient,
}: {
  entityId: string;
  identifierType: string;
  engineConfig: RiskEngineConfiguration;
  logger: Logger;
  crudClient: EntityStoreCRUDClient;
}) {
  const baseAlertFilters = buildAlertFilters(engineConfig, identifierType as EntityType, logger);

  const { entities } = await crudClient.listEntities({
    filter: { term: { 'entity.id': entityId } },
    size: 1,
  });

  if (entities.length === 0) {
    return;
  }

  const entityDoc = entities[0];
  const entityIdentityFilter = euid.dsl.getEuidFilterBasedOnDocument(
    identifierType as EntityType,
    entityDoc
  );

  return {
    alertFilters: [...baseAlertFilters, entityIdentityFilter],
    resolutionTargetId: entityDoc?.entity?.relationships?.resolution?.resolved_to ?? entityId,
    // Risk scoring dual-writes the base score here, so a value means the entity has been scored
    // before and its score document is worth refreshing.
    hasExistingBaseScore: typeof entityDoc?.entity?.risk?.calculated_score_norm === 'number',
  };
}
