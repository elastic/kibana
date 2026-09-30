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
  createLlmProposeMemoryLabels,
  createLlmSynthesizeMemoryGroup,
  formatMemoryMergeSources,
  formatRecalled,
  isDuplicateExtraction,
  MAX_MERGE_TASK_TOKENS,
  OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT,
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

const createStore = (overrides: Partial<MemoryPageStore> = {}): MemoryPageStore => {
  const get = overrides.get ?? jest.fn();
  return {
    list: jest.fn(),
    retrieve: jest.fn().mockResolvedValue([]),
    get,
    getVersioned: jest.fn(async (id: string) => {
      const current = await get(id);
      return current ? { page: current, seqNo: 1, primaryTerm: 1 } : undefined;
    }),
    getByName: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    applyCounterUpdates: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue({}),
    archiveVersioned: jest.fn().mockResolvedValue({}),
    delete: jest.fn(),
    ...overrides,
  } as MemoryPageStore;
};

describe('formatRecalled', () => {
  it('shows id and facts beyond character 150, and hides the recall key', () => {
    const memory = page('memory_long');
    memory.context = 'checkout latency';
    memory.content = `${'x'.repeat(150)}FACT_AFTER_150`;

    const formatted = formatRecalled([memory]);

    expect(formatted).not.toContain('checkout latency');
    expect(formatted).not.toContain('context:');
    expect(formatted).toContain('FACT_AFTER_150');
  });

  it('is deterministic, capped, and truncates only final-page content', () => {
    const first = page('memory_first', 'First', 'FIRST_COMPLETE');
    const second = page('memory_second', 'Second', 'SECOND_COMPLETE');
    const third = page('memory_third', 'Third', 'z'.repeat(65_000));

    const formatted = formatRecalled([first, second, third], 1_000);

    expect(formatted).toBe(formatRecalled([first, second, third], 1_000));
    expect(formatted.length).toBeLessThanOrEqual(4_000);
    expect(formatted).toContain('id=memory_first');
    expect(formatted).toContain('FIRST_COMPLETE');
    expect(formatted).toContain('id=memory_second');
    expect(formatted).toContain('SECOND_COMPLETE');
    expect(formatted).toContain('id=memory_third');
    expect(formatted).not.toContain('z'.repeat(65_000));
  });

  it('bounds a huge title and recall key while retaining every selected id and some content', () => {
    const first = page('memory_huge-first', 't'.repeat(65_000), 'FIRST_CONTENT_VISIBLE');
    first.context = 'c'.repeat(65_000);
    const second = page('memory_huge-second', 'u'.repeat(65_000), 'SECOND_CONTENT_VISIBLE');
    second.context = 'd'.repeat(65_000);

    const formatted = formatRecalled([first, second]);

    expect(formatted.length).toBeLessThanOrEqual(OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT);
    expect(formatted).toContain('id=memory_huge-first');
    expect(formatted).toContain('id=memory_huge-second');
    expect(formatted).toContain('FIRST_CONTENT_VISIBLE');
    expect(formatted).toContain('SECOND_CONTENT_VISIBLE');
    expect(formatted).not.toContain('c'.repeat(100));
    expect(formatted).not.toContain('d'.repeat(100));
  });
});

