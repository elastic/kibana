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
  contentOverlap,
  isDuplicateExtraction,
  optimizeMemory,
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
  space_id: 'default',
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

describe('applyMemoryEdits', () => {
  it('archives harmful ids and batches useful/unrelated counter updates', async () => {
    const store = createStore();

    await applyMemoryEdits({
      store,
      recalledIds: ['memory_a', 'memory_b', 'memory_c'],
      labels: { useful: ['memory_a', 'memory_not_recalled'], harmful: ['memory_c'] },
      extractions: [],
      logger: loggerMock.create(),
    });

    expect(store.archive).toHaveBeenCalledWith('memory_c');
    expect(store.applyCounterUpdates).toHaveBeenCalledWith([
      { id: 'memory_a', addImp: 1, addConv: 1 },
      { id: 'memory_b', addImp: 1, addConv: 0 },
    ]);
    expect(store.list).not.toHaveBeenCalled();
  });

  it('skips extractions that duplicate recalled slugs', async () => {
    const store = createStore();

    await applyMemoryEdits({
      store,
      recalledIds: ['memory_kafka-lag'],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'kafka-lag',
          title: 'Kafka lag',
          content: 'Already recalled.',
          tags: [],
          categories: [],
        },
      ],
      logger: loggerMock.create(),
    });

    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('skips extractions whose title matches a recalled page', async () => {
    const store = createStore();

    await applyMemoryEdits({
      store,
      recalledIds: ['memory_kafka-lag'],
      recalledMemories: [page('memory_kafka-lag', 'Kafka consumer lag')],
      labels: { useful: [], harmful: [] },
      extractions: [
        {
          slug: 'checkout-kafka',
          title: 'Kafka consumer lag',
          content: 'Same fact, new slug.',
          tags: [],
          categories: [],
        },
      ],
      logger: loggerMock.create(),
    });

    expect(store.upsert).not.toHaveBeenCalled();
    expect(store.list).not.toHaveBeenCalled();
  });

  it('skips extractions that overlap a catalog hit with a different slug', async () => {
    const store = createStore({
      retrieve: jest
        .fn()
        .mockResolvedValue([
          page(
            'memory_checkout-redis',
            'Checkout Redis',
            'Checkout uses Redis db 2 for sessions and evicts on memory pressure.'
          ),
        ]),
    });

    await applyMemoryEdits({
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
      logger: loggerMock.create(),
    });

    expect(store.upsert).not.toHaveBeenCalled();
    expect(store.retrieve).toHaveBeenCalledWith({ query: 'Checkout Redis', size: 5 });
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

    await applyMemoryEdits({
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
    const proposeExtractions = jest.fn().mockResolvedValue([]);

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
    const proposeExtractions = jest.fn().mockResolvedValue([
      {
        slug: 'checkout-redis',
        title: 'Checkout Redis',
        content: 'Checkout uses Redis db 2 for sessions.',
        tags: ['redis'],
        categories: [],
      },
    ]);

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
      expect.objectContaining({ slug: 'checkout-redis', status: 'tentative' })
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
