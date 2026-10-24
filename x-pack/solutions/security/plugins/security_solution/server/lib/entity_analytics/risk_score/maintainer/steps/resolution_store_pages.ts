/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { AssetCriticalityLevel } from '../../../../../../common/api/entity_analytics/asset_criticality/common.gen';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { MAX_RESOLUTION_TARGETS_PER_PAGE } from '../../constants';
import { normalizeModifierEntity } from '../utils/fetch_entities_by_ids';
import type { PageStepTimings } from '../utils/page_step_timings';
import { createPageStepTimings } from '../utils/page_step_timings';
import type { ScopedLogger } from '../utils/with_log_context';
import type { RiskScoreModifierEntity } from './pipeline_types';
import type { StoredRiskScore } from './base_store_lookup';
import type { ResolutionPageTask } from './score_resolution_entities';
import type { SampledPagesConfig } from './sampled_page_bounds';
import { DEFAULT_SAMPLE_SEED, pagesToRunIndices } from './sampled_page_bounds';

const RESOLVED_TO = 'entity.relationships.resolution.resolved_to';

/** What a resolution page needs from each member's store document: its group and its modifiers. */
const MEMBER_FIELDS = [
  'entity.id',
  RESOLVED_TO,
  'asset.criticality',
  'entity.attributes.watchlists',
];

/** The resolution score a target holds in the store, compared with a new one before writing it. */
const STORED_RESOLUTION_FIELDS = {
  level: 'entity.relationships.resolution.risk.calculated_level',
  score: 'entity.relationships.resolution.risk.calculated_score',
  scoreNorm: 'entity.relationships.resolution.risk.calculated_score_norm',
};
const TARGET_FIELDS = [...MEMBER_FIELDS, ...Object.values(STORED_RESOLUTION_FIELDS)];

type StoreReader = Pick<EntityUpdateClient, 'listEntities'>;
type StoreAggregator = Pick<EntityUpdateClient, 'aggregateEntities'>;

/** Every alias of the entity type: the documents whose `resolved_to` names their group's target. */
const aliasFilters = (entityType: EntityType): QueryDslQueryContainer[] => [
  { term: { 'entity.EngineMetadata.Type': entityType } },
  { exists: { field: RESOLVED_TO } },
];

export interface StoreRead {
  entities: RiskScoreModifierEntity[];
  /** Elasticsearch's time summed over the read's requests. */
  tookMs: number;
}

export interface TargetRead extends StoreRead {
  /** Each target's stored resolution score, as single-precision values like the new scores'. */
  storedScores: Map<string, StoredRiskScore>;
}

const asFloat = (value: unknown): number | undefined =>
  typeof value === 'number' ? Math.fround(value) : undefined;

/**
 * Doc values print a float with the fewest digits that identify it, so a value is rounded back to
 * single precision before it's compared with a new score rounded the same way.
 */
const toStoredResolutionScore = (fields: Record<string, unknown>): StoredRiskScore => {
  const level = firstValue(fields, STORED_RESOLUTION_FIELDS.level);
  return {
    level: typeof level === 'string' ? level : undefined,
    score: asFloat(firstValue(fields, STORED_RESOLUTION_FIELDS.score)),
    scoreNorm: asFloat(firstValue(fields, STORED_RESOLUTION_FIELDS.scoreNorm)),
  };
};

const firstValue = (fields: Record<string, unknown>, field: string): unknown => {
  const values = fields[field];
  return Array.isArray(values) ? values[0] : undefined;
};

const toModifierEntity = (
  fields: Record<string, unknown> | undefined
): RiskScoreModifierEntity | undefined => {
  const id = fields ? firstValue(fields, 'entity.id') : undefined;
  if (!fields || typeof id !== 'string') {
    return undefined;
  }
  const criticality = AssetCriticalityLevel.safeParse(firstValue(fields, 'asset.criticality'));
  return normalizeModifierEntity({
    entity: {
      id,
      attributes: { watchlists: fields['entity.attributes.watchlists'] },
      relationships: { resolution: { resolved_to: firstValue(fields, RESOLVED_TO) } },
    },
    asset: { criticality: criticality.success ? criticality.data : undefined },
  });
};

