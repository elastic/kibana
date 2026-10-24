/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { ScopedLogger } from '../utils/with_log_context';
import { createPageStepTimings } from '../utils/page_step_timings';
import {
  chunkResolutionPage,
  discoverResolutionPagesFromStore,
  discoverSampledResolutionPages,
  readResolutionTargets,
  readSampledAliasPage,
  resolutionBoundsFromSample,
  sampleResolutionPageBounds,
} from './resolution_store_pages';

const RESOLVED_TO = 'entity.relationships.resolution.resolved_to';

type ListEntities = EntityUpdateClient['listEntities'];

const hit = (id: string, extra: Record<string, unknown[]> = {}) => ({
  'entity.id': [id],
  ...extra,
});
const alias = (id: string, target: string, extra: Record<string, unknown[]> = {}) =>
  hit(id, { [RESOLVED_TO]: [target], ...extra });

/** Answers each listEntities call with the next list of hits, in order. */
const storeReturning = (...reads: Array<Array<Record<string, unknown[]>>>) => {
  const remaining = [...reads];
  const listEntities = jest.fn<ReturnType<ListEntities>, Parameters<ListEntities>>(async () => {
    const fields = remaining.shift() ?? [];
    const lastId = fields[fields.length - 1]?.['entity.id']?.[0];
    return {
      entities: [],
      fields,
      took: 5,
      nextSearchAfter: typeof lastId === 'string' ? [lastId] : undefined,
    };
  });
  return { listEntities };
};

const logger: ScopedLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const collect = async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of generator) {
    items.push(item);
  }
  return items;
};

const discover = (crudClient: ReturnType<typeof storeReturning>, pageSize: number) =>
  collect(
    discoverResolutionPagesFromStore({
      crudClient,
      logger,
      entityType: EntityType.user,
      pageSize,
      pageTimings: createPageStepTimings(),
    })
  );

