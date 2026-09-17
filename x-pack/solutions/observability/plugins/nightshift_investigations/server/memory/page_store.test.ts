/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { MEMORY_AI_INDEX_DEST } from '../../common/memory';
import { HALF_LIFE_SEC } from './ranking';
import {
  canonicalizeSlug,
  createMemoryPageStore,
  epochSecondsToIso,
  toMemoryDisplayTelemetry,
  toMemoryKiId,
} from './page_store';

const T0 = 1_000_000;
const T0_ISO = epochSecondsToIso(T0);

const source = {
  '@timestamp': T0_ISO,
  type: 'memory',
  title: 'Kafka lag',
  description: 'Checkout consumer lag',
  content: 'Scale the consumer.',
  tags: ['memory', 'kafka'],
  attributes: {
    status: 'established' as const,
    slug: 'kafka-lag',
    space_id: 'default',
    impressions: 10,
    conversions: 3,
    last_impression_time: T0_ISO,
    categories: ['kafka'],
    references: [],
    created_at: T0_ISO,
    updated_at: T0_ISO,
    created_by: 'sre',
    updated_by: 'sre',
  },
};

describe('canonicalizeSlug / toMemoryKiId', () => {
  it('strips a memory- prefix copied from document ids', () => {
    expect(canonicalizeSlug('memory-kafka-lag')).toBe('kafka-lag');
    expect(toMemoryKiId('Kafka Lag')).toBe('memory_kafka-lag');
  });
});

describe('createMemoryPageStore', () => {
  const logger = loggerMock.create();

  it('lists pages with raw counters and space-scoped ids', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [{ _id: 'default:memory_kafka-lag', _source: source }],
        },
      }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
      now: () => T0 + HALF_LIFE_SEC,
    });

    const result = await store.list();

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe('memory_kafka-lag');
    expect(result.pages[0].telemetry).toEqual({
      impressions: 10,
      conversions: 3,
      last_impression_time: T0_ISO,
    });
    expect(result.stats.total).toBe(1);
    expect(result.stats.decayed_impressions).toBeCloseTo(5, 10);
    expect(result.stats.decayed_conversions).toBeCloseTo(1.5, 10);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ term: { tags: 'memory' } }, { term: { 'attributes.space_id': 'default' } }],
          },
        },
      }),
      expect.anything()
    );
  });

  it('returns archived pages from get but can filter them from list', async () => {
    const archived = {
      ...source,
      attributes: { ...source.attributes, status: 'archived' as const },
    };
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'default:memory_kafka-lag', _source: archived }] },
      }),
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'default:memory_kafka-lag',
        _source: archived,
      }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
      now: () => T0,
    });

    const listed = await store.list({ status: 'established' });
    expect(listed.pages).toHaveLength(0);

    const got = await store.get('memory_kafka-lag');
    expect(got?.status).toBe('archived');
    expect(got?.telemetry.impressions).toBe(10);
  });

  it('decays display telemetry without rewriting stored last_impression_time', () => {
    const page = {
      id: 'memory_kafka-lag',
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      tags: ['memory'],
      status: 'established' as const,
      space_id: 'default',
      categories: [],
      references: [],
      created_at: T0_ISO,
      updated_at: T0_ISO,
      created_by: 'sre',
      updated_by: 'sre',
      telemetry: {
        impressions: 10,
        conversions: 3,
        last_impression_time: T0_ISO,
      },
    };

    const display = toMemoryDisplayTelemetry(page, T0 + HALF_LIFE_SEC);
    expect(display.last_impression_time).toBe(T0_ISO);
    expect(display.impressions).toBeCloseTo(5, 10);
    expect(display.conversions).toBeCloseTo(1.5, 10);
  });

  it('upserts with a space-prefixed stored id and a single memory tag', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      index: jest.fn().mockResolvedValue({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'marketing',
      now: () => T0,
    });

    const page = await store.upsert({
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      tags: ['memory', 'kafka'],
      categories: [],
      references: [],
      status: 'tentative',
      user: 'sre',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'marketing:memory_kafka-lag',
        document: expect.objectContaining({
          tags: ['memory', 'kafka'],
          attributes: expect.objectContaining({
            space_id: 'marketing',
            impressions: 0,
            conversions: 0,
          }),
        }),
      }),
      expect.anything()
    );
    expect(page.id).toBe('memory_kafka-lag');
    expect(page.telemetry.impressions).toBe(0);
  });

  it('applies useful then unrelated as one bulk write with a shared now', async () => {
    const esClient = {
      mget: jest.fn().mockResolvedValue({
        docs: [{ _id: 'default:memory_kafka-lag', found: true, _source: source }],
      }),
      bulk: jest.fn().mockResolvedValue({ errors: false }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([
      { id: 'memory_kafka-lag', addImp: 1, addConv: 1 },
      { id: 'memory_kafka-lag', addImp: 1, addConv: 0 },
    ]);

    expect(esClient.mget).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    const bulkBody = esClient.bulk.mock.calls[0][0];
    expect(bulkBody.refresh).toBe('wait_for');
    const document = bulkBody.operations[1];
    // decay(10, 7d)=5 then +2 imp; decay(3)=1.5 then +1 conv
    expect(document.attributes.impressions).toBeCloseTo(7, 10);
    expect(document.attributes.conversions).toBeCloseTo(2.5, 10);
    expect(document.attributes.last_impression_time).toBe(epochSecondsToIso(T0 + HALF_LIFE_SEC));
    expect(bulkBody.operations[0]).toEqual({
      index: { _index: MEMORY_AI_INDEX_DEST, _id: 'default:memory_kafka-lag' },
    });
  });

  it('skips archived pages in counter updates', async () => {
    const esClient = {
      mget: jest.fn().mockResolvedValue({
        docs: [
          {
            _id: 'default:memory_kafka-lag',
            found: true,
            _source: {
              ...source,
              attributes: { ...source.attributes, status: 'archived' },
            },
          },
        ],
      }),
      bulk: jest.fn(),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
      now: () => T0,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }]);
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('retrieves browse candidates without a query and search hits with one', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'default:memory_kafka-lag', _source: source }] },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
      now: () => T0,
    });

    const browsed = await store.retrieve({ size: 20 });
    expect(browsed).toHaveLength(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 20,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must_not: [{ term: { 'attributes.status': 'archived' } }],
          }),
        }),
      }),
      expect.anything()
    );

    await store.retrieve({ query: 'checkout lag', size: 50 });
    expect(esClient.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        size: 50,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: [
              expect.objectContaining({
                bool: expect.objectContaining({
                  should: [
                    { match: { title: 'checkout lag' } },
                    { match: { content: 'checkout lag' } },
                  ],
                }),
              }),
            ],
          }),
        }),
      }),
      expect.anything()
    );
    expect(esClient.search.mock.calls[1][0].sort).toBeUndefined();
  });
});