const resolvedTo = (entity: RiskScoreModifierEntity): string | undefined =>
  entity.entity?.relationships?.resolution?.resolved_to;

/** Keys the entities by ID. */
export const byEntityId = (
  entities: RiskScoreModifierEntity[]
): Map<string, RiskScoreModifierEntity> => {
  const map = new Map<string, RiskScoreModifierEntity>();
  for (const entity of entities) {
    const id = entity.entity?.id;
    if (id !== undefined) {
      map.set(id, entity);
    }
  }
  return map;
};

const readOnePage = async (
  crudClient: StoreReader,
  {
    filter,
    sort,
    size,
    searchAfter,
    docValueFields = MEMBER_FIELDS,
  }: {
    filter: QueryDslQueryContainer[];
    sort: SortCombinations[];
    size: number;
    searchAfter?: Array<string | number>;
    docValueFields?: string[];
  }
) => {
  const {
    fields = [],
    nextSearchAfter,
    took = 0,
  } = await crudClient.listEntities({
    filter,
    sort,
    size,
    searchAfter,
    docValueFields,
  });
  return {
    entities: fields.flatMap((hit) => {
      const entity = toModifierEntity(hit);
      return entity ? [entity] : [];
    }),
    fields,
    hits: fields.length,
    nextSearchAfter,
    tookMs: took,
  };
};

/** Pages through every match, stopping early once `expectedHits` documents have come back. */
const readAll = async (
  crudClient: StoreReader,
  {
    filter,
    sort,
    size,
    expectedHits = Infinity,
    docValueFields,
  }: {
    filter: QueryDslQueryContainer[];
    sort: SortCombinations[];
    size: number;
    expectedHits?: number;
    docValueFields?: string[];
  }
): Promise<StoreRead & { fields: Array<Record<string, unknown>> }> => {
  const entities: RiskScoreModifierEntity[] = [];
  const fields: Array<Record<string, unknown>> = [];
  let tookMs = 0;
  let hits = 0;
  let searchAfter: Array<string | number> | undefined;
  do {
    const page = await readOnePage(crudClient, { filter, sort, size, searchAfter, docValueFields });
    entities.push(...page.entities);
    fields.push(...page.fields.flatMap((hit) => (hit ? [hit] : [])));
    tookMs += page.tookMs;
    hits += page.hits;
    searchAfter = page.hits === size && hits < expectedHits ? page.nextSearchAfter : undefined;
  } while (searchAfter !== undefined);
  return { entities, fields, tookMs };
};

/**
 * Measurement toggle: also sort aliases by `entity.id`, which makes the read's order unique and
 * stable across merges. Without it, an alias whose document is rewritten mid-stage, right at a
 * read's boundary, can be read twice or skipped for that run.
 */
const SORT_ALIASES_BY_ENTITY_ID = false;

const ALIAS_SORT: SortCombinations[] = [
  { [RESOLVED_TO]: 'asc' },
  ...(SORT_ALIASES_BY_ENTITY_ID ? [{ 'entity.id': 'asc' as const }] : []),
];

/** Where the next alias read starts, and the aliases already read for the group it starts in. */
interface AliasCursor {
  searchAfter?: Array<string | number>;
  carried: RiskScoreModifierEntity[];
  exhausted: boolean;
}

interface AliasPage {
  aliases: RiskScoreModifierEntity[];
  targetIds: string[];
  /** The page's last target, and the lower bound (exclusive) of the next page. */
  upper: string;
  tookMs: number;
}

const targetsInOrder = (aliases: RiskScoreModifierEntity[]): string[] => [
  ...new Set(aliases.flatMap((alias) => resolvedTo(alias) ?? [])),
];

