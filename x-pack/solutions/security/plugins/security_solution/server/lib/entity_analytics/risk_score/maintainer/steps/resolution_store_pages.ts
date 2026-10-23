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

interface AliasPage {
  aliases: RiskScoreModifierEntity[];
  targetIds: string[];
  /** The page's last target, and the lower bound (exclusive) of the next page. */
  upper: string;
  last: boolean;
  tookMs: number;
}

/**
 * Reads the next aliases in `resolved_to` order and cuts them into a page of whole groups. A full
 * read can end partway through its last target's aliases, so that target is left for the next
 * page. A read holding a single target is a group larger than the read, which is read to its end.
 */
const readAliasPage = async ({
  crudClient,
  entityType,
  lowerBound,
  size,
}: {
  crudClient: StoreReader;
  entityType: EntityType;
  lowerBound: string | undefined;
  size: number;
}): Promise<AliasPage | undefined> => {
  const read = await readOnePage(crudClient, {
    filter: [
      { term: { 'entity.EngineMetadata.Type': entityType } },
      lowerBound === undefined
        ? { exists: { field: RESOLVED_TO } }
        : { range: { [RESOLVED_TO]: { gt: lowerBound } } },
    ],
    sort: [{ [RESOLVED_TO]: 'asc' }],
    size,
  });

  const targetIds = [...new Set(read.entities.flatMap((alias) => resolvedTo(alias) ?? []))];
  if (targetIds.length === 0) {
    return undefined;
  }

  const last = read.hits < size;
  if (last) {
    return {
      aliases: read.entities,
      targetIds,
      upper: targetIds[targetIds.length - 1],
      last,
      tookMs: read.tookMs,
    };
  }
  if (targetIds.length > 1) {
    const unfinished = targetIds.pop();
    return {
      aliases: read.entities.filter((alias) => resolvedTo(alias) !== unfinished),
      targetIds,
      upper: targetIds[targetIds.length - 1],
      last,
      tookMs: read.tookMs,
    };
  }
  const [target] = targetIds;
  const group = await readAll(crudClient, {
    filter: [{ term: { [RESOLVED_TO]: target } }],
    sort: [{ 'entity.id': 'asc' }],
    size,
  });
  return {
    aliases: group.entities,
    targetIds,
    upper: target,
    last,
    tookMs: read.tookMs + group.tookMs,
  };
};

/**
 * Finds resolution pages in the entity store, without the Phase 0 lookup index. Each page reads the
 * next aliases in `resolved_to` order after the previous page's last target, from doc values, so
 * every group lands whole on one page and its aliases arrive with their modifiers. The page's range
 * `(lower, upper]` covers exactly its targets.
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
  let lowerBound: string | undefined;
  let pageNumber = 0;
  let last = false;

  while (!last) {
    if (abortSignal?.aborted) {
      logger.info('Resolution scoring aborted between pages');
      return;
    }

    const timer = pageTimings.startPage();
    const page = await timer.time(
      'discovery',
      () => readAliasPage({ crudClient, entityType, lowerBound, size }),
      (result) => result?.tookMs
    );
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
    last = page.last;
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
