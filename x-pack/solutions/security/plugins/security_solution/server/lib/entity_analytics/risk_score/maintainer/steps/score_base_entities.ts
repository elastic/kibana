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
import type { ScoredEntityPage, StepResult } from './pipeline_types';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import type { EsqlPageProfileSummary } from '../utils/esql_page_profile';
import { shouldProfilePage, summarizeEsqlPage } from '../utils/esql_page_profile';
import type { PageStepRecorder, PageStepTimings, PageTimer } from '../utils/page_step_timings';
import { createPageStepTimings } from '../utils/page_step_timings';
import { forEachConcurrently } from '../utils/for_each_concurrently';
import type { ScopedLogger } from '../utils/with_log_context';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import { createMissingEntities as runCreateMissingEntities } from './create_missing_entities';
import type { BaseStoreLookup } from './base_store_lookup';
import {
  BASE_STORE_LOOKUP_FIELDS,
  isStoredScoreUnchanged,
  readBaseStoreLookup,
} from './base_store_lookup';
import type { SampledPagesConfig } from './sampled_page_bounds';
import {
  pagesToRunIndices,
  sampleBasePageBounds,
  splitPoint,
  typeIdsEnd,
} from './sampled_page_bounds';

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
  /** Collects each page's step times; pass one in to read them after the stage. */
  pageTimings?: PageStepTimings;
  /**
   * Find every page's bounds from one random sample of the alerts at the start of the stage, instead
   * of a composite aggregation over every alert for each page. Needs every alert stamped.
   */
  sampledPages?: SampledPagesConfig;
}

interface ScoreAndPersistBaseEntitiesParams extends ScoreBaseEntitiesParams {
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
  createMissingEntities: boolean;
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
  /** `false` skips waiting for an entity store refresh on each page; the caller refreshes once. */
  entityStoreRefresh?: Parameters<typeof persistScoresToEntityStore>[0]['refresh'];
  /** Leave scores the entity store already holds out of the store write. */
  skipUnchangedStoreWrites?: boolean;
  /** Splits each page's entity store write into this many bulk requests, sent at the same time. */
  entityStoreWriteChunks?: number;
  /** Splits each page's risk index write into this many bulk requests, sent at the same time. */
  riskIndexWriteChunks?: number;
  /** How many pages are scored and written at the same time. */
  pagesInFlight?: number;
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
  /** In-store scores left out of the store write because the store already holds them. */
  scoresUnchangedInStore: number;
}

interface EuidPageBounds {
  lower: string | undefined;
  upper: string;
}

interface EuidPageResult {
  upperBound: string;
  afterKey: Record<string, string> | undefined;
}

interface BasePageTask {
  pageNumber: number;
  bounds: EuidPageBounds;
  timer: PageTimer;
  /** The stage's sampled entity IDs, in order: split points for a page that reaches the row limit. */
  sampledKeys?: string[];
  /** Profile this page's scoring query regardless of its number. */
  profile?: boolean;
}

interface BaseScoringContext {
  entityStoreIndex: string;
  stamped: boolean;
}

const prepareBaseScoring = async ({
  esClient,
  crudClient,
  logger,
  entityType,
  alertFilters,
  alertsIndex,
}: ScoreBaseEntitiesParams): Promise<BaseScoringContext> => {
  const entityStoreIndex = await crudClient.latestIndexName();
  const stamped = await allAlertsStamped({ esClient, entityType, alertFilters, alertsIndex });
  logger.debug(
    stamped
      ? 'base scoring pages by stamped entity IDs'
      : 'base scoring pages by derived entity IDs: some alerts have no stamped entity ID'
  );
  return { entityStoreIndex, stamped };
};

/**
 * Finds the base pages, one after another: each composite aggregation needs the previous one's
 * `after_key`. Page `n` covers the EUIDs in `(upper bound of page n - 1, upper bound of page n]`.
 */
const discoverBasePages = (
  params: ScoreBaseEntitiesParams,
  context: BaseScoringContext
): AsyncGenerator<BasePageTask> =>
  params.sampledPages && context.stamped
    ? discoverSampledBasePages(params, params.sampledPages)
    : discoverBasePagesByComposite(params, context);

/**
 * Samples the alerts once, then yields the pages between the sampled bounds. The sample's cost is
 * recorded as page 1's discovery; later pages need none.
 */
