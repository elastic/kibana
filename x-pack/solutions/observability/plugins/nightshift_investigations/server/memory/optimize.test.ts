/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  MEMORY_COMPACT_SYSTEM_PROMPT,
  MEMORY_CRITIQUE_SYSTEM_PROMPT,
  MEMORY_EXTRACT_GUIDELINES,
  MEMORY_EXTRACT_SYSTEM_PROMPT,
  applyMemoryEdits,
  canonicalizeMemoryLabelId,
  canonicalizeMemoryLabelIds,
  createLlmProposeMemoryExtractions,
  createLlmProposeMemoryLabels,
  createLlmSynthesizeMemoryGroup,
  formatMemoryMergeSources,
  formatRecalled,
  MEMORY_WRITER_SYSTEM_PROMPT,
  MERGED_CONTENT_MAX_CHARS,
  OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT,
  optimizeMemory,
  unwrapUserTask,
} from './optimize';
import type { MemoryPageStore } from './page_store';
import type { TranscriptStep } from './transcript';
import type { MemoryPage } from '../../common/memory';
import { MAX_MEMORY_TAGS_PER_PAGE } from '../../common/memory_tags';

const page = (id: string, title = id, content = 'body'): MemoryPage => ({
  id,
  slug: id.replace(/^memory_/, ''),
  title,
  content,
  tags: ['memory'],
  archived: false,
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
  it('shows id, title, and facts beyond character 150, and hides the recall key', () => {
    const memory = page('memory_long', 'Checkout Redis evictions');
    memory.context = 'checkout latency';
    memory.content = `${'x'.repeat(150)}FACT_AFTER_150`;

    const formatted = formatRecalled([memory]);

    expect(formatted).toContain('title: Checkout Redis evictions');
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
  it('lists the topic, keywords, and replaced memories with facts beyond character 1,500', () => {
    const source = page('memory_long-source');
    source.content = `${'s'.repeat(1_600)}SOURCE_FACT`;
    const formatted = formatMemoryMergeSources({
      sources: [source],
      extract: {
        slug: 'long-extract',
        title: 'Long extract',
        tags: ['checkout', 'redis'],
        replaces: [source.id],
      },
    });

    expect(formatted).toContain('Topic: Long extract');
    expect(formatted).toContain('Keywords: checkout, redis');
    expect(formatted).toContain(
      'Memories this entry replaces. Integrate their facts that still hold with what this run learned:\n- id=memory_long-source'
    );
    expect(formatted).toContain('SOURCE_FACT');
  });

  it('says when an entry replaces no memories', () => {
    const formatted = formatMemoryMergeSources({
      sources: [],
      extract: { slug: 'new-topic', title: 'New topic', tags: [], replaces: [] },
    });

    expect(formatted).toBe(
      'Topic: New topic\nKeywords: (none)\n\nMemories this entry replaces: (none)'
    );
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
});

describe('createLlmSynthesizeMemoryGroup', () => {
  it('shows the writer a colliding memory the entry did not name as one it replaces', async () => {
    const existing = page('memory_checkout-redis', 'Checkout Redis', 'COLLIDING_FACT');
    const output = jest.fn().mockResolvedValue({ output: { content: 'Written.' } });
    const store = createStore({
      get: jest.fn(async (id: string) => (id === existing.id ? existing : undefined)),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [{ slug: 'checkout-redis', title: 'Checkout Redis', tags: [], replaces: [] }],
      synthesizeMemoryGroup: createLlmSynthesizeMemoryGroup({
        inferenceClient: { output } as never,
      }),
      logger: loggerMock.create(),
    });

    const { input } = output.mock.calls[0][0];
    expect(input).toContain(
      'Memories this entry replaces. Integrate their facts that still hold with what this run learned:\n- id=memory_checkout-redis'
    );
    expect(input).toContain('COLLIDING_FACT');
  });

  it('budgets a long transcript together with the replaced memories and asks only for content', async () => {
    const output = jest.fn().mockResolvedValue({ output: { content: 'Written content' } });
    const synthesize = createLlmSynthesizeMemoryGroup({
      inferenceClient: { output } as never,
    });
    const first = page('memory_first', 'First source', `FIRST_SIGNAL${'a'.repeat(40_000)}`);
    const second = page('memory_second', 'Second source', `SECOND_SIGNAL${'b'.repeat(40_000)}`);

    await expect(
      synthesize({
        sources: [first, second],
        extract: { slug: 'new-extract', title: 'New extract', tags: [], replaces: [] },
        transcript: `TRANSCRIPT_SIGNAL${'t'.repeat(40_000)}`,
      })
    ).resolves.toEqual({ content: 'Written content' });

    const { input, schema } = output.mock.calls[0][0];
    expect(input.length).toBeLessThanOrEqual(OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT);
    expect(input).toContain('Topic: New extract');
    expect(input).toContain('id=memory_first');
    expect(input).toContain('FIRST_SIGNAL');
    expect(input).toContain('TRANSCRIPT_SIGNAL');
    expect(Object.keys(schema.properties)).toEqual(['content']);
  });

  it('keeps a memory within budget without compacting it', async () => {
    const output = jest.fn().mockResolvedValue({ output: { content: 'a'.repeat(4000) } });

    await createLlmSynthesizeMemoryGroup({ inferenceClient: { output } as never })({
      sources: [],
      extract: { slug: 'topic', title: 'Topic', tags: [], replaces: [] },
      transcript: 'TRANSCRIPT',
    });

    expect(output).toHaveBeenCalledTimes(1);
  });

  it('compacts an over-budget memory with the writer goal, its input, and the overage', async () => {
    const draft = 'word '.repeat(900).trim();
    const output = jest
      .fn()
      .mockResolvedValueOnce({ output: { content: draft } })
      .mockResolvedValueOnce({ output: { content: 'Shorter memory.' } });

    await expect(
      createLlmSynthesizeMemoryGroup({ inferenceClient: { output } as never })({
        sources: [],
        extract: { slug: 'topic', title: 'Topic', tags: [], replaces: [] },
        transcript: 'TRANSCRIPT_SIGNAL',
      })
    ).resolves.toEqual({ content: 'Shorter memory.' });

    expect(output).toHaveBeenCalledTimes(2);
    const { id, system, input } = output.mock.calls[1][0];
    expect(id).toBe('nightshift_memory_compact');
    expect(system).toBe(MEMORY_COMPACT_SYSTEM_PROMPT);
    expect(input).toContain(
      'Budget: 4000 characters. The memory has 4499, 499 over. ' +
        'Target: at most 480 words; the memory has 900 words now.'
    );
    expect(input).toContain(MEMORY_WRITER_SYSTEM_PROMPT);
    expect(input).toContain(output.mock.calls[0][0].input);
    expect(input).toContain(draft);
  });

  it('stores the truncated memory when compaction fails, without retrying', async () => {
    const output = jest
      .fn()
      .mockResolvedValueOnce({ output: { content: `DRAFT${'w'.repeat(5000)}` } })
      .mockRejectedValueOnce(new Error('model unavailable'));
    const store = createStore();

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [{ slug: 'topic', title: 'Topic', tags: [], replaces: [] }],
      synthesizeMemoryGroup: createLlmSynthesizeMemoryGroup({
        inferenceClient: { output } as never,
      }),
      logger: loggerMock.create(),
    });

    expect(output).toHaveBeenCalledTimes(2);
    const [{ content }] = (store.create as jest.Mock).mock.calls[0];
    expect(content.startsWith('DRAFT')).toBe(true);
    expect(content.length).toBeLessThanOrEqual(MERGED_CONTENT_MAX_CHARS);
    expect(summary.writeFailureCount).toBe(0);
  });

  it('stops without writing when compaction is cancelled', async () => {
    const controller = new AbortController();
    const output = jest
      .fn()
      .mockResolvedValueOnce({ output: { content: 'w'.repeat(5000) } })
      .mockImplementationOnce(async () => {
        controller.abort();
        throw new Error('aborted');
      });

    await expect(
      createLlmSynthesizeMemoryGroup({
        inferenceClient: { output } as never,
        signal: controller.signal,
      })({
        sources: [],
        extract: { slug: 'topic', title: 'Topic', tags: [], replaces: [] },
      })
    ).rejects.toThrow();
  });

  it('truncates a memory the compactor could not bring within budget', async () => {
    const output = jest
      .fn()
      .mockResolvedValueOnce({ output: { content: 'w'.repeat(5000) } })
      .mockResolvedValueOnce({ output: { content: `STILL_LONG${'c'.repeat(4500)}` } });
    const store = createStore();

    await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [{ slug: 'topic', title: 'Topic', tags: [], replaces: [] }],
      synthesizeMemoryGroup: createLlmSynthesizeMemoryGroup({
        inferenceClient: { output } as never,
      }),
      logger: loggerMock.create(),
    });

    const [{ content }] = (store.create as jest.Mock).mock.calls[0];
    expect(content.startsWith('STILL_LONG')).toBe(true);
    expect(content.length).toBeLessThanOrEqual(MERGED_CONTENT_MAX_CHARS);
    expect(content.endsWith('…(truncated)')).toBe(true);
  });
});

