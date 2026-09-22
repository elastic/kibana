/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  MEMORY_CRITIQUE_SYSTEM_PROMPT,
  MEMORY_EXTRACT_GUIDELINES,
  MEMORY_EXTRACT_SYSTEM_PROMPT,
  applyMemoryEdits,
  canonicalizeMemoryLabelId,
  canonicalizeMemoryLabelIds,
  contentOverlap,
  createLlmProposeMemoryExtractions,
  isDuplicateExtraction,
  optimizeMemory,
  unwrapUserTask,
} from './optimize';
import type { MemoryPageStore } from './page_store';
import type { MemoryPage } from '../../common/memory';

const page = (id: string, title = id, content = 'body'): MemoryPage => ({
  id,
  slug: id.replace(/^memory_/, ''),
  title,
  content,
  tags: ['memory'],
  status: 'established',
  agent_id: 'agent-1',
  categories: [],
  references: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  created_by: 'sre',
  updated_by: 'sre',
  telemetry: {
    impressions: 1,
    conversions: 0,
    last_impression_time: '2026-01-01T00:00:00.000Z',
  },
});

const createStore = (overrides: Partial<MemoryPageStore> = {}): MemoryPageStore =>
  ({
    list: jest.fn(),
    retrieve: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    getByName: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
    applyCounterUpdates: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue({}),
    delete: jest.fn(),
    pruneDuplicates: jest.fn(),
    ...overrides,
  } as MemoryPageStore);

describe('createLlmProposeMemoryExtractions', () => {
  it('normalizes object-shaped merge target groups from the bound model', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        merge_targets: [{ ids: ['memory_a', 'memory_b'] }],
        extractions: [],
      },
    });
    const propose = createLlmProposeMemoryExtractions({
      inferenceClient: { output } as never,
    });

    await expect(propose({ transcript: 'task', recalledMemories: [] })).resolves.toEqual({
      mergeTargets: [['memory_a', 'memory_b']],
      extractions: [],
    });
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            merge_targets: expect.objectContaining({
              items: expect.objectContaining({ type: 'object' }),
            }),
          }),
        }),
      })
    );
  });
});

describe('canonicalizeMemoryLabelId', () => {
  it('keeps a raw page id', () => {
    expect(canonicalizeMemoryLabelId('memory_checkout-redis-evictions')).toBe(
      'memory_checkout-redis-evictions'
    );
  });

  it('extracts id= from a recalled-line echo', () => {
    expect(
      canonicalizeMemoryLabelId(
        "id=memory_checkout-redis-evictions | title='Checkout Redis evictions' | content='Checkout latency'"
      )
    ).toBe('memory_checkout-redis-evictions');
  });

  it('dedupes a mixed list', () => {
    expect(
      canonicalizeMemoryLabelIds([
        'memory_a',
        'id=memory_a | title="A"',
        'not a memory id',
        'memory_b',
      ])
    ).toEqual(['memory_a', 'memory_b']);
  });
});