const discoverSampledBasePages = async function* (
  {
    esClient,
    logger,
    entityType,
    alertFilters,
    alertsIndex,
    abortSignal,
    pageTimings = createPageStepTimings(),
  }: ScoreBaseEntitiesParams,
  config: SampledPagesConfig
): AsyncGenerator<BasePageTask> {
  const firstTimer = pageTimings.startPage();
  const sample = await firstTimer.time(
    'discovery',
    () => sampleBasePageBounds({ esClient, entityType, alertFilters, alertsIndex, config }),
    (result) => result.countTookMs + result.sampleTookMs
  );
  logger.info(
    `[base] sampled page bounds: entities=${sample.entities}, alerts=${sample.alerts}, ` +
      `probability=${sample.probability.toFixed(5)}, sampled_ids=${sample.sampledKeys.length}, ` +
      `pages=${sample.uppers.length + 1}, count_took=${sample.countTookMs}ms, ` +
      `sample_took=${sample.sampleTookMs}ms in ${sample.sampleRequests} requests`
  );
  if (sample.entities === 0) {
    firstTimer.drop();
    return;
  }

  const uppers = [...sample.uppers, typeIdsEnd(entityType)];
  const ranges = uppers.map((upper, index) => ({
    lower: index === 0 ? undefined : uppers[index - 1],
    upper,
  }));
  const selected = pagesToRunIndices(ranges.length, config.pagesToRun);
  if (selected.length < ranges.length) {
    logger.info(
      `[base] test setting: scoring ${selected.length} of ${ranges.length} sampled pages`
    );
  }
  for (const [position, index] of selected.entries()) {
    if (abortSignal?.aborted) {
      if (position === 0) {
        firstTimer.drop();
      }
      logger.info('Base scoring aborted between pages');
      return;
    }
    yield {
      pageNumber: index + 1,
      bounds: ranges[index],
      timer: position === 0 ? firstTimer : pageTimings.startPage(),
      sampledKeys: sample.sampledKeys,
      profile: config.pagesToRun !== undefined || undefined,
    };
  }
};

const discoverBasePagesByComposite = async function* (
  {
    esClient,
    logger,
    entityType,
    alertFilters,
    alertsIndex,
    pageSize,
    abortSignal,
    pageTimings = createPageStepTimings(),
  }: ScoreBaseEntitiesParams,
  { stamped }: BaseScoringContext
): AsyncGenerator<BasePageTask> {
  let afterKey: Record<string, string> | undefined;
  let previousPageUpperBound: string | undefined;
  let pageNumber = 0;

  do {
    if (abortSignal?.aborted) {
      logger.info('Base scoring aborted between pages');
      return;
    }

    const timer = pageTimings.startPage();
    const pageResult = await timer.time('discovery', () =>
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
      timer.drop();
      return;
    }

    afterKey = pageResult.afterKey;
    pageNumber += 1;
    const bounds = { lower: previousPageUpperBound, upper: pageResult.upperBound };
    previousPageUpperBound = pageResult.upperBound;
    yield { pageNumber, bounds, timer };
  } while (afterKey !== undefined);
};

/** Scores one base page. Undefined when no alert on the page produced a score. */
const scoreBasePage = async (
  {
    esClient,
    logger,
    entityType,
    alertFilters,
    alertsIndex,
    pageSize,
    sampleSize,
    now,
    watchlistConfigs,
    calculationRunId,
  }: ScoreBaseEntitiesParams,
  { entityStoreIndex, stamped }: BaseScoringContext,
  { pageNumber, bounds, timer, sampledKeys, profile: profileThisPage }: BasePageTask
): Promise<ScoredEntityPage | undefined> => {
  type ScoredRange = Awaited<ReturnType<typeof scorePageFromAlerts>>;
  // The scoring query keeps at most `pageSize` rows, so a sampled page that reaches it may have lost
  // its lowest scores: score it again in two halves, split at its middle sampled ID.
  const scoreRange = async (range: EuidPageBounds, profile: boolean): Promise<ScoredRange> => {
    const result = await scorePageFromAlerts({
      esClient,
      entityType,
      bounds: range,
      sampleSize,
      pageSize,
      alertsIndex,
      entityStoreIndex,
      alertFilters,
      stamped,
      profile,
      timer,
    });
    if (result.scores.length < pageSize || !sampledKeys) {
      return result;
    }
    const middle = splitPoint(sampledKeys, range);
    if (middle === undefined) {
      logger.warn(
        `[base][page:${pageNumber}] reached ${pageSize} rows with no sampled ID to split on; ` +
          'its lowest scores may be missing'
      );
      return result;
    }
    logger.info(`[base][page:${pageNumber}] reached ${pageSize} rows; scoring it in two halves`);
    const left = await scoreRange({ lower: range.lower, upper: middle }, false);
    const right = await scoreRange({ lower: middle, upper: range.upper }, false);
    return {
      scores: [...left.scores, ...right.scores],
      storeLookup: {
        entities: new Map([...left.storeLookup.entities, ...right.storeLookup.entities]),
        storedScores: new Map([
          ...left.storeLookup.storedScores,
          ...right.storeLookup.storedScores,
        ]),
      },
      profileSummary: left.profileSummary,
    };
  };
  const { scores, storeLookup, profileSummary } = await scoreRange(
    bounds,
    profileThisPage ?? shouldProfilePage(pageNumber)
  );
  if (profileSummary) {
    logger.info(`[base][page:${pageNumber}] esql profile ${JSON.stringify(profileSummary)}`);
  }
  if (scores.length === 0) {
    return undefined;
  }

  return timer.timeSync('modifiers', () =>
    applyBaseScoreModifiers({
      scores,
      storeLookup,
      now,
      entityType,
      calculationRunId,
      watchlistConfigs,
    })
  );
};

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
 * The scoring query joins each scored entity's store document, which supplies its modifiers, tells
 * whether it exists in the store, and holds the score it was last given.
 */