describe('formatMemoryMergeSources', () => {
  it('includes source and extract facts beyond character 1,500', () => {
    const source = page('memory_long-source');
    source.content = `${'s'.repeat(1_600)}SOURCE_FACT`;
    const formatted = formatMemoryMergeSources({
      sources: [source],
      extract: {
        slug: 'long-extract',
        title: 'Long extract',
        content: `${'e'.repeat(1_600)}EXTRACT_FACT`,
        tags: [],
        categories: [],
        replaces: [],
        note: '',
      },
    });

    expect(formatted).toContain('SOURCE_FACT');
    expect(formatted).toContain('EXTRACT_FACT');
  });

  it('uses a deterministic total cap and stops after truncating the final included source', () => {
    const first = page('memory_first');
    first.content = 'a'.repeat(20_000);
    const second = page('memory_second');
    second.content = 'b'.repeat(20_000);
    const third = page('memory_third', 'Third', 'must-not-appear');

    const formatted = formatMemoryMergeSources({
      sources: [first, second, third],
      maxTokens: 6_000,
    });

    expect(formatted).toBe(
      formatMemoryMergeSources({ sources: [first, second, third], maxTokens: 6_000 })
    );
    expect(formatted.length).toBeLessThanOrEqual(24_000);
    expect(formatted).toContain('id=memory_first');
    expect(formatted).toContain('id=memory_second');
    expect(formatted).not.toContain('id=memory_third');
  });

  it('budgets a 65K task together with source and extract signal', async () => {
    const output = jest.fn().mockResolvedValue({
      output: { content: 'Merged content', context: 'Merged context' },
    });
    const synthesize = createLlmSynthesizeMemoryGroup({
      inferenceClient: { output } as never,
    });
    const first = page('memory_first', 'First source', `FIRST_SIGNAL${'a'.repeat(40_000)}`);
    const second = page('memory_second', 'Second source', `SECOND_SIGNAL${'b'.repeat(40_000)}`);
    const task = `TASK_SIGNAL${'t'.repeat(65_536 - 'TASK_SIGNAL'.length)}`;

    await synthesize({
      sources: [first, second],
      extract: {
        slug: 'new-extract',
        title: 'New extract',
        content: `EXTRACT_SIGNAL${'e'.repeat(40_000)}`,
        tags: [],
        categories: [],
        replaces: [],
        note: '',
      },
      task,
    });

    const input = output.mock.calls[0][0].input as string;
    expect(input.length).toBeLessThanOrEqual(OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT);
    expect(input).toContain('id=memory_first');
    expect(input).toContain('id=memory_second');
    expect(input).toContain('FIRST_SIGNAL');
    expect(input).toContain('SECOND_SIGNAL');
    expect(input).toContain('EXTRACT_SIGNAL');
    expect(input).toContain('TASK_SIGNAL');
    expect(input).toContain(task.slice(0, MAX_MERGE_TASK_TOKENS * 4));
    expect(input).not.toContain(task.slice(0, MAX_MERGE_TASK_TOKENS * 4 + 1));
  });
});