describe('createLlmProposeMemoryExtractions', () => {
  it('parses a title, keywords, and replaces as canonical ids', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            title: 'Kafka lag',
            keywords: ['kafka', 'consumer lag'],
            replaces: ['id=memory_a | title=A', 'memory_b'],
          },
          { title: '  ', keywords: [], replaces: [] },
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
          tags: ['kafka', 'consumer-lag'],
          replaces: ['memory_a', 'memory_b'],
        },
      ],
    });
  });

  it('rejects a secret-bearing raw title before canonicalization can hide it', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [{ title: 'api_key=sk-live-not-a-real-key', keywords: [], replaces: [] }],
      },
    });
    const propose = createLlmProposeMemoryExtractions({
      inferenceClient: { output } as never,
    });

    await expect(propose({ transcript: 'task', recalledMemories: [] })).resolves.toEqual({
      extractions: [],
    });
  });

  it('asks only for a title, keywords, and replaces, and derives the slug from the title', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            slug: 'ignored-model-slug',
            title: '  Checkout Redis evictions ',
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
          tags: [],
          replaces: [],
        },
      ],
    });
    const { schema } = output.mock.calls[0][0];
    const item = schema.properties.extractions.items;
    expect(Object.keys(item.properties)).toEqual(['title', 'keywords', 'replaces']);
    expect(item.required).toEqual(['title', 'keywords', 'replaces']);
  });

  it('canonicalizes proposed keywords and drops the ones that fold to nothing', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            title: 'Agent builder spans',
            keywords: [
              'Invoke Agent',
              'invoke_agent',
              'cart cache',
              '  ',
              'gen_ai.conversation.id',
              'traces-*',
            ],
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
          slug: 'agent-builder-spans',
          title: 'Agent builder spans',
          tags: ['invoke-agent', 'cart-cache', 'gen_ai.conversation.id', 'traces-*'],
          replaces: [],
        },
      ],
    });
  });

  it('caps a proposal at the per-page tag limit', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        extractions: [
          {
            title: 'Wide memory',
            keywords: Array.from({ length: MAX_MEMORY_TAGS_PER_PAGE + 8 }, (_, i) => `tag ${i}`),
          },
        ],
      },
    });
    const propose = createLlmProposeMemoryExtractions({
      inferenceClient: { output } as never,
    });

    const { extractions } = await propose({ transcript: 'task', recalledMemories: [] });
    expect(extractions[0].tags).toHaveLength(MAX_MEMORY_TAGS_PER_PAGE);
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

  it('merges an entry into the recalled memory it replaces, keyed by the round task', async () => {
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
          tags: ['kafka'],
          replaces: [source.id],
        },
      ],
      context:
        'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/x` — X\n</system_update>',
      synthesizeMemoryGroup: async () => ({
        content: 'Checkout consumer lag is a durable fact.',
      }),
      now: () => Date.parse('2026-01-01T00:00:00.000Z') / 1000,
      logger: loggerMock.create(),
    });

    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'kafka-consumer-lag',
        title: 'Kafka consumer lag',
        context:
          'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/x` — X\n</system_update>',
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

  it('skips a later entry that replaces a memory an earlier entry already replaces', async () => {
    const source = page(
      'memory_checkout-redis',
      'Checkout Redis sessions',
      'Checkout stores sessions in Redis.'
    );
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === source.id ? source : undefined)),
    });
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({
      content: 'Checkout stores sessions in Redis.',
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
          tags: [],
          replaces: [source.id],
        },
        {
          slug: 'redis-session-backend',
          title: 'Checkout Redis sessions',
          tags: [],
          replaces: [source.id],
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
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: async () => {
        current = {
          page: { ...source, archived: true, archive_reason: 'harmful' },
          seqNo: 2,
          primaryTerm: 1,
        };
        return { content: 'Body' };
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
      return { content: current.page.content };
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
          tags: [],
          replaces: [source.id],
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
      return { title: 'Merged Kafka', content: `Fact ${seqNo}` };
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
          tags: [],
          replaces: [source.id],
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
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
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
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged original fact.',
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
    expect(liveSource.archived).toBe(false);
    expect(store.archive).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({
        mergeSuccessCount: 1,
        mergedSourceArchiveCount: 0,
        writeFailureCount: 1,
      })
    );
  });

  it('writes nothing when the writer returns empty content', async () => {
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
          tags: [],
          replaces: [source.id],
        },
      ],
      context: 'why is checkout slow?',
      synthesizeMemoryGroup: async () => ({
        content: '',
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
          tags: [],
          replaces: [source.id],
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

  it('does not merge when the writer returns secret-bearing content', async () => {
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
          tags: [],
          replaces: [source.id],
        },
      ],
      context: 'why is checkout slow?',
      synthesizeMemoryGroup: async () => ({
        content: 'Body api_key=sk-live-not-a-real-key',
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
          tags: [],
          replaces: [source.id],
        },
      ],
      context: 'source context',
      synthesizeMemoryGroup: async () => ({
        content: 'Merged body.',
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
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
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
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
      }),
      logger: loggerMock.create(),
    });

    const expectedSlug = `${'b'.repeat(71)}-merged-2`;
    expect(expectedSlug).toHaveLength(80);
    expect(store.create).toHaveBeenCalledWith(expect.objectContaining({ slug: expectedSlug }));
    expect(summary).toEqual(expect.objectContaining({ mergeSuccessCount: 1 }));
  });

  it('sums the decayed telemetry of the replaced memories without searching the catalog', async () => {
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
      recalledIds: [hit.id],
      recalledMemories: [hit],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'redis-sessions',
          title: 'Checkout Redis',
          tags: [],
          replaces: [hit.id],
        },
      ],
      context: 'redis eviction on cart cache',
      synthesizeMemoryGroup: async () => ({
        content: 'Checkout sessions live in Redis and evict under memory pressure.',
      }),
      now: () => Date.parse('2026-01-01T00:00:00.000Z') / 1000,
      logger: loggerMock.create(),
    });

    expect(store.retrieve).not.toHaveBeenCalled();
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
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({ content: 'Old and new facts.' });

    await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          tags: [],
          replaces: [],
        },
      ],
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(
      expect.objectContaining({ sources: [existing] })
    );
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
    const get = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(winner);
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
          tags: ['redis'],
          replaces: [],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Winner and extracted facts.',
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
          tags: [],
          replaces: [],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
      }),
      logger: loggerMock.create(),
    });

    expect(store.update).toHaveBeenCalledTimes(3);
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ mergeSuccessCount: 0, writeFailureCount: 1 })
    );
  });

  it('writes a new memory over an archived one with the same id, resetting counters', async () => {
    const archived = {
      ...page('memory_checkout-redis', 'Checkout Redis', 'Old wrong fact.'),
      archived: true,
      merged_from: ['memory_older-redis'],
    };
    const store = createStore({ get: jest.fn().mockResolvedValue(archived) });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          tags: [],
          replaces: [],
        },
      ],
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'New fact.' }),
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).toHaveBeenCalledWith(
      archived.id,
      expect.objectContaining({
        content: 'New fact.',
        merged_from: ['memory_older-redis'],
        telemetry: expect.objectContaining({ impressions: 0, conversions: 0 }),
      }),
      expect.objectContaining({ page: archived })
    );
    expect(summary).toEqual(expect.objectContaining({ standaloneUpsertCount: 1 }));
  });

  it('merges into an archived id instead of adding a -merged suffix', async () => {
    const source = page('memory_redis-evictions', 'Redis evictions', 'Evicts under load.');
    const archived = {
      ...page('memory_checkout-redis', 'Checkout Redis', 'Old fact.'),
      archived: true,
    };
    const pages = [source, archived];
    const store = createStore({
      get: jest.fn(async (id: string) => pages.find((candidate) => candidate.id === id)),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [source.id],
      recalledMemories: [source],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-redis',
          title: 'Checkout Redis',
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({
        content: 'Checkout Redis evicts keys above 90% memory.',
      }),
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).toHaveBeenCalledWith(
      archived.id,
      expect.objectContaining({ slug: 'checkout-redis' }),
      expect.objectContaining({ page: archived })
    );
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: source }),
      'merged'
    );
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
          title: 'Checkout password=not-a-real-password',
          tags: [],
          replaces: [],
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
          tags: [],
          replaces: [],
        },
      ],
      context: 'Investigate checkout with api_key=sk-live-not-a-real-key',
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(summary.safetySkipCount).toBe(1);
  });

  it('rejects a secret-bearing proposed keyword', async () => {
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
          tags: ['api_key=sk-live-not-a-real-key'],
          replaces: [],
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

  it('canonicalizes and dedupes the merge union, and drops the internal marker', async () => {
    const existing = page('memory_checkout-redis', 'Checkout Redis', 'Old fact.');
    existing.tags = ['memory', 'Cart Cache', 'redis', 'invoke_agent', 'Cart-Cache'];
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
          // The same tag as the source page, spelled the other way, plus an
          // identifier whose punctuation must survive.
          tags: ['memory', 'CART_CACHE', 'Invoke Agent', 'gen_ai.conversation.id'],
          replaces: [],
        },
      ],
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Old and new facts.' }),
      logger: loggerMock.create(),
    });

    expect(store.update).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({
        tags: [
          'cart-cache',
          'redis',
          'invoke-agent',
          'gen_ai.conversation.id',
        ],
      }),
      expect.objectContaining({ seqNo: 7, primaryTerm: 2 })
    );
  });

  it('caps the merge union at the per-page tag limit', async () => {
    const existing = page('memory_checkout-redis', 'Checkout Redis', 'Old fact.');
    existing.tags = [
      'memory',
      ...Array.from({ length: MAX_MEMORY_TAGS_PER_PAGE }, (_, i) => `source ${i}`),
    ];
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === existing.id ? existing : undefined)),
      getVersioned: jest.fn().mockResolvedValue({
        page: existing,
        seqNo: 1,
        primaryTerm: 1,
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
          tags: Array.from({ length: MAX_MEMORY_TAGS_PER_PAGE }, (_, i) => `proposed ${i}`),
          replaces: [],
        },
      ],
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Old and new facts.' }),
      logger: loggerMock.create(),
    });

    const write = store.update.mock.calls[0][1] as { tags: string[] };
    expect(write.tags).toHaveLength(MAX_MEMORY_TAGS_PER_PAGE);
    // The union is ordered sources-first, so the cap drops the proposed tail
    // rather than the tags the merged pages already carried.
    expect(write.tags[0]).toBe('source-0');
    expect(write.tags).not.toContain('memory');
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
          tags: [],
          replaces: [source.id],
        },
      ],
      synthesizeMemoryGroup: async () => ({
        content: 'Merged fact.',
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
    tags: [],
    replaces: [],
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
    });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [] },
      extractions: [entry({ replaces: [wrong.id] })],
      context: 'how large is the clock difference?',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledWith({
      sources: [wrong],
      extract: expect.objectContaining({ title: 'Host clock lag' }),
      otherTopics: [],
    });
    expect(store.create).toHaveBeenCalledTimes(1);
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'host-clock-lag',
        title: 'Host clock lag',
        context: 'how large is the clock difference?',
      })
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
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Updated.' }),
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

  it('brings in a live memory at the entry id that was not recalled and writes into it', async () => {
    const unseen = page('memory_host-clock-lag', 'Host clock lag', 'The host clock drifts.');
    const named = page('memory_x509-errors', 'x509 errors', 'x509 not yet valid errors on TLS.');
    const store = storeWith([unseen, named]);
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({ content: 'Merged.' });

    await applyMemoryEdits({
      store,
      recalledIds: [named.id],
      recalledMemories: [named],
      labels: { useful: [], harmful: [] },
      extractions: [entry({ replaces: [named.id] })],
      context: 'clock',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(
      expect.objectContaining({ sources: [named, unseen] })
    );
    expect(store.update).toHaveBeenCalledWith(
      unseen.id,
      expect.objectContaining({ title: 'Host clock lag', context: 'clock' }),
      expect.objectContaining({ seqNo: 1 })
    );
    expect(store.create).not.toHaveBeenCalled();
    expect(store.archiveVersioned).toHaveBeenCalledTimes(1);
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ id: named.id }) }),
      'merged'
    );
  });

  it('merges several named memories into one entry', async () => {
    const first = page('memory_a', 'Clock skew A', 'Clock skew breaks TLS.');
    const second = page('memory_b', 'Clock skew B', 'TLS fails on clock skew.');
    const store = storeWith([first, second]);
    const synthesizeMemoryGroup = jest
      .fn()
      .mockResolvedValue({ content: 'Clock skew breaks TLS.' });

    await applyMemoryEdits({
      store,
      recalledIds: [first.id, second.id],
      recalledMemories: [first, second],
      labels: { useful: [], harmful: [] },
      extractions: [entry({ title: 'Clock skew breaks TLS', replaces: [first.id, second.id] })],
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

  it('archives a replaced harmful memory as harmful and writes the entry without it', async () => {
    const wrong = page('memory_pdt-skew', 'PDT skew', 'The host clock is 7 hours behind UTC.');
    const store = storeWith([wrong]);
    const synthesizeMemoryGroup = jest
      .fn()
      .mockResolvedValue({ content: 'The host clock runs about 1 s behind the sandbox CA.' });

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [wrong.id] },
      extractions: [entry({ replaces: [wrong.id] })],
      context: 'clock',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith(wrong.id, 'harmful');
    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(expect.objectContaining({ sources: [] }));
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'host-clock-lag',
        content: 'The host clock runs about 1 s behind the sandbox CA.',
      })
    );
    expect(store.archiveVersioned).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ harmfulArchiveCount: 1, standaloneUpsertCount: 1 })
    );
  });

  it('writes an entry that overlaps a harmful memory it does not name', async () => {
    const wrong = page(
      'memory_pdt-skew',
      'Host clock lag',
      'The host clock is 7 hours behind UTC.'
    );
    const store = storeWith([wrong]);
    const synthesizeMemoryGroup = jest
      .fn()
      .mockResolvedValue({ content: 'The host clock runs about 1 s behind the sandbox CA.' });

    await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [wrong.id] },
      extractions: [entry({})],
      context: 'clock',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith(wrong.id, 'harmful');
    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(expect.objectContaining({ sources: [] }));
    expect(store.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'host-clock-lag' }));
  });

  it('merges only the live memories when an entry also replaces a harmful one', async () => {
    const wrong = page('memory_pdt-skew', 'PDT skew', 'The host clock is 7 hours behind UTC.');
    const right = page('memory_x509-errors', 'x509 errors', 'x509 not yet valid errors on TLS.');
    const store = storeWith([wrong, right]);
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({ content: 'Right.' });

    await applyMemoryEdits({
      store,
      recalledIds: [wrong.id, right.id],
      recalledMemories: [wrong, right],
      labels: { useful: [], harmful: [wrong.id] },
      extractions: [entry({ replaces: [wrong.id, right.id] })],
      context: 'clock',
      synthesizeMemoryGroup,
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith(wrong.id, 'harmful');
    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(
      expect.objectContaining({ sources: [right] })
    );
    expect(store.archiveVersioned).toHaveBeenCalledTimes(1);
    expect(store.archiveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ id: right.id }) }),
      'merged'
    );
  });

  it('writes a harmful memory replacement that keeps its title over the archived id', async () => {
    const wrong = page('memory_host-clock-lag', 'Host clock lag', 'The clock is 7 h behind UTC.');
    wrong.telemetry = {
      impressions: 5,
      conversions: 3,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    };
    let stored: MemoryPage = wrong;
    const store = createStore({
      get: jest.fn(async (id: string) => (id === wrong.id ? stored : undefined)),
      archive: jest.fn(async (id: string, reason) => {
        stored = { ...stored, archived: true, archive_reason: reason };
        return stored;
      }),
    });

    await applyMemoryEdits({
      store,
      recalledIds: [wrong.id],
      recalledMemories: [wrong],
      labels: { useful: [], harmful: [wrong.id] },
      extractions: [entry({ replaces: [wrong.id] })],
      context: 'clock',
      synthesizeMemoryGroup: jest
        .fn()
        .mockResolvedValue({ content: 'The host clock runs about 1 s behind the sandbox CA.' }),
      now: () => 1_790_000_000,
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith(wrong.id, 'harmful');
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).toHaveBeenCalledWith(
      wrong.id,
      expect.objectContaining({
        content: 'The host clock runs about 1 s behind the sandbox CA.',
        telemetry: expect.objectContaining({ impressions: 0, conversions: 0 }),
      }),
      expect.objectContaining({ page: expect.objectContaining({ archived: true }) })
    );
  });

  it('writes a new memory when replaces names only ids that were not recalled', async () => {
    const store = storeWith([]);
    const synthesizeMemoryGroup = jest
      .fn()
      .mockResolvedValue({ content: 'The host clock runs about 1 s behind the sandbox CA.' });

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

    expect(synthesizeMemoryGroup).toHaveBeenCalledWith(expect.objectContaining({ sources: [] }));
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'host-clock-lag',
        content: 'The host clock runs about 1 s behind the sandbox CA.',
      })
    );
  });

  it('writes nothing for a new entry when the writer returns no content', async () => {
    const store = storeWith([]);

    const summary = await applyMemoryEdits({
      store,
      recalledIds: [],
      recalledMemories: [],
      labels: { useful: [], harmful: [] },
      extractions: [entry({})],
      context: 'clock',
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: '' }),
      logger: loggerMock.create(),
    });

    expect(store.create).not.toHaveBeenCalled();
    expect(summary).toEqual(
      expect.objectContaining({ standaloneUpsertCount: 0, writeFailureCount: 0 })
    );
  });
});