describe('discoverResolutionPagesFromStore', () => {
  it('reads aliases of the entity type in resolved_to order from doc values', async () => {
    const crudClient = storeReturning([alias('user:a1', 'user:t1')]);

    await discover(crudClient, 10);

    expect(crudClient.listEntities).toHaveBeenCalledWith({
      filter: [
        { term: { 'entity.EngineMetadata.Type': 'user' } },
        { exists: { field: RESOLVED_TO } },
      ],
      sort: [{ [RESOLVED_TO]: 'asc' }],
      size: 10,
      searchAfter: undefined,
      docValueFields: [
        'entity.id',
        RESOLVED_TO,
        'asset.criticality',
        'entity.attributes.watchlists',
      ],
    });
  });

  it('makes one page of every group when the read is not full', async () => {
    const crudClient = storeReturning([
      alias('user:a1', 'user:t1'),
      alias('user:a2', 'user:t2'),
      alias('user:a3', 'user:t2'),
    ]);

    const pages = await discover(crudClient, 10);

    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual(
      expect.objectContaining({
        pageNumber: 1,
        resolutionTargetIds: ['user:t1', 'user:t2'],
        bounds: { lower: undefined, upper: 'user:t2' },
      })
    );
    expect([...(pages[0].aliasEntities?.keys() ?? [])]).toEqual(['user:a1', 'user:a2', 'user:a3']);
    expect(crudClient.listEntities).toHaveBeenCalledTimes(1);
  });

  it('carries the last group of a full read into the next page and reads on after the last hit', async () => {
    const crudClient = storeReturning(
      [alias('user:a1', 'user:t1'), alias('user:a2', 'user:t2'), alias('user:a3', 'user:t2')],
      [alias('user:a4', 'user:t2')]
    );

    const pages = await discover(crudClient, 3);

    expect(
      pages.map(({ resolutionTargetIds, bounds, aliasEntities }) => ({
        resolutionTargetIds,
        bounds,
        aliases: [...(aliasEntities?.keys() ?? [])],
      }))
    ).toEqual([
      {
        resolutionTargetIds: ['user:t1'],
        bounds: { lower: undefined, upper: 'user:t1' },
        aliases: ['user:a1'],
      },
      {
        resolutionTargetIds: ['user:t2'],
        bounds: { lower: 'user:t1', upper: 'user:t2' },
        aliases: ['user:a2', 'user:a3', 'user:a4'],
      },
    ]);
    expect(crudClient.listEntities).toHaveBeenCalledTimes(2);
    expect(crudClient.listEntities.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        filter: [
          { term: { 'entity.EngineMetadata.Type': 'user' } },
          { exists: { field: RESOLVED_TO } },
        ],
        searchAfter: ['user:a3'],
      })
    );
  });

  it('reads on through a group larger than one read until the next group starts', async () => {
    const crudClient = storeReturning(
      [alias('user:a1', 'user:t1'), alias('user:a2', 'user:t1')],
      [alias('user:a3', 'user:t1'), alias('user:a4', 'user:t2')],
      []
    );

    const pages = await discover(crudClient, 2);

    expect(
      pages.map(({ resolutionTargetIds, aliasEntities }) => ({
        resolutionTargetIds,
        aliases: [...(aliasEntities?.keys() ?? [])],
      }))
    ).toEqual([
      { resolutionTargetIds: ['user:t1'], aliases: ['user:a1', 'user:a2', 'user:a3'] },
      { resolutionTargetIds: ['user:t2'], aliases: ['user:a4'] },
    ]);
    expect(crudClient.listEntities.mock.calls.map(([params]) => params?.searchAfter)).toEqual([
      undefined,
      ['user:a2'],
      ['user:a4'],
    ]);
  });

  it('reads each alias modifiers from doc values and ignores an unknown criticality', async () => {
    const crudClient = storeReturning([
      alias('user:a1', 'user:t1', {
        'asset.criticality': ['high_impact'],
        'entity.attributes.watchlists': ['w1', 'w2'],
      }),
      alias('user:a2', 'user:t1', { 'asset.criticality': ['not_a_level'] }),
    ]);

    const [page] = await discover(crudClient, 10);

    expect(page.aliasEntities?.get('user:a1')).toEqual({
      entity: {
        id: 'user:a1',
        attributes: { watchlists: ['w1', 'w2'] },
        relationships: { resolution: { resolved_to: 'user:t1' } },
      },
      asset: { criticality: 'high_impact' },
    });
    expect(page.aliasEntities?.get('user:a2')?.asset).toEqual({ criticality: undefined });
  });

  it('records the read under discovery with the time Elasticsearch took', async () => {
    const crudClient = storeReturning([alias('user:a1', 'user:t1')]);
    const pageTimings = createPageStepTimings();

    for await (const page of discoverResolutionPagesFromStore({
      crudClient,
      logger,
      entityType: EntityType.user,
      pageSize: 10,
      pageTimings,
    })) {
      page.timer.end();
    }

    expect(pageTimings.summary().firstPage?.steps.discovery).toEqual(
      expect.objectContaining({ calls: 1, esTookMs: 5 })
    );
  });

  it('finds no pages in a store without aliases', async () => {
    const crudClient = storeReturning([]);

    expect(await discover(crudClient, 10)).toEqual([]);
  });
});

describe('readResolutionTargets', () => {
  it("reads the targets' own documents from doc values", async () => {
    const crudClient = storeReturning([hit('user:t1', { 'asset.criticality': ['low_impact'] })]);

    const { entities, tookMs } = await readResolutionTargets({
      crudClient,
      targetIds: ['user:t1', 'user:t2'],
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: [{ terms: { 'entity.id': ['user:t1', 'user:t2'] } }],
        size: 2,
      })
    );
    expect(entities).toEqual([
      expect.objectContaining({
        entity: expect.objectContaining({ id: 'user:t1' }),
        asset: { criticality: 'low_impact' },
      }),
    ]);
    expect(tookMs).toBe(5);
  });

  it('makes one request when every target is found', async () => {
    const crudClient = storeReturning([hit('user:t1'), hit('user:t2')], []);

    await readResolutionTargets({ crudClient, targetIds: ['user:t1', 'user:t2'] });

    expect(crudClient.listEntities).toHaveBeenCalledTimes(1);
  });

  it('reads nothing for a page without targets', async () => {
    const crudClient = storeReturning();

    expect(await readResolutionTargets({ crudClient, targetIds: [] })).toEqual({
      entities: [],
      tookMs: 0,
    });
    expect(crudClient.listEntities).not.toHaveBeenCalled();
  });
});

