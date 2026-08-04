/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import {
  getEuidCompositeQuery,
  getBaseScoreESQL,
  type EuidCompositeAggregation,
} from '../../calculate_esql_risk_scores';
import type { ParsedRiskScore } from './parse_esql_row';
import { parseEsqlBaseScoreRow } from './parse_esql_row';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import type { RiskScoreModifierEntity, ScoredEntityPage, StepResult } from './pipeline_types';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import type { ScopedLogger } from '../utils/with_log_context';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import { createMissingEntities as runCreateMissingEntities } from './create_missing_entities';

interface ScoreBaseEntitiesParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
  pageSize: number;
  sampleSize: number;
  now: string;
  watchlistConfigs: Map<string, WatchlistObject>;
  calculationRunId: string;
  abortSignal?: AbortSignal;
}

interface ScoreAndPersistBaseEntitiesParams extends ScoreBaseEntitiesParams {
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
  /**
   * Create-if-missing opt-in (`idBasedRiskScoringEnabled &&
   * xpack.securitySolution.entityAnalytics.riskEngine.createMissingEntities`, computed by the
   * caller, both default to enabling dual-write only). When false, scores for EUIDs absent from
   * the entity store are dropped, matching pre-existing behaviour.
   */
  createMissingEntities: boolean;
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
  /** When true, populate `scores` in the summary. Omit for full-population runs. */
  collectScores?: boolean;
}

export interface Phase1BaseScoringSummary extends StepResult {
  pagesProcessed: number;
  scoresWritten: number;
  scores: Record<string, number>;
  /** EUID-valid scores whose entity was created via the create-if-missing path. */
  entitiesCreated: number;
  /**
   * not_in_store scores dropped by the create-if-missing path (no representative alert document,
   * the creation policy rejected the candidate, or the bulk create itself failed). Always 0 when
   * `createMissingEntities` is false, since scores are dropped without evaluating a policy in
   * that case.
   */
  entitiesCreateRejected: number;
}

interface EuidPageBounds {
  lower: string | undefined;
  upper: string;
}

interface EuidPageResult {
  upperBound: string;
  afterKey: Record<string, string> | undefined;
}

/**
 * Streams base risk scores for one entity type, one page per yield.
 *
 * Each page: a composite aggregation over the alerts index (paginating by EUID
 * via a Painless runtime mapping) discovers the next page's upper-bound EUID,
 * then a single ES|QL query scores every alert in the half-open EUID range
 * `(previousUpper, currentUpper]`. The Phase-0 lookup index is unused here —
 * Phase 2 (resolution scoring) is its only reader.
 *
 * Modifier entities are fetched only for IDs that produced scores.
 */
export const calculateBaseEntityScores = async function* ({
  esClient,
  crudClient,
  logger,
  entityType,
  alertFilters,
  alertsIndex,
  pageSize,
  sampleSize,
  now,
  watchlistConfigs,
  calculationRunId,
  abortSignal,
}: ScoreBaseEntitiesParams): AsyncGenerator<ScoredEntityPage> {
  let afterKey: Record<string, string> | undefined;
  let previousPageUpperBound: string | undefined;

  do {
    if (abortSignal?.aborted) {
      logger.info('Base scoring aborted between pages');
      return;
    }

    const pageResult = await fetchNextEuidPage({
      esClient,
      entityType,
      alertFilters,
      alertsIndex,
      pageSize,
      afterKey,
    });
    if (!pageResult) {
      return;
    }

    afterKey = pageResult.afterKey;
    const scores = await scorePageFromAlerts({
      esClient,
      entityType,
      bounds: { lower: previousPageUpperBound, upper: pageResult.upperBound },
      sampleSize,
      pageSize,
      alertsIndex,
      alertFilters,
    });
    previousPageUpperBound = pageResult.upperBound;

    if (scores.length > 0) {
      const entities = await fetchEntitiesByIds({
        crudClient,
        entityIds: scores.map((score) => score.entity_id),
        logger,
        errorContext:
          'Error fetching entities for base modifier application. Base scoring will proceed without modifiers',
      });

      yield applyBaseScoreModifiers({
        scores,
        entities,
        now,
        entityType,
        calculationRunId,
        watchlistConfigs,
      });
    }
  } while (afterKey !== undefined);
};

