/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { MEMORY_INDEX } from '../../../common/memory';
import { createMemoryPageStore, epochSecondsToIso, type MemoryPageWrite } from '../page_store';

const SPACE_A = 'space-a';
const SPACE_B = 'space-b';
const NOW_SECONDS = 1_800_000_000;

const createPage = (slug: string, overrides: Partial<MemoryPageWrite> = {}): MemoryPageWrite => ({
  slug,
  title: `${slug} title`,
  content: `${slug} content`,
  tags: ['runbook'],
  categories: ['operations'],
  references: [],
  user: 'nightshift-test',
  ...overrides,
});

describe('Nightshift Semantic Memory with Elasticsearch', () => {
  jest.setTimeout(180_000);

  let esServer: EsTestCluster;
  let esClient: Client;

  const logger = loggerMock.create();

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
      // The managed mapping writes semantic_text, which needs a trial license to
      // run the inference endpoint on write.
      license: 'trial',
    });
    await esServer.start();
    esClient = esServer.getClient();

    await esClient.indices.delete({ index: MEMORY_INDEX, ignore_unavailable: true });
  });

  afterAll(async () => {
    await esClient?.indices.delete({ index: MEMORY_INDEX, ignore_unavailable: true });
    await esClient?.close();
    await esServer?.stop();
  });

  it('auto-creates the managed ai-index mapping on first write', async () => {
    const store = createMemoryPageStore({
      esClient,
      logger,
      spaceId: SPACE_A,
      now: () => NOW_SECONDS,
    });
    await store.create(createPage('mapping-probe'));

    const mapping = await esClient.indices.getMapping({ index: MEMORY_INDEX });
    const properties = mapping[MEMORY_INDEX].mappings.properties;

    expect(MEMORY_INDEX.startsWith('ai-index-idx-')).toBe(true);
    // The task-recall context is stored in the managed `description` field, the
    // same semantic shape as `title` and `content`.
    expect(properties?.description).toEqual(
      expect.objectContaining({
        type: 'text',
        fields: expect.objectContaining({
          semantic: expect.objectContaining({ type: 'semantic_text' }),
        }),
      })
    );
    // Memory adds no field of its own: the managed mapping has no `context`,
    // and no `ai-index@custom` component template exists.
    expect(properties?.context).toBeUndefined();
    expect(properties?.attributes).toEqual(expect.objectContaining({ type: 'flattened' }));
    await expect(
      esClient.cluster.getComponentTemplate({ name: 'ai-index@custom' })
    ).rejects.toThrow();

    // Start the lifecycle test from an empty, auto-created index.
    await esClient.indices.delete({ index: MEMORY_INDEX });
  });

  it('exercises page lifecycle, isolation, and counter OCC on the semantic index', async () => {
    const storeA = createMemoryPageStore({
      esClient,
      logger,
      spaceId: SPACE_A,
      now: () => NOW_SECONDS,
    });
    const storeB = createMemoryPageStore({
      esClient,
      logger,
      spaceId: SPACE_B,
      now: () => NOW_SECONDS,
    });

    const pageA = await storeA.create(
      createPage('shared-runbook', {
        title: 'Checkout Kafka recovery',
        content: 'Restart the checkout consumer after checking partition lag.',
      })
    );
    const pageB = await storeB.create(
      createPage('shared-runbook', {
        title: 'Payments database recovery',
        content: 'Fail payments over to the database replica.',
      })
    );
    const canonicalized = await storeA.create(
      createPage('Memory-Cache Warmup!!', {
        title: 'Cache warmup',
        content: 'Warm the product cache before shifting traffic.',
      })
    );

    expect(pageA.id).toBe('memory_shared-runbook');
    expect(pageB.id).toBe('memory_shared-runbook');
    expect(canonicalized.id).toBe('memory_cache-warmup');
    expect(await storeA.get('Memory-Cache Warmup!!')).toBeUndefined();
    expect((await storeA.get('memory_cache-warmup'))?.slug).toBe('Memory-Cache Warmup!!');

    const contentHits = await storeA.retrieve({
      query: 'checkout consumer partition',
      match: 'content',
    });
    expect(contentHits.map(({ id }) => id)).toEqual(['memory_shared-runbook']);

    const browsedA = await storeA.retrieve();
    const browsedB = await storeB.retrieve();
    expect(browsedA.map(({ title }) => title).sort()).toEqual([
      'Cache warmup',
      'Checkout Kafka recovery',
    ]);
    expect(browsedB.map(({ title }) => title)).toEqual(['Payments database recovery']);

    const beforeCounters = await esClient.get({
      index: MEMORY_INDEX,
      id: `${SPACE_A}:${pageA.id}`,
    });

    // This is the production partial-doc operation that replaced Painless. Elasticsearch
    // rejects scripted updates on indices containing semantic_text in affected versions.
    await Promise.all([
      storeA.applyCounterUpdates([{ id: pageA.id, addImp: 1, addConv: 0 }]),
      storeA.applyCounterUpdates([{ id: pageA.id, addImp: 1, addConv: 0 }]),
    ]);

    const afterCounters = await esClient.get({
      index: MEMORY_INDEX,
      id: `${SPACE_A}:${pageA.id}`,
    });
    const updated = await storeA.get(pageA.id);
    expect(updated?.telemetry).toEqual({
      impressions: 2,
      conversions: 0,
      last_impression_time: epochSecondsToIso(NOW_SECONDS),
    });
    const beforeVersion = beforeCounters._version;
    if (beforeVersion === undefined) {
      throw new Error('Expected Elasticsearch get response to include _version');
    }
    expect(afterCounters._version).toBe(beforeVersion + 2);
    expect(afterCounters._source).toEqual(
      expect.objectContaining({
        title: 'Checkout Kafka recovery',
        content: 'Restart the checkout consumer after checking partition lag.',
      })
    );

    const archived = await storeA.archive(pageA.id, 'harmful');
    expect(archived).toEqual(
      expect.objectContaining({
        id: pageA.id,
        archived: true,
        archive_reason: 'harmful',
      })
    );
    expect((await storeA.retrieve()).map(({ id }) => id)).toEqual(['memory_cache-warmup']);
    expect((await storeA.list({ filter: 'archived' })).pages.map(({ id }) => id)).toEqual([
      pageA.id,
    ]);
    expect((await storeA.list({ filter: 'active' })).pages.map(({ id }) => id)).toEqual([
      'memory_cache-warmup',
    ]);

    // The header's two numbers under every list filter. `total` follows the
    // listing; `archived` is the Space's own count, so the Active view no longer
    // reports "0 archived" for a Space that has one.
    for (const [filter, total] of [
      ['active', 1],
      ['archived', 1],
      ['all', 2],
    ] as const) {
      const page = await storeA.listPaginated({ filter });
      expect(page.stats).toMatchObject({ total, archived: 1 });
    }

    // Restoring clears the reason, which is the only archived marker.
    const restored = await storeA.unarchive(pageA.id);
    expect(restored).toEqual(expect.objectContaining({ id: pageA.id, archived: false }));
    expect((await storeA.get(pageA.id))?.archive_reason).toBeUndefined();

    // Counters apply again once restored: the page stood at 2 impressions before
    // archiving, and the update adds one more.
    await storeA.applyCounterUpdates([{ id: pageA.id, addImp: 1, addConv: 1 }]);
    expect((await storeA.get(pageA.id))?.telemetry.impressions).toBe(3);
    // The archive/unarchive round trip preserved the rest of the document.
    expect((await storeA.get(pageA.id))?.content).toContain('partition lag');
    expect((await storeB.get(pageB.id))?.title).toBe('Payments database recovery');
  });

  // Semantic/RRF retrieval requires a configured inference endpoint and is intentionally
  // separate coverage. These writes omit context so this test never downloads or provisions a model.
});