/**
 * Reads the next aliases in `resolved_to` order with `search_after` and cuts them into a page of
 * whole groups. The filters stay the same on every read, so Elasticsearch caches them; a moving
 * range on `resolved_to` would have it walk every value after the bound on every page. A full
 * read can end partway through its last target's aliases: that group is carried into the next
 * page rather than read again. A group larger than one read is read on until another starts.
 */
const readAliasPage = async ({
  crudClient,
  entityType,
  cursor,
  size,
}: {
  crudClient: StoreReader;
  entityType: EntityType;
  cursor: AliasCursor;
  size: number;
}): Promise<{ page: AliasPage | undefined; cursor: AliasCursor }> => {
  let aliases = cursor.carried;
  let { searchAfter, exhausted } = cursor;
  let tookMs = 0;
  while (!exhausted && targetsInOrder(aliases).length < 2) {
    const read = await readOnePage(crudClient, {
      filter: aliasFilters(entityType),
      sort: ALIAS_SORT,
      size,
      searchAfter,
    });
    aliases = aliases.concat(read.entities);
    tookMs += read.tookMs;
    searchAfter = read.nextSearchAfter;
    exhausted = read.hits < size;
  }

  const targetIds = targetsInOrder(aliases);
  if (targetIds.length === 0) {
    return { page: undefined, cursor: { searchAfter, carried: [], exhausted: true } };
  }
  if (exhausted) {
    return {
      page: { aliases, targetIds, upper: targetIds[targetIds.length - 1], tookMs },
      cursor: { searchAfter, carried: [], exhausted },
    };
  }
  // More aliases follow, so the last target's group may not be complete yet.
  const complete = targetIds.slice(0, -1);
  const unfinished = targetIds[targetIds.length - 1];
  return {
    page: {
      aliases: aliases.filter((alias) => resolvedTo(alias) !== unfinished),
      targetIds: complete,
      upper: complete[complete.length - 1],
      tookMs,
    },
    cursor: {
      searchAfter,
      carried: aliases.filter((alias) => resolvedTo(alias) === unfinished),
      exhausted,
    },
  };
};

/**
 * Finds resolution pages in the entity store, without the Phase 0 lookup index. Each page reads the
 * next aliases in `resolved_to` order from doc values, so every group lands whole on one page and
 * its aliases arrive with their modifiers. The page's range `(lower, upper]` covers exactly its
 * targets.
 */
export const discoverResolutionPagesFromStore = async function* ({
  crudClient,
  logger,
  entityType,
  pageSize,
  abortSignal,
  pageTimings = createPageStepTimings(),
}: {
  crudClient: StoreReader;
  logger: ScopedLogger;
  entityType: EntityType;
  pageSize: number;
  abortSignal?: AbortSignal;
  pageTimings?: PageStepTimings;
}): AsyncGenerator<ResolutionPageTask> {
  const size = Math.min(pageSize, MAX_RESOLUTION_TARGETS_PER_PAGE);
  let cursor: AliasCursor = { carried: [], exhausted: false };
  let lowerBound: string | undefined;
  let pageNumber = 0;

  while (!cursor.exhausted || cursor.carried.length > 0) {
    if (abortSignal?.aborted) {
      logger.info('Resolution scoring aborted between pages');
      return;
    }

    const timer = pageTimings.startPage();
    const from = cursor;
    const { page, cursor: next } = await timer.time(
      'discovery',
      () => readAliasPage({ crudClient, entityType, cursor: from, size }),
      (result) => result.page?.tookMs
    );
    cursor = next;
    if (!page) {
      timer.drop();
      return;
    }

    pageNumber += 1;
    logger.debug(
      `[resolution][page:${pageNumber}] store aliases=${page.aliases.length}, targets=${page.targetIds.length}, took=${page.tookMs}ms`
    );
    const bounds = { lower: lowerBound, upper: page.upper };
    lowerBound = page.upper;
    yield {
      pageNumber,
      resolutionTargetIds: page.targetIds,
      bounds,
      timer,
      aliasEntities: byEntityId(page.aliases),
    };
  }
};