const aliasFilters = [
  { term: { 'entity.EngineMetadata.Type': 'user' } },
  { exists: { field: RESOLVED_TO } },
];

/** Answers the alias count, then one composite page of sampled targets per call. */
const aggregatorReturning = (aliases: number, ...samplePages: Array<Array<[string, number]>>) => {
  const remaining = [...samplePages];
  const aggregateEntities = jest
    .fn()
    .mockImplementation(async (params: { trackTotalHits?: boolean }) => {
      if (params.trackTotalHits) {
        return { total: aliases, took: 4 };
      }
      const page = remaining.shift() ?? [];
      const last = page[page.length - 1];
      return {
        took: 6,
        aggregations: {
          sample: {
            keys: {
              buckets: page.map(([target, count]) => ({ key: { target }, doc_count: count })),
              after_key: last ? { target: last[0] } : undefined,
            },
          },
        },
      };
    });
  return { aggregateEntities };
};

const weighted = (...targets: Array<[string, number]>) =>
  targets.map(([target, aliases]) => ({ target, aliases }));

describe('resolutionBoundsFromSample', () => {
  it('closes a page each time the sampled aliases pass the next share of the total', () => {
    const sample = weighted(['t1', 1], ['t2', 1], ['t3', 1], ['t4', 1], ['t5', 1], ['t6', 1]);

    expect(resolutionBoundsFromSample(sample, 300, 100)).toEqual(['t2', 't4']);
  });

  it('weights each target by its sampled aliases', () => {
    const sample = weighted(['t1', 4], ['t2', 1], ['t3', 1]);

    expect(resolutionBoundsFromSample(sample, 200, 100)).toEqual(['t1']);
  });

  it('closes one page on a group heavier than several pages', () => {
    const sample = weighted(['t1', 1], ['t2', 6], ['t3', 1]);

    expect(resolutionBoundsFromSample(sample, 400, 100)).toEqual(['t2']);
  });

  it('never closes a page on the last sampled target', () => {
    expect(resolutionBoundsFromSample(weighted(['t1', 1], ['t2', 1]), 200, 100)).toEqual(['t1']);
  });

  it('makes one page when the aliases fit in one', () => {
    expect(resolutionBoundsFromSample(weighted(['t1', 1], ['t2', 1]), 90, 100)).toEqual([]);
  });
});

describe('sampleResolutionPageBounds', () => {
  const config = { targetPageSize: 2, samplesPerPage: 1 };

  it('counts the aliases, then samples their targets with a composite inside random_sampler', async () => {
    const crudClient = aggregatorReturning(4, [
      ['user:t1', 1],
      ['user:t2', 1],
      ['user:t3', 1],
    ]);

    const bounds = await sampleResolutionPageBounds({
      crudClient,
      entityType: EntityType.user,
      config,
    });

    expect(crudClient.aggregateEntities).toHaveBeenNthCalledWith(1, {
      filter: aliasFilters,
      trackTotalHits: true,
    });
    expect(crudClient.aggregateEntities).toHaveBeenNthCalledWith(2, {
      filter: aliasFilters,
      aggs: {
        sample: {
          random_sampler: { probability: 0.49, seed: 42 },
          aggs: {
            keys: {
              composite: {
                size: 50_000,
                sources: [{ target: { terms: { field: RESOLVED_TO } } }],
              },
            },
          },
        },
      },
    });
    expect(bounds).toEqual({
      uppers: ['user:t2'],
      aliases: 4,
      probability: 0.49,
      sampledAliases: 3,
      sampledTargets: 3,
      countTookMs: 4,
      sampleTookMs: 6,
      sampleRequests: 1,
    });
  });

  it('samples nothing when the aliases fit in one page', async () => {
    const crudClient = aggregatorReturning(2);

    const bounds = await sampleResolutionPageBounds({
      crudClient,
      entityType: EntityType.user,
      config,
    });

    expect(crudClient.aggregateEntities).toHaveBeenCalledTimes(1);
    expect(bounds.uppers).toEqual([]);
  });
});