const REDIS_INVESTIGATION: TranscriptStep[] = [
  {
    kind: 'tool',
    toolId: 'nightshift_sandbox_bash',
    params: { command: 'esql "FROM metrics-redis*"' },
    resultText: 'evicted_keys=4210',
    isError: false,
  },
];

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
    output.mockResolvedValueOnce({ output: { content: 'C' } });
    await createLlmSynthesizeMemoryGroup({ inferenceClient, signal })({
      sources: [page('memory_a'), page('memory_b')],
      extract: {
        slug: 'a',
        title: 'A',
        tags: [],
        replaces: ['memory_a', 'memory_b'],
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

  it('critiques from tool-call parameters but does not extract without tool results', async () => {
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

    const { transcript } = proposeLabels.mock.calls[0][0];
    expect(transcript).toContain('## Tool calls (parameters only; results unavailable)');
    expect(transcript).toContain('nightshift_sandbox_bash');
    expect(transcript).toContain('FROM metrics-redis*');
    expect(transcript.indexOf('## User task')).toBeLessThan(transcript.indexOf('## Tool calls'));
    expect(transcript.indexOf('## Tool calls')).toBeLessThan(transcript.indexOf('## Final answer'));
    expect(proposeExtractions).not.toHaveBeenCalled();
  });

  it.each<[string, TranscriptStep[]]>([
    ['an empty round', []],
    ['a reasoning-only round', [{ kind: 'reasoning', text: 'Checking Redis.' }]],
    [
      'tool calls with empty results',
      [
        {
          kind: 'tool',
          toolId: 'nightshift_sandbox_bash',
          params: { command: 'esql "FROM metrics-redis*"' },
          resultText: '  ',
          isError: false,
        },
        { kind: 'tool', toolId: 'observability.get_traces', params: {}, isError: false },
      ],
    ],
    [
      'results only from seeded reads and process tools',
      [
        {
          kind: 'tool',
          toolId: 'nightshift_sandbox_view_file',
          params: { file_path: '/workspace/cortex/INDEX.md' },
          resultText: 'Checkout runbook',
          isError: false,
        },
        {
          kind: 'tool',
          toolId: 'write_todos',
          params: {},
          resultText: 'todos saved',
          isError: false,
        },
      ],
    ],
  ])('does not extract from %s', async (_, investigation) => {
    const proposeLabels = jest.fn().mockResolvedValue({ useful: [], harmful: [] });
    const proposeExtractions = jest.fn().mockResolvedValue({ extractions: [] });

    await optimizeMemory({
      store: createStore(),
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
      investigation,
      logger: loggerMock.create(),
    });

    expect(proposeExtractions).not.toHaveBeenCalled();
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
    expect(proposeLabels.mock.calls[0][0].transcript).toContain(
      '## Final answer\nRedis evictions on checkout.'
    );
    expect(proposeExtractions.mock.calls[0][0].transcript).not.toContain('## Final answer');
  });

  it('keeps seeded Cortex reads out of every Memory call but keeps memory reads', async () => {
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
          toolId: 'nightshift_sandbox_view_file',
          params: { file_path: '/workspace/cortex/INDEX.md' },
          resultText: 'CORTEX_INDEX',
          isError: false,
        },
        {
          kind: 'tool',
          toolId: 'nightshift_sandbox_view_file',
          params: { file_path: '/workspace/memories/a.md' },
          resultText: 'MEMORY_A',
          isError: false,
        },
      ],
      logger: loggerMock.create(),
    });

    for (const propose of [proposeLabels, proposeExtractions]) {
      const { transcript } = propose.mock.calls[0][0];
      expect(transcript).not.toContain('CORTEX_INDEX');
      expect(transcript).toContain('MEMORY_A');
    }
  });

  it('writes every entry with the extraction transcript and the other entries topics', async () => {
    const recalled = page('memory_redis', 'Redis', 'Checkout Redis evicts keys under load.');
    const store = createStore({
      get: jest
        .fn()
        .mockImplementation(async (id: string) => (id === recalled.id ? recalled : null)),
    });
    const proposeExtractions = jest.fn().mockResolvedValue({
      extractions: [
        {
          slug: 'redis',
          title: 'Redis',
          tags: [],
          replaces: [recalled.id],
        },
        {
          slug: 'kafka-consumer-lag',
          title: 'Kafka consumer lag',
          tags: [],
          replaces: [],
        },
      ],
    });
    const synthesizeMemoryGroup = jest.fn().mockResolvedValue({
      content: 'Checkout Redis evicts keys above 90% memory.',
    });

    await optimizeMemory({
      store,
      recalledIds: [recalled.id],
      proposeLabels: jest.fn().mockResolvedValue({ useful: [], harmful: [] }),
      proposeExtractions,
      synthesizeMemoryGroup,
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

    expect(synthesizeMemoryGroup).toHaveBeenCalledTimes(2);
    const [[replacing], [fresh]] = synthesizeMemoryGroup.mock.calls;
    expect(replacing.transcript).toBe(proposeExtractions.mock.calls[0][0].transcript);
    expect(replacing.transcript).toContain('Result: evicted_keys=4210');
    expect(replacing).toEqual(
      expect.objectContaining({ sources: [recalled], otherTopics: ['Kafka consumer lag'] })
    );
    expect(fresh).toEqual(expect.objectContaining({ sources: [], otherTopics: ['Redis'] }));
  });

  it('marks an empty tool-call list explicitly', async () => {
    const store = createStore({
      get: jest.fn().mockImplementation(async (id: string) => page(id)),
    });
    const proposeLabels = jest.fn().mockResolvedValue({ useful: [], harmful: [] });

    await optimizeMemory({
      store,
      recalledIds: ['memory_a'],
      proposeLabels,
      proposeExtractions: jest.fn(),
      userMessage: 'hi',
      assistantMessage: 'hello',
      toolCalls: [],
      logger: loggerMock.create(),
    });

    expect(proposeLabels.mock.calls[0][0].transcript).toContain(
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
          tags: ['redis'],
          replaces: [],
        },
      ],
    });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Checkout Redis evicts.' }),
      userMessage: 'why is checkout slow?',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
      investigation: REDIS_INVESTIGATION,
      logger: loggerMock.create(),
    });

    expect(proposeLabels).not.toHaveBeenCalled();
    expect(proposeExtractions).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'checkout-redis',

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
          tags: [],
          replaces: [],
        },
      ],
    });

    await optimizeMemory({
      store,
      recalledIds: [],
      proposeLabels,
      proposeExtractions,
      synthesizeMemoryGroup: jest.fn().mockResolvedValue({ content: 'Checkout Redis evicts.' }),
      userMessage:
        'why is checkout slow?\n\n<system_update>\nSemantic memories materialized this turn:\n- `/workspace/memories/memory_a.md` — Alpha\n</system_update>',
      assistantMessage: 'Redis evictions on checkout.',
      toolCalls: [],
      investigation: REDIS_INVESTIGATION,
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
  it('forbids generic knowledge writeups', () => {
    expect(MEMORY_CRITIQUE_SYSTEM_PROMPT).toContain('conservative');
    expect(MEMORY_EXTRACT_SYSTEM_PROMPT).toContain('customer');
    expect(MEMORY_EXTRACT_GUIDELINES).toContain('NEVER EXTRACT');
    expect(MEMORY_EXTRACT_GUIDELINES).toContain('Common-sense or generic knowledge');
    expect(MEMORY_EXTRACT_GUIDELINES).toContain('**EXTRACT**');
    expect(MEMORY_EXTRACT_GUIDELINES).not.toContain('tool resolutions');
  });
});
