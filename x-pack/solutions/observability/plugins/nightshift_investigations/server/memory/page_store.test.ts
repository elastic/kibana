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

  it('applies useful then unrelated as one bulk write with a shared now', async () => {
    const esClient = {
      bulk: jest.fn().mockResolvedValue({ errors: false }),
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

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    const bulkBody = esClient.bulk.mock.calls[0][0];
    expect(bulkBody.refresh).toBe('wait_for');
    expect(bulkBody.operations[0]).toEqual({
      update: {
        _index: MEMORY_INDEX,
        _id: 'space-a:memory_kafka-lag',
        retry_on_conflict: 3,
      },
    });
    expect(bulkBody.operations[1]).toEqual({
      script: expect.objectContaining({
        source: expect.stringContaining("attributes.status == 'archived'"),
        params: {
          now: T0 + HALF_LIFE_SEC,
          decayLambda: Math.log(2) / HALF_LIFE_SEC,
          addImp: 2,
          addConv: 1,
        },
      }),
      scripted_upsert: true,
      upsert: {},
    });
  });

  it('throws when a counter bulk write contains item errors', async () => {
    const esClient = {
      bulk: jest.fn().mockResolvedValue({ errors: true }),
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
    ).rejects.toThrow('Memory counter bulk update failed');
  });

  it('uses a scripted upsert that noops archived pages and missing docs', async () => {
    const esClient = {
      bulk: jest.fn().mockResolvedValue({ errors: false }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      agentId: 'agent-1',
      now: () => T0,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }]);
    const operations = esClient.bulk.mock.calls[0][0].operations;
    expect(operations[0]).toHaveProperty('update');
    expect(operations[1]).toMatchObject({ scripted_upsert: true, upsert: {} });
    expect(operations[1].script.source).toContain("ctx.op == 'create'");
    expect(operations[1].script.source).toContain("ctx.op = 'noop'");
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
});