describe('readSampledAliasPage', () => {
  it("reads the aliases whose targets fall in the page's range, in resolved_to order", async () => {
    const crudClient = storeReturning([alias('user:a1', 'user:t1'), alias('user:a2', 'user:t2')]);

    const page = await readSampledAliasPage({
      crudClient,
      entityType: EntityType.user,
      range: { lower: 'user:t0', upper: 'user:t2' },
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: [...aliasFilters, { range: { [RESOLVED_TO]: { gt: 'user:t0', lte: 'user:t2' } } }],
        sort: [{ [RESOLVED_TO]: 'asc' }],
      })
    );
    expect(page.targetIds).toEqual(['user:t1', 'user:t2']);
    expect(page.tookMs).toBe(5);
  });

  it('leaves the range open on the side a page has no bound', async () => {
    const crudClient = storeReturning([]);

    await readSampledAliasPage({ crudClient, entityType: EntityType.user, range: {} });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({ filter: aliasFilters })
    );
  });
});

describe('chunkResolutionPage', () => {
  it('cuts the targets into consecutive runs, each with its range and its aliases', () => {
    const entities = [
      ['user:a1', 'user:t1'],
      ['user:a2', 'user:t2'],
      ['user:a3', 'user:t3'],
    ].map(([id, target]) => ({
      entity: { id, relationships: { resolution: { resolved_to: target } } },
    }));

    const chunks = chunkResolutionPage({
      lower: 'user:t0',
      aliases: entities,
      targetIds: ['user:t1', 'user:t2', 'user:t3'],
      maxTargets: 2,
    });

    expect(chunks.map(({ targetIds, bounds }) => ({ targetIds, bounds }))).toEqual([
      { targetIds: ['user:t1', 'user:t2'], bounds: { lower: 'user:t0', upper: 'user:t2' } },
      { targetIds: ['user:t3'], bounds: { lower: 'user:t2', upper: 'user:t3' } },
    ]);
    expect([...chunks[1].aliasEntities.keys()]).toEqual(['user:a3']);
  });
});

describe('discoverSampledResolutionPages', () => {
  const discoverSampled = (crudClient: ReturnType<typeof aggregatorReturning>) =>
    collect(
      discoverSampledResolutionPages({
        crudClient,
        logger,
        entityType: EntityType.user,
        config: { targetPageSize: 2, samplesPerPage: 1 },
        pageTimings: createPageStepTimings(),
      })
    );

  it("hands out every page's range from the sample", async () => {
    const crudClient = aggregatorReturning(4, [
      ['user:t1', 1],
      ['user:t2', 1],
      ['user:t3', 1],
    ]);

    const pages = await discoverSampled(crudClient);

    expect(pages.map(({ pageNumber, sampledRange }) => ({ pageNumber, sampledRange }))).toEqual([
      { pageNumber: 1, sampledRange: { lower: undefined, upper: 'user:t2' } },
      { pageNumber: 2, sampledRange: { lower: 'user:t2', upper: undefined } },
    ]);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('sampled page bounds: aliases=4')
    );
  });

  it('finds no pages in a store without aliases', async () => {
    expect(await discoverSampled(aggregatorReturning(0))).toEqual([]);
  });
});