describe('createLlmProposeMemoryExtractions', () => {
  it('parses replaces as canonical ids and keeps a content-free entry only when it replaces', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            title: 'Kafka lag',
            content: '',
            replaces: ['id=memory_a | title=A', 'memory_b'],
            note: 'Both say the same thing.',
          },
          { title: 'Empty', content: '', replaces: [] },
        ],
      },
    });
    const propose = createLlmProposeMemoryExtractions({
      inferenceClient: { output } as never,
    });

    await expect(propose({ transcript: 'task', recalledMemories: [] })).resolves.toEqual({
      extractions: [
        {
          slug: 'kafka-lag',
          title: 'Kafka lag',
          content: '',
          tags: [],
          categories: [],
          replaces: ['memory_a', 'memory_b'],
          note: 'Both say the same thing.',
        },
      ],
    });
  });

  it('rejects a secret-bearing raw title before canonicalization can hide it', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            title: 'api_key=sk-live-not-a-real-key',
            content: 'Harmless content',
            tags: [],
            categories: [],
          },
        ],
      },
    });
    const propose = createLlmProposeMemoryExtractions({
      inferenceClient: { output } as never,
    });

    await expect(propose({ transcript: 'task', recalledMemories: [] })).resolves.toEqual({
      extractions: [],
    });
  });

  it('asks for one title and derives the slug from it', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            slug: 'ignored-model-slug',
            title: '  Checkout Redis evictions ',
            content: 'Checkout latency followed Redis evictions.',
          },
        ],
      },
    });
    const propose = createLlmProposeMemoryExtractions({
      inferenceClient: { output } as never,
    });

    await expect(propose({ transcript: 'task', recalledMemories: [] })).resolves.toEqual({
      extractions: [
        {
          slug: 'checkout-redis-evictions',
          title: 'Checkout Redis evictions',
          content: 'Checkout latency followed Redis evictions.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
    });
    const { schema } = output.mock.calls[0][0];
    const item = schema.properties.extractions.items;
    expect(Object.keys(item.properties)).not.toContain('slug');
    expect(item.required).toEqual(['title', 'content', 'replaces']);
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
    source.merged_from = ['memory_original-kafka-lag'];
    source.references = ['https://runbooks.example/kafka-lag'];
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
          replaces: [],
          note: '',
        },
      ],
      context:
        'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/x` — X\n</system_update>',
      synthesizeMemoryGroup: async () => ({
        content: 'Checkout consumer lag is a durable fact.',
        context: 'checkout latency kafka consumer lag',
      }),
      now: () => Date.parse('2026-01-01T00:00:00.000Z') / 1000,
      logger: loggerMock.create(),
    });

    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'kafka-consumer-lag',
        title: 'Kafka consumer lag',
        context: 'checkout latency kafka consumer lag',
        status: 'established',
        source:
          'Merged from memories: memory_kafka-lag, memory_original-kafka-lag, memory_checkout-kafka',
        merged_from: ['memory_kafka-lag', 'memory_original-kafka-lag', 'memory_checkout-kafka'],
        references: ['https://runbooks.example/kafka-lag'],
        user: 'nightshift-optimizer',
        telemetry: expect.objectContaining({ impressions: 2, conversions: 1 }),
      })
    );
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({ id: 'memory_kafka-lag' }),
        seqNo: 1,
        primaryTerm: 1,
      }),
      'merged'
    );
    expect(store.create).not.toHaveBeenCalledWith(
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

  it('consumes later extraction proposals that overlap an existing merge group', async () => {
    const source = page(
      'memory_checkout-redis',
      'Checkout Redis sessions',
      'Checkout stores sessions in Redis.'
    );
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
      retrieve: jest.fn().mockResolvedValue([source]),
    });
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({
      content: 'Checkout stores sessions in Redis.',
      context: 'checkout redis sessions',
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-session-store',
          title: 'Checkout Redis sessions',
          content: 'Checkout stores sessions in Redis.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
        {
          slug: 'redis-session-backend',
          title: 'Checkout Redis sessions',
          content: 'Checkout stores sessions in Redis.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledTimes(1);
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'redis-session-backend' })
    );
    expect(summary).toEqual(
      expect.objectContaining({
        extractionProposedCount: 2,
        mergeAttemptCount: 1,
        mergeSuccessCount: 1,
        standaloneUpsertCount: 0,
      })
    );
  });

  it('does not publish or archive when a source becomes harmful during synthesis', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag');
    let current = { page: source, seqNo: 1, primaryTerm: 1 };
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
      getVersioned: jest.fn(async () => current),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: source.title,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => {
        current = {
          page: { ...source, status: 'archived', archive_reason: 'harmful' },
          seqNo: 2,
          primaryTerm: 1,
        };
        return { content: 'Body', context: 'kafka lag' };
      },
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary.mergeSuccessCount).toBe(0);
  });

  it('resynthesizes from refreshed content when a live source changes', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag', 'Old fact.');
    const refreshed = { ...source, content: 'Refreshed fact.' };
    let current = { page: source, seqNo: 1, primaryTerm: 1 };
    const synthesizedSourceContents: string[][] = [];
    const synthesizeMemoryGroup = jest.fn(async ({ sources }: { sources: MemoryPage[] }) => {
      synthesizedSourceContents.push(sources.map(({ content }) => content));
      if (current.seqNo === 1) {
        current = { page: refreshed, seqNo: 2, primaryTerm: 1 };
      }
      return { content: current.page.content, context: 'kafka lag' };
    });
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
      getVersioned: jest.fn(async () => current),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: source.title,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledTimes(2);
    expect(synthesizedSourceContents[1]).toEqual(['Refreshed fact.']);
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Refreshed fact.' })
    );
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({ content: 'Refreshed fact.' }),
        seqNo: 2,
        primaryTerm: 1,
      }),
      'merged'
    );
    expect(summary.mergeSuccessCount).toBe(1);
  });

  it('preserves sources when repeated live changes exhaust merge attempts', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag');
    let seqNo = 1;
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
      getVersioned: jest.fn(async () => ({
        page: { ...source, content: `Fact ${seqNo}` },
        seqNo,
        primaryTerm: 1,
      })),
    });
    const synthesizeMemoryGroup = jest.fn(async () => {
      seqNo += 1;
      return { title: 'Merged Kafka', content: `Fact ${seqNo}`, context: 'kafka lag' };
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: source.title,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledTimes(3);
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ mergeSuccessCount: 0, writeFailureCount: 1 })
    );
  });

  it('archives non-canonical sources only after the canonical commit', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag');
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: source.title,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
        context: 'kafka lag',
      }),
      logger: loggerMock.create(),
    });

    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({ id: source.id }),
        seqNo: 1,
        primaryTerm: 1,
      }),
      'merged'
    );
    expect((store.create as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (store.archiveVersioned as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it('leaves a concurrently changed source live when guarded archival conflicts', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag', 'Original fact.');
    const newerSource = { ...source, content: 'New fact committed after canonical creation.' };
    let liveSource = source;
    const archiveVersioned = jest.fn(async () => {
      liveSource = newerSource;
      throw Object.assign(new Error('version conflict'), { statusCode: 409 });
    });
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? liveSource : undefined)),
      getVersioned: jest.fn().mockResolvedValue({
        page: source,
        seqNo: 7,
        primaryTerm: 2,
      }),
      archiveVersioned,
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: source.title,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged original fact.',
        context: 'kafka lag',
      }),
      logger: loggerMock.create(),
    });

    expect(store.create).toHaveBeenCalledTimes(1);
    expect(archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: source, seqNo: 7, primaryTerm: 2 }),
      'merged'
    );
    expect((store.create as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      archiveVersioned.mock.invocationCallOrder[0]
    );
    expect(liveSource).toBe(newerSource);
    expect(liveSource.status).toBe('established');
    expect(store.archive).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({
        mergeSuccessCount: 1,
        mergedSourceArchiveCount: 0,
        writeFailureCount: 1,
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
          replaces: [],
          note: '',
        },
      ],
      context: 'why is checkout slow?',
      synthesizeMemoryGroup: async () => ({
        content: 'Body',
        context: '',
      }),
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 0 })
    );
  });

  it('counts a synthesis exception as a write failure', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag');
    const store = createStore({
      get: jest.fn().mockResolvedValue(source),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: source.title,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => {
        throw new Error('inference unavailable');
      },
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 0, writeFailureCount: 1 })
    );
  });

  it('does not merge when synthesis returns a secret-bearing context', async () => {
    const source = page('memory_kafka-lag', 'Kafka consumer lag');
    source.context = 'why is checkout slow';
    const store = createStore({
      get: jest.fn().mockResolvedValue(source),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: 'Kafka consumer lag',
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      context: 'why is checkout slow?',
      synthesizeMemoryGroup: async () => ({
        content: 'Body',
        context: 'kafka lag api_key=sk-live-not-a-real-key',
      }),
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
  });

  it('does not overwrite a live page when every canonical slug candidate is occupied', async () => {
    const source = page('memory_source', 'Source memory');
    source.context = 'source context';
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => {
        if (id === source.id) {
          return source;
        }
        return id === 'memory_duplicate-source' ? undefined : page(id, 'Occupied canonical page');
      }),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'duplicate-source',
          title: 'Source memory',
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      context: 'source context',
      synthesizeMemoryGroup: async () => ({
        content: 'Merged body.',
        context: 'merged source context',
      }),
      logger: loggerMock.create(),
    });

    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 0 })
    );
    expect(store.create).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
  });

  it('reserves the merge suffix when the 80-character title slug belongs to a source', async () => {
    const base = 'a'.repeat(80);
    const source = page(`memory_${base}`, 'Source memory');
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'new-fact',
          title: base,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [source.id],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
        context: 'source fact',
      }),
      logger: loggerMock.create(),
    });

    const expectedSlug = `${'a'.repeat(73)}-merged`;
    expect(expectedSlug).toHaveLength(80);
    expect(store.create).toHaveBeenCalledWith(expect.objectContaining({ slug: expectedSlug }));
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ id: source.id }) }),
      'merged'
    );
    expect(summary).toEqual(
      expect.objectContaining({ mergeSuccessCount: 1, mergedSourceArchiveCount: 1 })
    );
  });

  it('reserves the numbered suffix when earlier long-title candidates are occupied', async () => {
    const base = 'b'.repeat(80);
    const source = page('memory_source', 'Source memory');
    const occupiedBase = page(`memory_${base}`, 'Other fact');
    const occupiedMerged = page(`memory_${'b'.repeat(73)}-merged`, 'Another fact');
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => {
        return [source, occupiedBase, occupiedMerged].find((entry) => entry.id === id);
      }),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'new-fact',
          title: base,
          content: 'Same fact.',
          tags: [],
          categories: [],
          replaces: [source.id],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
        context: 'source fact',
      }),
      logger: loggerMock.create(),
    });

    const expectedSlug = `${'b'.repeat(71)}-merged-2`;
    expect(expectedSlug).toHaveLength(80);
    expect(store.create).toHaveBeenCalledWith(expect.objectContaining({ slug: expectedSlug }));
    expect(summary).toEqual(expect.objectContaining({ mergeSuccessCount: 1 }));
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
          replaces: [],
          note: '',
        },
      ],
      context: 'redis eviction on cart cache',
      synthesizeMemoryGroup: async () => ({
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
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout-redis-merged',
        telemetry: expect.objectContaining({ impressions: 4, conversions: 2 }),
      })
    );
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ id: 'memory_checkout-redis' }) }),
      'merged'
    );
    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 1 })
    );
  });

  it('merges an old exact slug in place with OCC and preserves its id and title', async () => {
    const existing = page('memory_checkout-redis', 'Checkout Redis', 'Old fact.');
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === existing.id ? existing : undefined)),
      getVersioned: jest.fn().mockResolvedValue({
        page: existing,
        seqNo: 7,
        primaryTerm: 2,
      }),
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
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Old and new facts.',
        context: 'checkout redis sessions',
      }),
      logger: loggerMock.create(),
    });

    expect(store.update).toHaveBeenCalledWith(
      'memory_checkout-redis',
      expect.objectContaining({
        slug: 'checkout-redis',
        title: 'Checkout Redis',
        merged_from: ['memory_checkout-redis'],
      }),
      expect.objectContaining({ seqNo: 7, primaryTerm: 2 })
    );
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(store.create).not.toHaveBeenCalled();
  });

  it('merges a create-conflict winner through the same in-place flow', async () => {
    const winner = page('memory_checkout-redis', 'Concurrent winner', 'Winner fact.');
    const get = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(winner);
    const store = createStore({
      get,
      create: jest.fn().mockRejectedValue({ statusCode: 409 }),
      getVersioned: jest.fn().mockResolvedValue({
        page: winner,
        seqNo: 4,
        primaryTerm: 1,
      }),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          content: 'New extracted fact.',
          tags: ['redis'],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Winner and extracted facts.',
        context: 'checkout redis',
      }),
      logger: loggerMock.create(),
    });

    expect(store.update).toHaveBeenCalledWith(
      winner.id,
      expect.objectContaining({ content: 'Winner and extracted facts.' }),
      expect.objectContaining({ seqNo: 4 })
    );
    expect(summary).toEqual(
      expect.objectContaining({ mergeAttemptCount: 1, mergeSuccessCount: 1 })
    );
  });

  it('preserves sources after exhausting OCC conflicts', async () => {
    const canonical = page('memory_checkout-redis', 'Checkout Redis', 'Old fact.');
    const store = createStore({
      get: jest.fn().mockResolvedValue(canonical),
      getVersioned: jest.fn().mockResolvedValue({
        page: canonical,
        seqNo: 8,
        primaryTerm: 2,
      }),
      update: jest.fn().mockRejectedValue({ statusCode: 409 }),
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          content: 'New fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
        context: 'checkout redis',
      }),
      logger: loggerMock.create(),
    });

    expect(store.update).toHaveBeenCalledTimes(3);
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ mergeSuccessCount: 0, writeFailureCount: 1 })
    );
  });

  it('does not resurrect an archived exact slug', async () => {
    const archived = page('memory_checkout-redis', 'Checkout Redis');
    archived.status = 'archived';
    const store = createStore({ get: jest.fn().mockResolvedValue(archived) });

    await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          content: 'New fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: jest.fn(),
      logger: loggerMock.create(),
    });

    expect(store.retrieve).not.toHaveBeenCalled();
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
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
          replaces: [],
          note: '',
        },
      ],
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.retrieve).not.toHaveBeenCalled();
    expect(summary.safetySkipCount).toBe(1);
  });

  it('does not persist a secret-bearing user task as recall context', async () => {
    const store = createStore();

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-fact',
          title: 'Checkout environment fact',
          content: 'Checkout runs in the production cluster.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      context: 'Investigate checkout with api_key=sk-live-not-a-real-key',
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(summary.safetySkipCount).toBe(1);
  });

  it.each([
    ['tag', { tags: ['api_key=sk-live-not-a-real-key'], categories: [] }],
    ['category', { tags: [], categories: ['password=not-a-real-password'] }],
  ])('rejects secret-bearing model metadata in a proposed %s', async (_kind, metadata) => {
    const source = page('memory_checkout', 'Checkout environment');
    const store = createStore({
      get: jest.fn().mockResolvedValue(source),
    });
    const synthesizeMemoryGroup = jest.fn();

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-environment',
          title: 'Checkout environment',
          content: 'Checkout runs in production.',
          ...metadata,
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.retrieve).not.toHaveBeenCalled();
    expect(synthesizeMemoryGroup).not.toHaveBeenCalled();
    expect(summary.safetySkipCount).toBe(1);
  });

  it('keeps extraction slugs and merge page ids out of info logs', async () => {
    const source = page('memory_customer-service', 'Customer service');
    const logger = loggerMock.create();
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'customer-service-detail',
          title: 'Customer service',
          content: 'Same customer-specific fact.',
          tags: [],
          categories: [],
          replaces: [],
          note: '',
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
        context: 'customer service',
      }),
      logger,
    });

    const infoLogs = logger.info.mock.calls.flat().join('\n');
    expect(infoLogs).not.toContain('memory_customer-service');
    expect(infoLogs).not.toContain('customer-service-detail');
  });
});