describe('applyMemoryEdits', () => {
  it('archives harmful ids and batches useful/unrelated counter updates', async () => {
    const store = createStore();

    const summary = await applyMemoryEdits({
      store,
      recalledIds: ['memory_a', 'memory_b', 'memory_c'],
      labels: { useful: ['memory_a', 'memory_not_recalled'], harmful: ['memory_c'] },
      extractions: [],
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith('memory_c', 'harmful');
    expect(store.applyCounterUpdates).toHaveBeenCalledWith([
      { id: 'memory_a', addImp: 1, addConv: 1 },
      { id: 'memory_b', addImp: 1, addConv: 0 },
    ]);
    expect(store.list).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({
        usefulCount: 1,
        harmfulCount: 1,
        harmfulArchiveCount: 1,
        extractionProposedCount: 0,
      })
    );
  });

  it('archives when the critique echoes the recalled line instead of a raw id', async () => {
    const store = createStore();

    await applyMemoryEdits({
      store,
      recalledIds: ['memory_checkout-redis-evictions'],
      labels: {
        useful: [],
        harmful: [
          "id=memory_checkout-redis-evictions | title='Checkout Redis evictions' | content='Checkout latency followed Redis memory eviction on the cart cache.'",
        ],
      },
      extractions: [],
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith('memory_checkout-redis-evictions', 'harmful');
    expect(store.applyCounterUpdates).toHaveBeenCalledWith([]);
  });

  it('merges an extraction that duplicates a recalled page instead of upserting it', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag', 'Scale the consumer.');
    source.context = 'why is checkout slow redis lag';
    source.telemetry = {
      impressions: 2,
      conversions: 1,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    };
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: ['memory_kafka-lag'],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: 'Kafka consumer lag',
          content: 'Same fact, new slug.',
          tags: ['kafka'],
          categories: ['ops'],
        },
      ],
      context:
        'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/x` — X\n</system_update>',
      synthesizeMemoryGroup: async () => ({
        title: 'Checkout Kafka lag',
        content: 'Checkout consumer lag is a durable fact.',
        context: 'checkout latency kafka consumer lag',
      }),
      now: () => Date.parse('2026-01-01T00:00:00.000Z') / 1000,
      logger: loggerMock.create(),
    });

    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout-kafka-lag',
        context: 'checkout latency kafka consumer lag',
        status: 'established',
        source: 'Merged from memories: memory_kafka-lag, memory_checkout-kafka',
        merged_from: ['memory_kafka-lag', 'memory_checkout-kafka'],
        user: 'nightshift-optimizer',
        telemetry: expect.objectContaining({ impressions: 2, conversions: 1 }),
      })
    );
    expect(store.archive).toHaveBeenCalledWith('memory_kafka-lag', 'merged');
    expect(store.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'checkout-kafka' })
    );
    expect(summary).toEqual(
      expect.objectContaining({
        extractionProposedCount: 1,
        mergeAttemptCount: 1,
        mergeSuccessCount: 1,
        mergedSourceArchiveCount: 1,
        standaloneUpsertCount: 0,
      })
    );
  });

  it('does not merge when synthesis returns an empty context', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag');
    source.context = 'why is checkout slow';
    const store = createStore({
      get: jest.fn().mockResolvedValue(source),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: ['memory_kafka-lag'],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: 'Kafka consumer lag',
          content: 'Same fact.',
          tags: [],
          categories: [],
        },
      ],
      context: 'why is checkout slow?',
      synthesizeMemoryGroup: async () => ({
        title: 'Merged',
        content: 'Body',
        context: '',
      }),
      logger: loggerMock.create(),
    });

    expect(store.upsert).not.toHaveBeenCalled();
    expect(store.archive).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 0 })
    );
  });

  it('merges a catalog overlap and sums decayed telemetry', async () => {
    const hit = page(
      'memory_checkout-redis',
      'Checkout Redis',
      'Checkout uses Redis db 2 for sessions and evicts on memory pressure.'
    );
    hit.telemetry = {
      impressions: 4,
      conversions: 2,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    };
    const store = createStore({
      retrieve: jest.fn().mockResolvedValue([hit]),
      get: jest.fn().mockImplementation(async (id: string) => (id === hit.id ? hit : undefined)),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'redis-sessions',
          title: 'Checkout Redis',
          content: 'Checkout uses Redis db 2 for sessions and evicts on memory pressure.',
          tags: [],
          categories: [],
        },
      ],
      context: 'redis eviction on cart cache',
      synthesizeMemoryGroup: async () => ({
        title: 'Checkout cart cache',
        content: 'Checkout sessions live in Redis and evict under memory pressure.',
        context: 'checkout latency redis cart-cache evictions',
      }),
      now: () => Date.parse('2026-01-01T00:00:00.000Z') / 1000,
      logger: loggerMock.create(),
    });

    expect(store.retrieve).toHaveBeenCalledWith({
      query: 'Checkout Redis',
      size: 5,
      match: 'content',
    });
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout-cart-cache',
        telemetry: expect.objectContaining({ impressions: 4, conversions: 2 }),
      })
    );
    expect(store.archive).toHaveBeenCalledWith('memory_checkout-redis', 'merged');
    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 1 })
    );
  });

  it('still upserts when a catalog hit is the same slug', async () => {
    const store = createStore({
      retrieve: jest.fn().mockResolvedValue([page('memory_checkout-redis', 'Checkout Redis')]),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          content: 'Checkout uses Redis db 2 for sessions.',
          tags: [],
          categories: [],
        },
      ],
      logger: loggerMock.create(),
    });

    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ slug: 'checkout-redis' }));
  });

  it('skips extractions that look like secrets', async () => {
    const store = createStore();

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-token',
          title: 'Checkout API token',
          content: 'api_key=sk-live-not-a-real-key',
          tags: [],
          categories: [],
        },
      ],
      logger: loggerMock.create(),
    });

    expect(store.upsert).not.toHaveBeenCalled();
    expect(store.retrieve).not.toHaveBeenCalled();
    expect(summary.safetySkipCount).toBe(1);
  });
});