export interface SampledResolutionBounds {
  /** Inclusive upper bounds (target IDs) of every page but the last, which runs to the end. */
  uppers: string[];
  aliases: number;
  probability: number;
  /** The alias count the sample implies (random_sampler scales doc counts by 1/p), and the targets it picked. */
  estimatedAliases: number;
  sampledTargets: number;
  countTookMs: number;
  sampleTookMs: number;
  sampleRequests: number;
}

/**
 * Each composite request repeats the sampling pass, so larger pages of keys mean fewer passes; it
 * stays under the default `search.max_buckets` of 65,536.
 */
const SAMPLE_COMPOSITE_PAGE_SIZE = 50_000;

interface ResolutionSampleAggregations {
  sample: {
    keys: {
      buckets: Array<{ key: { target: string }; doc_count: number }>;
      after_key?: { target: string };
    };
  };
}

/**
 * Page upper bounds from the targets the sample picked, in order, each weighted by its sampled
 * aliases (random_sampler reports them scaled by 1/p). A bound falls wherever the running weight passes the next 1/pages of the
 * total, so pages hold about the same number of aliases however large the groups are; only the
 * weights' proportions matter. A bound is always a target, so a group never spans two pages.
 */
export const resolutionBoundsFromSample = (
  sample: Array<{ target: string; aliases: number }>,
  aliases: number,
  targetPageSize: number
): string[] => {
  const pages = Math.ceil(aliases / targetPageSize);
  const total = sample.reduce((sum, { aliases: weight }) => sum + weight, 0);
  const uppers: string[] = [];
  let running = 0;
  let next = 1;
  // The last sampled target never closes a page: the last page runs to the end of the range anyway.
  for (const { target, aliases: weight } of sample.slice(0, -1)) {
    running += weight;
    if (next < pages && running >= (next * total) / pages) {
      uppers.push(target);
      // A group heavier than a page crosses several thresholds at once.
      while (next < pages && running >= (next * total) / pages) {
        next += 1;
      }
    }
  }
  return uppers;
};

/**
 * Counts the type's aliases and samples them once at the start of the stage, so every page's range
 * is known up front instead of read page by page. Pages are measured in aliases, so the sampling
 * probability depends only on the configuration: `samplesPerPage` sampled aliases stand for
 * `targetPageSize` aliases.
 */
export const sampleResolutionPageBounds = async ({
  crudClient,
  entityType,
  config,
}: {
  crudClient: StoreAggregator;
  entityType: EntityType;
  config: SampledPagesConfig;
}): Promise<SampledResolutionBounds> => {
  const filter = aliasFilters(entityType);
  const count = await crudClient.aggregateEntities({ filter, trackTotalHits: true });
  const aliases = count.total ?? 0;
  const probability = Math.min(0.49, config.samplesPerPage / config.targetPageSize);

  const sample: Array<{ target: string; aliases: number }> = [];
  let sampleTookMs = 0;
  let sampleRequests = 0;
  let after: { target: string } | undefined;
  let more = aliases > config.targetPageSize;
  while (more) {
    const response = await crudClient.aggregateEntities<ResolutionSampleAggregations>({
      filter,
      aggs: {
        sample: {
          random_sampler: { probability, seed: config.seed ?? DEFAULT_SAMPLE_SEED },
          aggs: {
            keys: {
              composite: {
                size: SAMPLE_COMPOSITE_PAGE_SIZE,
                sources: [{ target: { terms: { field: RESOLVED_TO } } }],
                ...(after ? { after } : {}),
              },
            },
          },
        },
      },
    });
    sampleTookMs += response.took;
    sampleRequests += 1;
    const keys = response.aggregations?.sample.keys;
    const buckets = keys?.buckets ?? [];
    sample.push(
      ...buckets.map((bucket) => ({ target: bucket.key.target, aliases: bucket.doc_count }))
    );
    after = keys?.after_key;
    more = buckets.length === SAMPLE_COMPOSITE_PAGE_SIZE && after !== undefined;
  }

  return {
    uppers: resolutionBoundsFromSample(sample, aliases, config.targetPageSize),
    aliases,
    probability,
    estimatedAliases: sample.reduce((sum, { aliases: weight }) => sum + weight, 0),
    sampledTargets: sample.length,
    countTookMs: count.took,
    sampleTookMs,
    sampleRequests,
  };
};