describe('applyMemoryEdits entries: new, update, merge', () => {
  const entry = (
    overrides: Partial<Parameters<typeof applyMemoryEdits>[0]['extractions'][number]>
  ) => ({
    slug: 'host-clock-lag',
    title: 'Host clock lag',
    content: 'The host clock runs about 1 s behind the sandbox CA.',
    tags: [],
    categories: [],
    replaces: [],
    note: '',
    ...overrides,
  });
  const storeWith = (pages: MemoryPage[]) =>
    createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => pages.find((candidate) => candidate.id === id)),
    });

  it('updates one named memory into a new entry and archives the replaced one', async () => {
    const wrong = page('memory_pdt-skew', 'PDT skew', 'The host clock is 7 hours behind UTC.');
    const store = storeWith([wrong]);
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({
      content: 'The host clock runs about 1 s behind the sandbox CA.',
      context: 'x509 not yet valid clock lag',
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [] },
      extractions: [
        entry({ replaces: [wrong.id], note: 'The -07:00 offset is the time zone, not the gap.' }),
      ],
      context: 'how large is the clock difference?',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledWith({
      sources: [wrong],
      extract: expect.objectContaining({
        title: 'Host clock lag',
        note: 'The -07:00 offset is the time zone, not the gap.',
      }),
      task: 'how large is the clock difference?',
    });
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'host-clock-lag', title: 'Host clock lag' })
    );
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ id: wrong.id }) }),
      'merged'
    );
    expect(summary).toEqual(
      expect.objectContaining({ mergeSuccessCount: 1, standaloneUpsertCount: 0 })
    );
  });

  it('rewrites a named memory in place when the entry keeps its topic', async () => {
    const existing = page('memory_host-clock-lag', 'Host clock lag', 'The host clock drifts.');
    const store = storeWith([existing]);

    await applyMemoryEdits({
      store,
      recalledIds: [existing.id],
      recalledMemories: [existing],
      labels: { useful: [], harmful: [] },
      extractions: [entry({ replaces: [existing.id] })],
      context: 'clock',
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Updated.', context: 'clock' }),
      logger: loggerMock.create(),
    });

    expect(store.update).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({
        slug: 'host-clock-lag',
        title: 'Host clock lag',
        content: 'Updated.',
      }),
      expect.objectContaining({ seqNo: 1 })
    );
    expect(store.create).not.toHaveBeenCalled();
    expect(store.archiveVersioned).not.toHaveBeenCalled();
  });

  it('merges several named memories with no new content into one entry', async () => {
    const first = page('memory_a', 'Clock skew A', 'Clock skew breaks TLS.');
    const second = page('memory_b', 'Clock skew B', 'TLS fails on clock skew.');
    const store = storeWith([first, second]);
    const synthesizeMemoryGroup = jest
      .fn()
      .mockResolvedValue({ content: 'Clock skew breaks TLS.', context: 'tls clock skew' });

    await applyMemoryEdits({
      store,
      recalledIds: [first.id, second.id],
      recalledMemories: [first, second],
      labels: { useful: [], harmful: [] },
      extractions: [
        entry({ title: 'Clock skew breaks TLS', content: '', replaces: [first.id, second.id] }),
      ],
      context: 'tls',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(
      expect.objectContaining({ sources: [first, second] })
    );
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.archiveVersioned).toHaveBeenCalledTimes(2);
  });

  it('lets an entry replace a harmful memory instead of archiving it as harmful', async () => {
    const wrong = page('memory_pdt-skew', 'PDT skew', 'The host clock is 7 hours behind UTC.');
    const store = storeWith([wrong]);

    await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [wrong.id] },
      extractions: [entry({ replaces: [wrong.id] })],
      context: 'clock',
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Right.', context: 'clock' }),
      logger: loggerMock.create(),
    });

    expect(store.archive).not.toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'host-clock-lag' }));
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ id: wrong.id }) }),
      'merged'
    );
  });

  it('still archives a replaced harmful memory as harmful when its entry is not written', async () => {
    const wrong = page('memory_pdt-skew', 'PDT skew', 'The host clock is 7 hours behind UTC.');
    const store = storeWith([wrong]);

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [wrong.id] },
      extractions: [entry({ replaces: [wrong.id] })],
      context: 'clock',
      synthesizeMemoryGroup: jest.fn().mockRejectedValue(new Error('model down')),
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith(wrong.id, 'harmful');
    expect(summary).toEqual(expect.objectContaining({ harmfulArchiveCount: 1 }));
  });

  it('writes a new memory when replaces names only ids that were not recalled', async () => {
    const store = storeWith([]);
    const synthesizeMemoryGroup = jest.fn();

    await applyMemoryEdits({
      store,
      recalledIds: [],
      recalledMemories: [],
      labels: { useful: [], harmful: [] },
      extractions: [entry({ replaces: ['memory_not-recalled'] })],
      context: 'clock',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).not.toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'host-clock-lag',
        content: 'The host clock runs about 1 s behind the sandbox CA.',
      })
    );
  });

  it('drops an entry with no content when nothing it names can be replaced', async () => {
    const store = storeWith([]);

    await applyMemoryEdits({
      store,
      recalledIds: [],
      recalledMemories: [],
      labels: { useful: [], harmful: [] },
      extractions: [entry({ content: '', replaces: ['memory_not-recalled'] })],
      context: 'clock',
      synthesizeMemoryGroup: jest.fn(),
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
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
          replaces: [],
          note: '',
        },
        recalledIds: ['memory_kafka-lag'],
        recalledMemories: [page('memory_kafka-lag', 'Kafka consumer lag')],
        catalogHits: [],
      })
    ).toBe(true);
  });
});