describe('isDuplicateExtraction / contentOverlap', () => {
  it('scores identical text as 1 and disjoint text as 0', () => {
    expect(contentOverlap('checkout uses redis sessions', 'checkout uses redis sessions')).toBe(1);
    expect(contentOverlap('checkout uses redis sessions', 'unrelated kafka lag')).toBe(0);
  });

  it('treats recalled title matches as duplicates even when slugs differ', () => {
    expect(
      isDuplicateExtraction({
        extra: {
          slug: 'checkout-kafka',
          title: 'Kafka consumer lag',
          content: 'Scale the consumer.',
          tags: [],
          categories: [],
        },
        recalledIds: ['memory_kafka-lag'],
        recalledMemories: [page('memory_kafka-lag', 'Kafka consumer lag')],
        catalogHits: [],
      })
    ).toBe(true);
  });
});

describe('optimizeMemory', () => {
  it('labels only recalled pages fetched by id, not store.list()', async () => {
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockResolvedValue({ useful: ['memory_a'], harmful: [] });
    const proposeExtractions = jest.fn().mockResolvedValue({ extractions: [], mergeTargets: [] });

    await optimizeMemory({
      store,
      recalledIds: ['memory_a'],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      logger: loggerMock.create(),
    });

    expect(store.list).not.toHaveBeenCalled();
    expect(proposeLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        recalledMemories: [expect.objectContaining({ id: 'memory_a' })],
      })
    );
    expect(store.applyCounterUpdates).toHaveBeenCalledWith([
      { id: 'memory_a', addImp: 1, addConv: 1 },
    ]);
  });

  it('still extracts on a cold-start round with no recalled pages', async () => {
    const store = createStore();
    const proposeLabels = jest.fn();
    const proposeExtractions = jest.fn().mockResolvedValue({
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          content: 'Checkout uses Redis db 2 for sessions.',
          tags: ['redis'],
          categories: [],
        },
      ],
      mergeTargets: [],
    });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      logger: loggerMock.create(),
    });

    expect(proposeLabels).not.toHaveBeenCalled();
    expect(proposeExtractions).toHaveBeenCalled();
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout-redis',
        status: 'tentative',
        context: 'why is checkout slow?',
      })
    );
  });

  it('stores extract context as the task with system_update removed', async () => {
    const store = createStore();
    const proposeLabels = jest.fn();
    const proposeExtractions = jest.fn().mockResolvedValue({
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          content: 'Checkout uses Redis db 2 for sessions.',
          tags: [],
          categories: [],
        },
      ],
      mergeTargets: [],
    });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      userMessage:
        'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/workspace/memories/memory_a.md` — Alpha\n</system_update>',
      assistantMessage: 'Redis evictions on checkout.',
      logger: loggerMock.create(),
    });

    expect(unwrapUserTask).toBeDefined();
    expect(store.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'why is checkout slow?' })
    );
  });

  it('does not extract when the assistant message is empty', async () => {
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockResolvedValue({ useful: [], harmful: [] });
    const proposeExtractions = jest.fn();

    await optimizeMemory({
      store,
      recalledIds: ['memory_a'],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: '   ',
      logger: loggerMock.create(),
    });

    expect(proposeExtractions).not.toHaveBeenCalled();
    expect(store.applyCounterUpdates).toHaveBeenCalledWith([
      { id: 'memory_a', addImp: 1, addConv: 0 },
    ]);
  });
});

describe('extraction prompts', () => {
  it('forbids generic tool-resolution writeups', () => {
    expect(MEMORY_CRITIQUE_SYSTEM_PROMPT).toContain('conservative');
    expect(MEMORY_EXTRACT_SYSTEM_PROMPT).toContain('customer');
    expect(MEMORY_EXTRACT_GUIDELINES).toContain('NEVER EXTRACT');
    expect(MEMORY_EXTRACT_GUIDELINES).toContain('Generic "how to use X"');
    expect(MEMORY_EXTRACT_GUIDELINES).toContain('**EXTRACT**');
    expect(MEMORY_EXTRACT_GUIDELINES).not.toContain('tool resolutions');
  });
});