export const scoreBaseEntities = async ({
  writer,
  idBasedRiskScoringEnabled,
  createMissingEntities: createMissingEntitiesEnabled,
  refresh,
  collectScores,
  ...params
}: ScoreAndPersistBaseEntitiesParams): Promise<Phase1BaseScoringSummary> => {
  let pagesProcessed = 0;
  let scoresWritten = 0;
  let entitiesCreated = 0;
  let entitiesCreateRejected = 0;
  const newScores: Record<string, number> = {};

  for await (const page of calculateBaseEntityScores(params)) {
    pagesProcessed += 1;
    // The composite aggregation discovers EUIDs from alerts, which can include
    // identifiers with no canonical store entity (host.id variations, synthetic
    // identifiers, alerts that name an entity the entity store has no record
    // of). Writing those to the risk index produces phantom score documents
    // that have no anchor on the entity, no place on the entity flyout, and
    // bloat trend graphs, so by default (and always for out-of-scope entity
    // types/policies) they're dropped, as the V1 maintainer did in
    // `categorizePhase1Entities`. When enabled, the create-if-missing path
    // (`createEntitiesFromSource`) re-evaluates each one against a real alert
    // document and creates it instead of dropping the score.
    const inStoreScores = page.scores.filter((score) => page.entities.has(score.id_value));
    const missingScores = page.scores.filter((score) => !page.entities.has(score.id_value));

    let riskIndexScores = inStoreScores;
    let entityStoreScores = inStoreScores;

    if (missingScores.length > 0) {
      if (createMissingEntitiesEnabled) {
        const createResult = await runCreateMissingEntities({
          esClient: params.esClient,
          crudClient: params.crudClient,
          entityType: params.entityType,
          alertsIndex: params.alertsIndex,
          alertFilters: params.alertFilters,
          logger: params.logger,
          missingScores,
        });

        entitiesCreated += createResult.created.length;
        entitiesCreateRejected += createResult.rejectedCount;

        const createdSet = new Set(createResult.created);
        const alreadyExistsSet = new Set(createResult.alreadyExists);
        // Created docs already carry entity.risk.* from createEntitiesFromSource, so only the
        // raced (already-exists) set needs the redundant entity-store update.
        const createdScores = missingScores.filter((score) => createdSet.has(score.id_value));
        const racedScores = missingScores.filter((score) => alreadyExistsSet.has(score.id_value));

        riskIndexScores = [...inStoreScores, ...createdScores, ...racedScores];
        entityStoreScores = [...inStoreScores, ...racedScores];

        params.logger.debug(
          `create-if-missing: created=${createdScores.length} alreadyExists=${racedScores.length} ` +
            `rejected=${createResult.rejectedCount} (of ${missingScores.length} not_in_store scores)`
        );
      } else {
        params.logger.debug(
          `dropped ${missingScores.length} not_in_store scores from page (kept ${inStoreScores.length})`
        );
      }
    }

    scoresWritten += await persistScoresToRiskIndex({
      writer,
      entityType: params.entityType,
      scores: riskIndexScores,
      logger: params.logger,
      refresh,
    });
    await persistScoresToEntityStore({
      crudClient: params.crudClient,
      logger: params.logger,
      entityType: params.entityType,
      scores: entityStoreScores,
      enabled: idBasedRiskScoringEnabled,
    });

    if (collectScores) {
      for (const score of riskIndexScores) {
        newScores[score.id_value] = score.calculated_score_norm;
      }
    }
  }

  return {
    pagesProcessed,
    scoresWritten,
    scores: newScores,
    entitiesCreated,
    entitiesCreateRejected,
  };
};

const fetchNextEuidPage = async ({
  esClient,
  entityType,
  alertFilters,
  alertsIndex,
  pageSize,
  afterKey,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
  pageSize: number;
  afterKey: Record<string, string> | undefined;
}): Promise<EuidPageResult | null> => {
  const compositeResponse = await esClient.search(
    getEuidCompositeQuery(entityType, alertFilters, {
      index: alertsIndex,
      pageSize,
      afterKey,
    })
  );

  const compositeAgg = (
    compositeResponse.aggregations as { by_entity_id?: EuidCompositeAggregation } | undefined
  )?.by_entity_id;
  const buckets = compositeAgg?.buckets ?? [];
  if (buckets.length === 0) {
    return null;
  }

  return {
    upperBound: buckets[buckets.length - 1].key.entity_id,
    afterKey: compositeAgg?.after_key,
  };
};

const scorePageFromAlerts = async ({
  esClient,
  entityType,
  bounds,
  sampleSize,
  pageSize,
  alertsIndex,
  alertFilters,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  bounds: EuidPageBounds;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
}): Promise<ParsedRiskScore[]> => {
  const query = getBaseScoreESQL(entityType, bounds, sampleSize, pageSize, alertsIndex);
  const esqlResponse = await esClient.esql.query({
    query,
    filter: { bool: { filter: alertFilters } },
  });

  return (esqlResponse.values ?? []).map(parseEsqlBaseScoreRow(alertsIndex));
};

const applyBaseScoreModifiers = ({
  scores,
  entities,
  now,
  entityType,
  calculationRunId,
  watchlistConfigs,
}: {
  scores: ParsedRiskScore[];
  entities: Map<string, RiskScoreModifierEntity>;
  now: string;
  entityType: EntityType;
  calculationRunId: string;
  watchlistConfigs: Map<string, WatchlistObject>;
}): ScoredEntityPage => {
  const finalScores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'base',
    calculationRunId,
    weights: [],
    page: {
      scores,
      identifierField: 'entity.id',
    },
    entities,
    watchlistConfigs,
  });

  return { entityIds: scores.map((score) => score.entity_id), scores: finalScores, entities };
};