/**
 * Reads every alias whose group falls in a sampled page's range `(lower, upper]`; the last page has
 * no upper bound. A range bounded on both sides only walks the page's own values, unlike the open
 * range that `search_after` replaced.
 */
export const readSampledAliasPage = async ({
  crudClient,
  entityType,
  range,
}: {
  crudClient: StoreReader;
  entityType: EntityType;
  range: { lower?: string; upper?: string };
}): Promise<{ aliases: RiskScoreModifierEntity[]; targetIds: string[]; tookMs: number }> => {
  const bounds = {
    ...(range.lower !== undefined ? { gt: range.lower } : {}),
    ...(range.upper !== undefined ? { lte: range.upper } : {}),
  };
  const { entities, tookMs } = await readAll(crudClient, {
    filter: [
      ...aliasFilters(entityType),
      ...(Object.keys(bounds).length > 0 ? [{ range: { [RESOLVED_TO]: bounds } }] : []),
    ],
    sort: ALIAS_SORT,
    size: MAX_RESOLUTION_TARGETS_PER_PAGE,
  });
  return { aliases: entities, targetIds: targetsInOrder(entities), tookMs };
};

export interface ResolutionPageChunk {
  targetIds: string[];
  bounds: { lower?: string; upper: string };
  aliasEntities: Map<string, RiskScoreModifierEntity>;
}

const chunkOf = (
  targetIds: string[],
  bounds: { lower?: string; upper: string },
  aliases: Iterable<RiskScoreModifierEntity>
): ResolutionPageChunk => {
  const inChunk = new Set(targetIds);
  return {
    targetIds,
    bounds,
    aliasEntities: byEntityId([...aliases].filter((alias) => inChunk.has(resolvedTo(alias) ?? ''))),
  };
};

/**
 * Cuts a page's targets, in order, into runs whose members (each target and its aliases) fit one
 * terms query, each with its own range, so the member filter never has to skip a large page. A
 * group larger than the limit gets a run of its own, which the member filter then skips.
 */
export const chunkResolutionPage = ({
  lower,
  aliases,
  targetIds,
  maxMembers,
}: {
  lower?: string;
  aliases: RiskScoreModifierEntity[];
  targetIds: string[];
  maxMembers: number;
}): ResolutionPageChunk[] => {
  const aliasCounts = new Map<string, number>();
  for (const alias of aliases) {
    const target = resolvedTo(alias);
    if (target !== undefined) {
      aliasCounts.set(target, (aliasCounts.get(target) ?? 0) + 1);
    }
  }
  const runs: string[][] = [];
  let run: string[] = [];
  let members = 0;
  for (const target of targetIds) {
    const groupMembers = 1 + (aliasCounts.get(target) ?? 0);
    if (run.length > 0 && members + groupMembers > maxMembers) {
      runs.push(run);
      run = [];
      members = 0;
    }
    run.push(target);
    members += groupMembers;
  }
  if (run.length > 0) {
    runs.push(run);
  }
  let from = lower;
  return runs.map((ids) => {
    const upper = ids[ids.length - 1];
    const chunk = chunkOf(ids, { lower: from, upper }, aliases);
    from = upper;
    return chunk;
  });
};

/**
 * Halves a part at its middle target, for a part whose scoring query came back full: the query
 * keeps at most its row limit of targets, so a full result may have dropped some.
 */
