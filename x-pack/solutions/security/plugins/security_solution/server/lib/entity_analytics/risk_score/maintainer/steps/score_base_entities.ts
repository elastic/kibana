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
import {
  getStampedEuidCompositeQuery,
  getStampedEuidRangeFilter,
  getUnstampedAlertsCountQuery,
} from '../../stamping_queries';
import { RISK_SCORING_REQUEST_TIMEOUT } from '../../constants';
import type { ParsedRiskScore } from './parse_esql_row';
import { parseEsqlBaseScoreRow } from './parse_esql_row';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import type { RiskScoreModifierEntity, ScoredEntityPage, StepResult } from './pipeline_types';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import type { EsqlPageProfileSummary } from '../instrumentation/esql_page_profile';
import { summarizeEsqlPage } from '../instrumentation/esql_page_profile';
import type { PageStepTimings } from '../instrumentation/page_timing_types';
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
  /** Explicit creation opt-in; also makes lookup failures fatal so they cannot be treated as misses. */
  createMissingEntities: boolean;
  /** Stage-owned collector shared across scoring and persistence, including failed pages. */
  pageTimings: PageStepTimings;
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
 * Each page: a composite aggregation over the alerts index (paginating by EUID)
 * discovers the next page's upper-bound EUID, then a single ES|QL query scores
 * every alert in the half-open EUID range `(previousUpper, currentUpper]`. The
 * Phase-0 lookup index is unused here — Phase 2 (resolution scoring) is its only reader.
 *
 * When every in-scope alert carries a stamped EUID for this type, pages come from the stamped field
 * and each scoring query reads only its page's alerts. Otherwise a Painless runtime mapping derives
 * the EUIDs of the alerts without one, which runs over every alert on every page.
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
  pageTimings,
}: ScoreBaseEntitiesParams): AsyncGenerator<ScoredEntityPage> {
  let afterKey: Record<string, string> | undefined;
  let previousPageUpperBound: string | undefined;

  const stamped = await allAlertsStamped({ esClient, entityType, alertFilters, alertsIndex });
  pageTimings.setStamped(stamped);
  logger.debug(
    stamped
      ? 'base scoring pages by stamped entity IDs'
      : 'base scoring pages by derived entity IDs: some alerts have no stamped entity ID'
  );

  do {
    if (abortSignal?.aborted) {
      logger.info('Base scoring aborted between pages');
      return;
    }

    pageTimings.startPage();
    const pageResult = await pageTimings.time(['discovery'], () =>
      fetchNextEuidPage({
        esClient,
        entityType,
        alertFilters,
        alertsIndex,
        pageSize,
        afterKey,
        stamped,
      })
    );
    if (!pageResult) {
      pageTimings.dropPage();
      return;
    }

    afterKey = pageResult.afterKey;
    const { scores, profileSummary } = await scorePageFromAlerts({
      esClient,
      entityType,
      bounds: { lower: previousPageUpperBound, upper: pageResult.upperBound },
      sampleSize,
      pageSize,
      alertsIndex,
      alertFilters,
      stamped,
      profile: pageTimings.shouldProfile(),
      pageTimings,
    });
    previousPageUpperBound = pageResult.upperBound;
    if (profileSummary) {
      pageTimings.recordProfile(profileSummary);
    }

    if (scores.length > 0) {
      const entities = await pageTimings.time(['entity', 'fetch'], () =>
        fetchEntitiesByIds({
          onError: () => pageTimings.count('entityFetchFailures', 1),
          crudClient,
          entityIds: scores.map((score) => score.entity_id),
          logger,
          errorContext:
            'Error fetching entities for base modifier application. Base scoring will proceed without modifiers',
          strict: createMissingEntities,
        })
      );

      yield pageTimings.timeSync(['modifiers'], () =>
        applyBaseScoreModifiers({
          scores,
          entities,
          now,
          entityType,
          calculationRunId,
          watchlistConfigs,
        })
      );
    }
  } while (afterKey !== undefined);
};