export const calculateBaseEntityScores = async function* (
  params: ScoreBaseEntitiesParams
): AsyncGenerator<ScoredEntityPage> {
  const context = await prepareBaseScoring(params);
  for await (const task of discoverBasePages(params, context)) {
    const page = await scoreBasePage(params, context, task);
    if (page) {
      yield page;
    }
    task.timer.end();
  }
};

export const scoreBaseEntities = async ({
  writer,
  idBasedRiskScoringEnabled,
  createMissingEntities: createMissingEntitiesEnabled,
  refresh,
  entityStoreRefresh,
  skipUnchangedStoreWrites = false,
  entityStoreWriteChunks,
  riskIndexWriteChunks,
  pagesInFlight = 1,
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
  let scoresUnchangedInStore = 0;
  const newScores: Record<string, number> = {};

  const scoringParams = { ...params, createMissingEntities: createMissingEntitiesEnabled };
  const context = await prepareBaseScoring(scoringParams);

  // Pages run concurrently, so every counter is updated after its page's awaits, never across one.
  const persistPage = async (page: ScoredEntityPage, timer: PageTimer) => {
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
        const createResult = await timer.time('entityCreation', () =>
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

    if (skipUnchangedStoreWrites) {
      const changedScores = entityStoreScores.filter(
        (score) => !page.unchangedInStore?.has(score.id_value)
      );
      scoresUnchangedInStore += entityStoreScores.length - changedScores.length;
      entityStoreScores = changedScores;
    }

    const riskIndexDocsWritten = await persistScoresToRiskIndex({
      writer,
      entityType: params.entityType,
      scores: riskIndexScores,
      logger: params.logger,
      refresh,
      timer,
      parallelChunks: riskIndexWriteChunks,
    });
    scoresWrittenRiskIndex += riskIndexDocsWritten;
    const { docsWritten, errorsCount } = await timer.time(
      'storeWrite',
      () =>
        persistScoresToEntityStore({
          crudClient: params.crudClient,
          logger: params.logger,
          entityType: params.entityType,
          scores: entityStoreScores,
          enabled: idBasedRiskScoringEnabled,
          refresh: entityStoreRefresh,
          parallelChunks: entityStoreWriteChunks,
        }),
      (result) => result.tookMs
    );
    scoresWrittenEntityStore += docsWritten;
    scoresFailed += errorsCount;

    if (collectScores) {
      for (const score of riskIndexScores) {
        newScores[score.id_value] = score.calculated_score_norm;
      }
    }
  };

  await forEachConcurrently(
    discoverBasePages(scoringParams, context),
    pagesInFlight,
    async (task) => {
      const page = await scoreBasePage(scoringParams, context, task);
      if (page) {
        await persistPage(page, task.timer);
      }
      task.timer.end();
    }
  );

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
    scoresUnchangedInStore,
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
  entityStoreIndex,
  alertFilters,
  stamped,
  profile,
  timer,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  bounds: EuidPageBounds;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  entityStoreIndex: string;
  alertFilters: QueryDslQueryContainer[];
  stamped: boolean;
  profile: boolean;
  timer: PageStepRecorder;
}): Promise<{
  scores: ParsedRiskScore[];
  storeLookup: BaseStoreLookup;
  profileSummary?: EsqlPageProfileSummary;
}> => {
  const query = getBaseScoreESQL(entityType, bounds, sampleSize, pageSize, alertsIndex, {
    index: entityStoreIndex,
    fields: BASE_STORE_LOOKUP_FIELDS,
  });
  const startedAt = Date.now();
  const esqlResponse = await timer.time(
    'esql',
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
  const rows = esqlResponse.values ?? [];

  return {
    ...timer.timeSync('parse', () => ({
      scores: rows.map(parseEsqlBaseScoreRow(alertsIndex, sampleSize)),
      storeLookup: readBaseStoreLookup(esqlResponse.columns ?? [], rows),
    })),
    profileSummary: profile ? summarizeEsqlPage(esqlResponse, wallMs) : undefined,
  };
};

const applyBaseScoreModifiers = ({
  scores,
  storeLookup: { entities, storedScores },
  now,
  entityType,
  calculationRunId,
  watchlistConfigs,
}: {
  scores: ParsedRiskScore[];
  storeLookup: BaseStoreLookup;
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

  return {
    entityIds: scores.map((score) => score.entity_id),
    scores: finalScores,
    entities,
    unchangedInStore: new Set(
      finalScores
        .filter((score) => isStoredScoreUnchanged(score, storedScores.get(score.id_value)))
        .map((score) => score.id_value)
    ),
  };
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
