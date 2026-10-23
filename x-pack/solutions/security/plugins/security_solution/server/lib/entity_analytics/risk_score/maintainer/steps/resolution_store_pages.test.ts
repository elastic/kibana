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
import { discoverResolutionPagesFromStore, readResolutionTargets } from './resolution_store_pages';

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
