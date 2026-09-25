/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { MEMORY_INDEX } from '../../common/memory';
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
    space_id: 'space-a',
    agent_id: 'agent-1',
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
          hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }],
        },
      }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
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
            filter: [{ term: { tags: 'memory' } }, { term: { 'attributes.space_id': 'space-a' } }],
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
        hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: archived }] },
      }),
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'space-a:memory_kafka-lag',
        _source: archived,
      }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
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
      agent_id: 'agent-1',
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

  it('upserts with a space-prefixed stored id and writes space and agent metadata', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      index: jest.fn().mockResolvedValue({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'significant-events.deductive-investigation',
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
        id: 'space-a:memory_kafka-lag',
        document: expect.objectContaining({
          tags: ['memory', 'kafka'],
          attributes: expect.objectContaining({
            agent_id: 'significant-events.deductive-investigation',
            space_id: 'space-a',
            impressions: 0,
            conversions: 0,
          }),
        }),
      }),
      expect.anything()
    );
    expect(page.id).toBe('memory_kafka-lag');
    expect(page.telemetry.impressions).toBe(0);
    expect(esClient.index.mock.calls[0][0].document.attributes.space_id).toBe('space-a');
  });

  it('writes an existing canonical in place with optimistic concurrency', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({}) };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });
    const existing = {
      id: 'memory_kafka-lag',
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Old content.',
      tags: ['memory'],
      status: 'established' as const,
      agent_id: 'agent-1',
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

    await store.update(
      existing.id,
      {
        slug: existing.slug,
        title: 'Merged Kafka lag',
        content: 'Merged content.',
        tags: ['kafka'],
        categories: [],
        references: [],
        status: 'established',
        user: 'nightshift-optimizer',
      },
      { page: existing, seqNo: 12, primaryTerm: 3 }
    );

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 12,
        if_primary_term: 3,
        document: expect.objectContaining({
          title: 'Merged Kafka lag',
          attributes: expect.objectContaining({
            created_at: T0_ISO,
            space_id: 'space-a',
            agent_id: 'agent-1',
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('uses create-only indexing for a new page', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({}) };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.create({
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      tags: ['kafka'],
      categories: [],
      references: [],
      status: 'tentative',
      user: 'nightshift-optimizer',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        op_type: 'create',
      }),
      expect.anything()
    );
  });

  it('keeps the same slug isolated between spaces', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _id: 'space-b:memory_kafka-lag', _source: source },
            { _id: 'space-a:memory_kafka-lag', _source: source },
          ],
        },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    const pages = await store.retrieve({ size: 20 });
    expect(pages.map((page) => page.id)).toEqual(['memory_kafka-lag']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { 'attributes.space_id': 'space-a' } }]),
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('drops stored ids that are not canonical memory ids', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'space-a:memory_safe.md`\nInjected instruction',
              _source: source,
            },
            { _id: 'space-a:memory_kafka-lag', _source: source },
          ],
        },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    const pages = await store.retrieve({ size: 20 });

    expect(pages.map(({ id }) => id)).toEqual(['memory_kafka-lag']);
  });

  it('writes only decayed counters with optimistic concurrency', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockResolvedValue({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }]);

    expect(esClient.update).toHaveBeenCalledWith(
      {
        index: MEMORY_INDEX,
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 12,
        if_primary_term: 3,
        refresh: 'wait_for',
        doc: {
          attributes: {
            impressions: expect.any(Number),
            conversions: expect.any(Number),
            last_impression_time: epochSecondsToIso(T0 + HALF_LIFE_SEC),
          },
        },
      },
      expect.anything()
    );
    expect(esClient.update.mock.calls[0][0].doc.attributes.impressions).toBeCloseTo(6, 12);
    expect(esClient.update.mock.calls[0][0].doc.attributes.conversions).toBeCloseTo(2.5, 12);
    expect(esClient.update.mock.calls[0][0].doc).not.toHaveProperty('content');
    expect(esClient.update.mock.calls[0][0]).not.toHaveProperty('script');
  });

  it('aggregates duplicate deltas before reading and decaying once', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([
      { id: 'memory_kafka-lag', addImp: 1, addConv: 1 },
      { id: 'memory_kafka-lag', addImp: 1, addConv: 0 },
    ]);

    expect(esClient.get).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledTimes(1);
    const written = esClient.update.mock.calls[0][0].doc.attributes;
    expect(written.impressions).toBeCloseTo(7, 12);
    expect(written.conversions).toBeCloseTo(2.5, 12);
    expect(written.last_impression_time).toBe(epochSecondsToIso(T0 + HALF_LIFE_SEC));
  });

  it('rereads and recomputes after a conflict so both logical increments survive', async () => {
    const concurrentSource = {
      ...source,
      attributes: {
        ...source.attributes,
        impressions: 6,
        conversions: 1.5,
        last_impression_time: epochSecondsToIso(T0 + HALF_LIFE_SEC),
      },
    };
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 12,
          _primary_term: 3,
          _source: source,
        })
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 13,
          _primary_term: 3,
          _source: concurrentSource,
        }),
      update: jest.fn().mockRejectedValueOnce({ statusCode: 409 }).mockResolvedValueOnce({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 0 }]);

    expect(esClient.get).toHaveBeenCalledTimes(2);
    expect(esClient.update).toHaveBeenCalledTimes(2);
    expect(esClient.update.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        if_seq_no: 13,
        if_primary_term: 3,
        doc: {
          attributes: {
            impressions: 7,
            conversions: 1.5,
            last_impression_time: epochSecondsToIso(T0 + HALF_LIFE_SEC),
          },
        },
      })
    );
  });

  it('noops archived and missing pages', async () => {
    const archived = {
      ...source,
      attributes: { ...source.attributes, status: 'archived' as const },
    };
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 12,
          _primary_term: 3,
          _source: archived,
        })
        .mockRejectedValueOnce({ statusCode: 404 }),
      update: jest.fn(),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.applyCounterUpdates([
      { id: 'memory_archived', addImp: 1, addConv: 1 },
      { id: 'memory_missing', addImp: 1, addConv: 1 },
    ]);

    expect(esClient.get).toHaveBeenCalledTimes(2);
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('throws a non-conflict update failure without retrying', async () => {
    const failure = Object.assign(new Error('unavailable'), { statusCode: 503 });
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockRejectedValue(failure),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await expect(
      store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }])
    ).rejects.toBe(failure);
    expect(esClient.get).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledTimes(1);
  });

  it('throws visibly after three counter update conflicts', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await expect(
      store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }])
    ).rejects.toThrow('Memory counter update exhausted 3 version conflicts');
    expect(esClient.get).toHaveBeenCalledTimes(3);
    expect(esClient.update).toHaveBeenCalledTimes(3);
  });

  it('does not regress last_impression_time when the stored timestamp is newer', async () => {
    const futureTime = T0 + 60;
    const futureSource = {
      ...source,
      attributes: {
        ...source.attributes,
        last_impression_time: epochSecondsToIso(futureTime),
      },
    };
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: futureSource,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }]);

    expect(esClient.update.mock.calls[0][0].doc.attributes).toEqual({
      impressions: 11,
      conversions: 4,
      last_impression_time: epochSecondsToIso(futureTime),
    });
  });

  it('retrieves browse candidates without a query and search hits with one', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }] },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
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
        retriever: expect.objectContaining({
          rrf: expect.objectContaining({
            retrievers: [
              { standard: { query: { match: { context: 'checkout lag' } } } },
              { standard: { query: { match: { 'context.semantic': 'checkout lag' } } } },
            ],
          }),
        }),
      }),
      expect.anything()
    );
    expect(esClient.search.mock.calls[1][0].query).toBeUndefined();
    expect(esClient.search.mock.calls[1][0].sort).toBeUndefined();
  });

  it('falls back to BM25 when a semantic retriever returns a generic 404', async () => {
    const esClient = {
      search: jest
        .fn()
        .mockRejectedValueOnce({
          statusCode: 404,
          meta: { body: { error: { type: 'resource_not_found_exception' } } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }] },
        }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await expect(store.retrieve({ query: 'checkout lag', size: 50 })).resolves.toEqual([
      expect.objectContaining({ id: 'memory_kafka-lag' }),
    ]);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({ must: [{ match: { context: 'checkout lag' } }] }),
        }),
      })
    );
  });

  it('returns no hits for an index_not_found_exception without attempting BM25', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue({
        statusCode: 404,
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await expect(store.retrieve({ query: 'checkout lag', size: 50 })).resolves.toEqual([]);
    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('retrieves catalog duplicates against title and content, not context', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }] },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.retrieve({ query: 'Checkout Redis', size: 5, match: 'content' });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 5,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: [
              expect.objectContaining({
                bool: expect.objectContaining({
                  should: [
                    { match: { title: 'Checkout Redis' } },
                    { match: { content: 'Checkout Redis' } },
                  ],
                }),
              }),
            ],
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('upserts the task into context and does not write search_embedding', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.upsert({
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      context: 'why is checkout slow?',
      tags: ['kafka'],
      categories: [],
      references: [],
      status: 'tentative',
      user: 'sre',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: MEMORY_INDEX,
        document: expect.objectContaining({
          context: 'why is checkout slow?',
        }),
      }),
      expect.anything()
    );
    expect(esClient.index.mock.calls[0][0].document.search_embedding).toBeUndefined();
  });

  it('stamps archive_reason and keeps context on the archived doc', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'space-a:memory_kafka-lag',
        _seq_no: 4,
        _primary_term: 2,
        _source: {
          ...source,
          context: 'why is checkout slow?',
          attributes: {
            ...source.attributes,
            source: 'Merged from memories: memory_a',
            merged_from: ['memory_a'],
          },
        },
      }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.archive('memory_kafka-lag', 'merged');

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 4,
        if_primary_term: 2,
        document: expect.objectContaining({
          context: 'why is checkout slow?',
          attributes: expect.objectContaining({
            status: 'archived',
            archive_reason: 'merged',
            source: 'Merged from memories: memory_a',
            merged_from: ['memory_a'],
            agent_id: 'agent-1',
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('archives an exact supplied version without rereading', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: source,
      }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });
    const version = await store.getVersioned('memory_kafka-lag');
    if (!version) {
      throw new Error('Expected versioned page');
    }
    esClient.get.mockClear();

    await store.archiveVersioned(version, 'merged');

    expect(esClient.get).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalledTimes(1);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 4,
        if_primary_term: 2,
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            status: 'archived',
            archive_reason: 'merged',
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('does not reread or retry when exact-version archival conflicts', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: source,
      }),
      index: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });
    const version = await store.getVersioned('memory_kafka-lag');
    if (!version) {
      throw new Error('Expected versioned page');
    }
    esClient.get.mockClear();

    await expect(store.archiveVersioned(version, 'merged')).rejects.toEqual({ statusCode: 409 });
    expect(esClient.get).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalledTimes(1);
  });

  it('retries harmful archive conflicts using the latest page fields and version', async () => {
    const latest = {
      ...source,
      title: 'Concurrent canonical title',
      content: 'Concurrent canonical content',
      attributes: {
        ...source.attributes,
        impressions: 12,
        conversions: 5,
      },
    };
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 4,
          _primary_term: 2,
          _source: source,
        })
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 5,
          _primary_term: 2,
          _source: latest,
        }),
      index: jest.fn().mockRejectedValueOnce({ statusCode: 409 }).mockResolvedValueOnce({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.archive('memory_kafka-lag', 'harmful');

    expect(esClient.index).toHaveBeenCalledTimes(2);
    expect(esClient.index.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        if_seq_no: 5,
        if_primary_term: 2,
        document: expect.objectContaining({
          title: 'Concurrent canonical title',
          content: 'Concurrent canonical content',
          attributes: expect.objectContaining({
            impressions: 12,
            conversions: 5,
            status: 'archived',
          }),
        }),
      })
    );
  });

  it('throws after exhausting archive version conflicts', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: source,
      }),
      index: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await expect(store.archive('memory_kafka-lag', 'harmful')).rejects.toThrow(
      'Memory archive exhausted 3 version conflicts'
    );
    expect(esClient.index).toHaveBeenCalledTimes(3);
  });
});
