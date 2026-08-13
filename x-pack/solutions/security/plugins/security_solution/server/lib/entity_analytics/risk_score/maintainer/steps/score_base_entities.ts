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

const BASE_SCORING_REQUEST_TIMEOUT = '5m';

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
  /** Explicit creation opt-in; also makes lookup failures fatal so they cannot be treated as misses. */
  createMissingEntities: boolean;
}

interface ScoreAndPersistBaseEntitiesParams extends ScoreBaseEntitiesParams {
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
  createMissingEntities: boolean;
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
  /** When true, populate `scores` in the summary. Omit for full-population runs. */
  collectScores?: boolean;
}

export interface Phase1BaseScoringSummary extends StepResult {
  pagesProcessed: number;
  scoresWrittenRiskIndex: number;
  scoresCalculated: number;
  /** Missing-at-lookup scores not recovered by creation; equals `scoresMissingFromStore` when disabled. */
  scoresDroppedNotInStore: number;
  scores: Record<string, number>;
  /** Scores absent at lookup time, including entities later created or found through a create race. */
  scoresMissingFromStore: number;
  /** EUID-valid scores whose entity was created via the create-if-missing path. */
  entitiesCreated: number;
  /** Missing scores not written because no alert was found or policy rejected them. */
  entityCreationsSkipped: number;
  /** Missing scores rejected by EUID/field validation or bulk creation. */
  entityCreationsFailed: number;
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
  createMissingEntities,
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
        strict: createMissingEntities,
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
  let scoresWrittenRiskIndex = 0;
  let scoresWrittenEntityStore = 0;
  let scoresCalculated = 0;
  let scoresDroppedNotInStore = 0;
  let scoresMissingFromStore = 0;
  let scoresFailed = 0;
  let entitiesCreated = 0;
  let entityCreationsSkipped = 0;
  let entityCreationsFailed = 0;
  const newScores: Record<string, number> = {};

  for await (const page of calculateBaseEntityScores({
    ...params,
    createMissingEntities: createMissingEntitiesEnabled,
  })) {
    pagesProcessed += 1;
    scoresCalculated += page.scores.length;
    // Scores without a canonical entity would create orphaned risk documents. Create eligible
    // entities from a representative alert when enabled; otherwise drop their scores.
    const inStoreScores = page.scores.filter((score) => page.entities.has(score.id_value));
    const missingScores = page.scores.filter((score) => !page.entities.has(score.id_value));
    scoresMissingFromStore += missingScores.length;

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
          abortSignal: params.abortSignal,
        });

        entitiesCreated += createResult.created.length;
        entityCreationsSkipped += createResult.skipped.length;
        entityCreationsFailed += createResult.failed.length;

        const createdSet = new Set(createResult.created);
        const alreadyExistsSet = new Set(createResult.alreadyExists);
        // Created docs already contain the score; raced docs still require an entity-store update.
        const createdScores = missingScores.filter((score) => createdSet.has(score.id_value));
        const racedScores = missingScores.filter((score) => alreadyExistsSet.has(score.id_value));

        riskIndexScores = [...inStoreScores, ...createdScores, ...racedScores];
        entityStoreScores = [...inStoreScores, ...racedScores];

        params.logger.debug(
          `create-if-missing: created=${createdScores.length} alreadyExists=${racedScores.length} ` +
            `skipped=${createResult.skipped.length} failed=${createResult.failed.length} ` +
            `(of ${missingScores.length} not_in_store scores)`
        );
      } else {
        params.logger.debug(
          `dropped ${missingScores.length} not_in_store scores from page (kept ${inStoreScores.length})`
        );
      }
    }

    scoresDroppedNotInStore += page.scores.length - riskIndexScores.length;

    scoresWrittenRiskIndex += await persistScoresToRiskIndex({
      writer,
      entityType: params.entityType,
      scores: riskIndexScores,
      logger: params.logger,
      refresh,
    });
    const { docsWritten, errorsCount } = await persistScoresToEntityStore({
      crudClient: params.crudClient,
      logger: params.logger,
      entityType: params.entityType,
      scores: entityStoreScores,
      enabled: idBasedRiskScoringEnabled,
    });
    scoresWrittenEntityStore += docsWritten;
    scoresFailed += errorsCount;

    if (collectScores) {
      for (const score of riskIndexScores) {
        newScores[score.id_value] = score.calculated_score_norm;
      }
    }
  }

  return {
    pagesProcessed,
    scoresWrittenRiskIndex,
    scoresWrittenEntityStore,
    scoresCalculated,
    scoresDroppedNotInStore,
    scoresMissingFromStore,
    scoresFailed,
    scores: newScores,
    entitiesCreated,
    entityCreationsSkipped,
    entityCreationsFailed,
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
    }),
    { requestTimeout: BASE_SCORING_REQUEST_TIMEOUT }
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
  const esqlResponse = await esClient.esql.query(
    {
      query,
      filter: { bool: { filter: alertFilters } },
    },
    { requestTimeout: BASE_SCORING_REQUEST_TIMEOUT }
  );

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