export const scoreBaseEntities = async ({
  writer,
  idBasedRiskScoringEnabled,
  createMissingEntities: createMissingEntitiesEnabled,
  refresh,
  collectScores,
  pageTimings,
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
    pageTimings,
  })) {
    pagesProcessed += 1;
    pageTimings.count('pagesProcessed', 1);
    scoresCalculated += page.scores.length;
    pageTimings.count('scoresCalculated', page.scores.length);
    // Scores without a canonical entity would create orphaned risk documents. Create eligible
    // entities from a representative alert when enabled; otherwise drop their scores.
    const inStoreScores = page.scores.filter((score) => page.entities.has(score.id_value));
    const missingScores = page.scores.filter((score) => !page.entities.has(score.id_value));
    scoresMissingFromStore += missingScores.length;
    pageTimings.count('scoresMissingFromStore', missingScores.length);

    let riskIndexScores = inStoreScores;
    let entityStoreScores = inStoreScores;

    if (missingScores.length > 0) {
      if (createMissingEntitiesEnabled) {
        const createResult = await pageTimings.time(['entity', 'create'], () =>
          runCreateMissingEntities({
            esClient: params.esClient,
            crudClient: params.crudClient,
            entityType: params.entityType,
            alertsIndex: params.alertsIndex,
            alertFilters: params.alertFilters,
            logger: params.logger,
            missingScores,
            abortSignal: params.abortSignal,
          })
        );

        entitiesCreated += createResult.created.length;
        pageTimings.count('entitiesCreated', createResult.created.length);
        entityCreationsSkipped += createResult.skipped.length;
        pageTimings.count('entityCreationsSkipped', createResult.skipped.length);
        entityCreationsFailed += createResult.failed.length;
        pageTimings.count('entityCreationsFailed', createResult.failed.length);

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
    pageTimings.count('scoresDroppedNotInStore', page.scores.length - riskIndexScores.length);

    scoresWrittenRiskIndex += await persistScoresToRiskIndex({
      writer,
      entityType: params.entityType,
      scores: riskIndexScores,
      logger: params.logger,
      refresh,
      pageTimings,
    });
    const { docsWritten, errorsCount } = await pageTimings.time(['store', 'write'], () =>
      persistScoresToEntityStore({
        crudClient: params.crudClient,
        logger: params.logger,
        entityType: params.entityType,
        scores: entityStoreScores,
        enabled: idBasedRiskScoringEnabled,
      })
    );
    pageTimings.count('storeDocumentsWritten', docsWritten);
    pageTimings.count('storeWriteFailures', errorsCount);
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

/**
 * Whether every in-scope alert that could resolve to an entity of this type carries a stamped
 * EUID for it, so pages can come from the stamped field. Checked once per run: alerts written
 * after the check are scored by the next run.
 */
const allAlertsStamped = async ({
  esClient,
  entityType,
  alertFilters,
  alertsIndex,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
}): Promise<boolean> => {
  const { count } = await esClient.count(
    getUnstampedAlertsCountQuery(entityType, alertFilters, alertsIndex),
    { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
  );
  return count === 0;
};

const fetchNextEuidPage = async ({
  esClient,
  entityType,
  alertFilters,
  alertsIndex,
  pageSize,
  afterKey,
  stamped,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
  pageSize: number;
  afterKey: Record<string, string> | undefined;
  stamped: boolean;
}): Promise<EuidPageResult | null> => {
  const compositeParams = { index: alertsIndex, pageSize, afterKey };
  const compositeResponse = await esClient.search(
    stamped
      ? getStampedEuidCompositeQuery(entityType, alertFilters, compositeParams)
      : getEuidCompositeQuery(entityType, alertFilters, compositeParams),
    { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
  );

  const compositeAgg = (
    compositeResponse.aggregations as { by_entity_id?: EuidCompositeAggregation } | undefined
  )?.by_entity_id;
  const buckets = compositeAgg?.buckets ?? [];

  // The stamped field also holds other types' EUIDs, which sort after this type's: the first one
  // ends the type's pages.
  const typePrefix = `${entityType}:`;
  const firstOtherType = stamped
    ? buckets.findIndex((bucket) => !bucket.key.entity_id.startsWith(typePrefix))
    : -1;
  const pageBuckets = firstOtherType === -1 ? buckets : buckets.slice(0, firstOtherType);
  if (pageBuckets.length === 0) {
    return null;
  }

  return {
    upperBound: pageBuckets[pageBuckets.length - 1].key.entity_id,
    afterKey: firstOtherType === -1 ? compositeAgg?.after_key : undefined,
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
  stamped,
  profile,
  pageTimings,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  bounds: EuidPageBounds;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
  stamped: boolean;
  profile: boolean;
  pageTimings: PageStepTimings;
}): Promise<{ scores: ParsedRiskScore[]; profileSummary?: EsqlPageProfileSummary }> => {
  const query = getBaseScoreESQL(entityType, bounds, sampleSize, pageSize, alertsIndex);
  const startedAt = Date.now();
  const esqlResponse = await pageTimings.time(
    ['esql'],
    () =>
      esClient.esql.query(
        {
          query,
          filter: {
            bool: {
              filter: stamped
                ? [...alertFilters, getStampedEuidRangeFilter(entityType, bounds)]
                : alertFilters,
            },
          },
          ...(profile ? { profile: true } : {}),
        },
        { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
      ),
    (response) => response.took
  );
  const wallMs = Date.now() - startedAt;
  pageTimings.count('esqlRows', esqlResponse.values?.length ?? 0);
  pageTimings.count('partialResponses', Number(esqlResponse.is_partial === true));

  return {
    scores: pageTimings.timeSync(['parse'], () =>
      (esqlResponse.values ?? []).map(parseEsqlBaseScoreRow(alertsIndex, sampleSize))
    ),
    profileSummary: profile ? summarizeEsqlPage(esqlResponse, wallMs) : undefined,
  };
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

/**
 * Writes a zero base score for one entity, using the modifiers on its entity store record.
 *
 * An entity with no alert in the engine's range produces no score above, so its last score
 * document stays in place with whatever criticality and watchlists it was written with. A full
 * engine run clears that up in `resetToZero`; this lets a single-entity recalculation do the
 * same right away instead of leaving the old values on screen until the next run.
 */
export const persistZeroBaseScore = async ({
  crudClient,
  logger,
  entityType,
  entityId,
  now,
  watchlistConfigs,
  calculationRunId,
  writer,
  idBasedRiskScoringEnabled,
  refresh,
}: {
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  entityId: string;
  now: string;
  watchlistConfigs: Map<string, WatchlistObject>;
  calculationRunId: string;
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
}): Promise<number> => {
  const entities = await fetchEntitiesByIds({
    crudClient,
    entityIds: [entityId],
    logger,
    errorContext: 'Error fetching entity for the zero base score. Skipping the zero score write',
  });

  // Without the entity we would write a score carrying no modifiers at all, which is worse than
  // leaving the previous score alone.
  if (!entities.has(entityId)) {
    logger.debug(`Skipping zero base score for ${entityId}: entity not found in store`);
    return 0;
  }

  const scores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'base',
    calculationRunId,
    page: {
      scores: [
        { entity_id: entityId, alert_count: 0, score: 0, normalized_score: 0, risk_inputs: [] },
      ],
      identifierField: 'entity.id',
    },
    entities,
    watchlistConfigs,
  });

  const scoresWrittenRiskIndex = await persistScoresToRiskIndex({
    writer,
    entityType,
    scores,
    logger,
    refresh,
  });
  await persistScoresToEntityStore({
    crudClient,
    logger,
    entityType,
    scores,
    enabled: idBasedRiskScoringEnabled,
  });

  return scoresWrittenRiskIndex;
};