export const halveResolutionChunk = (
  chunk: ResolutionPageChunk
): [ResolutionPageChunk, ResolutionPageChunk] | undefined => {
  if (chunk.targetIds.length < 2) {
    return undefined;
  }
  const middle = Math.floor(chunk.targetIds.length / 2);
  const left = chunk.targetIds.slice(0, middle);
  const split = left[left.length - 1];
  const aliases = [...chunk.aliasEntities.values()];
  return [
    chunkOf(left, { lower: chunk.bounds.lower, upper: split }, aliases),
    chunkOf(chunk.targetIds.slice(middle), { lower: split, upper: chunk.bounds.upper }, aliases),
  ];
};

/**
 * Samples the type's aliases once, then hands out every page's range at once. Each page reads its
 * own aliases when it starts, so the reads run alongside other pages instead of one after another.
 */
export const discoverSampledResolutionPages = async function* ({
  crudClient,
  logger,
  entityType,
  config,
  abortSignal,
  pageTimings = createPageStepTimings(),
}: {
  crudClient: StoreAggregator;
  logger: ScopedLogger;
  entityType: EntityType;
  config: SampledPagesConfig;
  abortSignal?: AbortSignal;
  pageTimings?: PageStepTimings;
}): AsyncGenerator<ResolutionPageTask> {
  const firstTimer = pageTimings.startPage();
  const sample = await firstTimer.time(
    'discovery',
    () => sampleResolutionPageBounds({ crudClient, entityType, config }),
    (result) => result.countTookMs + result.sampleTookMs
  );
  logger.info(
    `[resolution] sampled page bounds: aliases=${sample.aliases}, ` +
      `probability=${sample.probability.toFixed(5)}, estimated_aliases=${
        sample.estimatedAliases
      }, ` +
      `sampled_targets=${sample.sampledTargets}, pages=${sample.uppers.length + 1}, ` +
      `count_took=${sample.countTookMs}ms, sample_took=${sample.sampleTookMs}ms in ${sample.sampleRequests} requests`
  );
  if (sample.aliases === 0) {
    firstTimer.drop();
    return;
  }

  const uppers: Array<string | undefined> = [...sample.uppers, undefined];
  const ranges = uppers.map((upper, index) => ({
    lower: index === 0 ? undefined : sample.uppers[index - 1],
    upper,
  }));
  const selected = pagesToRunIndices(ranges.length, config.pagesToRun);
  if (selected.length < ranges.length) {
    logger.info(
      `[resolution] test setting: scoring ${selected.length} of ${ranges.length} sampled pages`
    );
  }
  for (const [position, index] of selected.entries()) {
    if (abortSignal?.aborted) {
      if (position === 0) {
        firstTimer.drop();
      }
      logger.info('Resolution scoring aborted between pages');
      return;
    }
    yield {
      pageNumber: index + 1,
      resolutionTargetIds: [],
      bounds: undefined,
      timer: position === 0 ? firstTimer : pageTimings.startPage(),
      sampledRange: ranges[index],
      profile: config.pagesToRun !== undefined || undefined,
    };
  }
};

/**
 * Reads a page's targets from doc values: the modifiers on their own documents, and the resolution
 * score each one holds, so an unchanged score can be left out of the store write.
 */
export const readResolutionTargets = async ({
  crudClient,
  targetIds,
}: {
  crudClient: StoreReader;
  targetIds: string[];
}): Promise<TargetRead> => {
  if (targetIds.length === 0) {
    return { entities: [], storedScores: new Map(), tookMs: 0 };
  }
  const { entities, fields, tookMs } = await readAll(crudClient, {
    filter: [{ terms: { 'entity.id': targetIds } }],
    sort: [{ 'entity.id': 'asc' }],
    size: Math.min(targetIds.length, MAX_RESOLUTION_TARGETS_PER_PAGE),
    // Entity IDs are unique, so once every target is in there is nothing left to page.
    expectedHits: targetIds.length,
    docValueFields: TARGET_FIELDS,
  });
  const storedScores = new Map<string, StoredRiskScore>();
  for (const hit of fields) {
    const id = firstValue(hit, 'entity.id');
    if (typeof id === 'string') {
      storedScores.set(id, toStoredResolutionScore(hit));
    }
  }
  return { entities, storedScores, tookMs };
};