describe('optimizeMemory', () => {
  it('passes the abort signal to every LLM call', async () => {
    const signal = new AbortController().signal;
    const output = jest.fn().mockResolvedValue({
      output: { useful: [], harmful: [], extractions: [] },
    });
    const inferenceClient = { output } as never;
    await createLlmProposeMemoryLabels({ inferenceClient, signal })({
      transcript: 't',
      recalledMemories: [page('memory_a')],
    });
    await createLlmProposeMemoryExtractions({ inferenceClient, signal })({
      transcript: 't',
      recalledMemories: [],
    });
    output.mockResolvedValueOnce({ output: { content: 'C', context: 'k' } });
    await createLlmSynthesizeMemoryGroup({ inferenceClient, signal })({
      sources: [page('memory_a'), page('memory_b')],
      extract: {
        slug: 'a',
        title: 'A',
        content: '',
        tags: [],
        categories: [],
        replaces: ['memory_a', 'memory_b'],
        note: '',
      },
    });

    expect(output).toHaveBeenCalledTimes(3);
    for (const [options] of output.mock.calls) {
      expect(options.abortSignal).toBe(signal);
    }
  });

  it('starts no later LLM call or write once aborted', async () => {
    const controller = new AbortController();
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockImplementation(async () => {
      controller.abort();
      return { useful: ['memory_a'], harmful: [] };
    });
    const proposeExtractions = jest.fn();

    await expect(
      optimizeMemory({
        store,
        recalledIds: ['memory_a'],
        proposeLabels,
        proposeExtractions,
        userMessage: 'why?',
        assistantMessage: 'because',
        toolCalls: [],
        logger: loggerMock.create(),
        signal: controller.signal,
      })
    ).rejects.toThrow();
    expect(proposeExtractions).not.toHaveBeenCalled();
    expect(store.applyCounterUpdates).not.toHaveBeenCalled();
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('gives both LLM calls the round tool calls, not just the user and assistant text', async () => {
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockResolvedValue({ useful: [], harmful: [] });
    const proposeExtractions = jest.fn().mockResolvedValue({ extractions: [] });

    await optimizeMemory({
      store,
      recalledIds: ['memory_a'],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [
        { tool_id: 'nightshift_sandbox_bash', params: { command: 'esql "FROM metrics-redis*"' } },
      ],
      logger: loggerMock.create(),
    });

    for (const propose of [proposeLabels, proposeExtractions]) {
      const { transcript } = propose.mock.calls[0][0];
      expect(transcript).toContain('## Tool calls (parameters only; results unavailable)');
      expect(transcript).toContain('nightshift_sandbox_bash');
      expect(transcript).toContain('FROM metrics-redis*');
      expect(transcript.indexOf('## User task')).toBeLessThan(transcript.indexOf('## Tool calls'));
      expect(transcript.indexOf('## Tool calls')).toBeLessThan(
        transcript.indexOf('## Final answer')
      );
    }
  });

  it('gives both LLM calls the tool results when the round could be read', async () => {
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockResolvedValue({ useful: [], harmful: [] });
    const proposeExtractions = jest.fn().mockResolvedValue({ extractions: [] });

    await optimizeMemory({
      store,
      recalledIds: ['memory_a'],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
      investigation: [
        {
          kind: 'tool',
          toolId: 'nightshift_sandbox_bash',
          params: { command: 'esql "FROM metrics-redis*"' },
          resultText: 'evicted_keys=4210',
          isError: false,
        },
      ],
      logger: loggerMock.create(),
    });

    for (const propose of [proposeLabels, proposeExtractions]) {
      const { transcript } = propose.mock.calls[0][0];
      expect(transcript).toContain('## Investigation');
      expect(transcript).toContain('Result: evicted_keys=4210');
      expect(transcript).not.toContain('results unavailable');
    }
  });

  it('marks an empty tool-call list explicitly', async () => {
    const store = createStore();
    const proposeExtractions = jest.fn().mockResolvedValue({ extractions: [] });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels: jest.fn(),
      proposeExtractions,
      userMessage: 'hi',
      assistantMessage: 'hello',
      toolCalls: [],
      logger: loggerMock.create(),
    });

    expect(proposeExtractions.mock.calls[0][0].transcript).toContain(
      '## Tool calls (parameters only; results unavailable)\n(no tool calls)'
    );
  });
  it('labels only recalled pages fetched by id, not store.list()', async () => {
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockResolvedValue({ useful: ['memory_a'], harmful: [] });
    const proposeExtractions = jest.fn().mockResolvedValue({ extractions: [] });

    await optimizeMemory({
      store,
      recalledIds: ['memory_a'],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
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
          replaces: [],
          note: '',
        },
      ],
    });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
      logger: loggerMock.create(),
    });

    expect(proposeLabels).not.toHaveBeenCalled();
    expect(proposeExtractions).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout-redis',
        status: 'tentative',
        context: 'why is checkout slow?',
      })
    );
  });

  it('preserves a literal system_update in the user-authored task', async () => {
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
          replaces: [],
          note: '',
        },
      ],
    });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      userMessage:
        'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/workspace/memories/memory_a.md` — Alpha\n</system_update>',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
      logger: loggerMock.create(),
    });

    expect(unwrapUserTask).toBeDefined();
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        context:
          'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/workspace/memories/memory_a.md` — Alpha\n</system_update>',
      })
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
      toolCalls: [],
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
