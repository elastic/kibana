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
import type { ResolutionPageTask } from './score_resolution_entities';

const RESOLVED_TO = 'entity.relationships.resolution.resolved_to';

/** What a resolution page needs from each member's store document: its group and its modifiers. */
const MEMBER_FIELDS = [
  'entity.id',
  RESOLVED_TO,
  'asset.criticality',
  'entity.attributes.watchlists',
];

type StoreReader = Pick<EntityUpdateClient, 'listEntities'>;

export interface StoreRead {
  entities: RiskScoreModifierEntity[];
  /** Elasticsearch's time summed over the read's requests. */
  tookMs: number;
}

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
  }: {
    filter: QueryDslQueryContainer[];
    sort: SortCombinations[];
    size: number;
    searchAfter?: Array<string | number>;
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
    docValueFields: MEMBER_FIELDS,
  });
  return {
    entities: fields.flatMap((hit) => {
      const entity = toModifierEntity(hit);
      return entity ? [entity] : [];
    }),
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
  }: {
    filter: QueryDslQueryContainer[];
    sort: SortCombinations[];
    size: number;
    expectedHits?: number;
  }
): Promise<StoreRead> => {
  const entities: RiskScoreModifierEntity[] = [];
  let tookMs = 0;
  let hits = 0;
  let searchAfter: Array<string | number> | undefined;
  do {
    const page = await readOnePage(crudClient, { filter, sort, size, searchAfter });
    entities.push(...page.entities);
    tookMs += page.tookMs;
    hits += page.hits;
    searchAfter = page.hits === size && hits < expectedHits ? page.nextSearchAfter : undefined;
  } while (searchAfter !== undefined);
  return { entities, tookMs };
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
      filter: [
        { term: { 'entity.EngineMetadata.Type': entityType } },
        { exists: { field: RESOLVED_TO } },
      ],
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

/** Reads a page's targets from doc values, for the modifiers on their own documents. */
export const readResolutionTargets = async ({
  crudClient,
  targetIds,
}: {
  crudClient: StoreReader;
  targetIds: string[];
}): Promise<StoreRead> =>
  targetIds.length === 0
    ? { entities: [], tookMs: 0 }
    : readAll(crudClient, {
        filter: [{ terms: { 'entity.id': targetIds } }],
        sort: [{ 'entity.id': 'asc' }],
        size: Math.min(targetIds.length, MAX_RESOLUTION_TARGETS_PER_PAGE),
        // Entity IDs are unique, so once every target is in there is nothing left to page.
        expectedHits: targetIds.length,
      });
