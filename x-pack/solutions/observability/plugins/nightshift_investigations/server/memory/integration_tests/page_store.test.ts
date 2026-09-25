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
import { ensureMemoryIndex, MEMORY_INDEX_TEMPLATE_NAME } from '../ensure_memory_index';
import { createMemoryPageStore, epochSecondsToIso, type MemoryPageWrite } from '../page_store';

const SPACE_A = 'space-a';
const SPACE_B = 'space-b';
const AGENT_ID = 'significant-events.deductive-investigation';
const NOW_SECONDS = 1_800_000_000;

const createPage = (slug: string, overrides: Partial<MemoryPageWrite> = {}): MemoryPageWrite => ({
  slug,
  title: `${slug} title`,
  content: `${slug} content`,
  tags: ['runbook'],
  categories: ['operations'],
  references: [],
  status: 'established',
  user: 'nightshift-test',
  ...overrides,
});

describe('Nightshift Semantic Memory with Elasticsearch', () => {
  jest.setTimeout(180_000);

  let esServer: EsTestCluster;
  let esClient: Client;

  const logger = loggerMock.create();

  const deleteIndexTemplate = async (): Promise<void> => {
    try {
      await esClient.indices.deleteIndexTemplate({ name: MEMORY_INDEX_TEMPLATE_NAME });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 404) {
        throw error;
      }
    }
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    esClient = esServer.getClient();

    await esClient.indices.delete({ index: MEMORY_INDEX, ignore_unavailable: true });
    await deleteIndexTemplate();
    await ensureMemoryIndex({ esClient, logger });
  });

  afterAll(async () => {
    await esClient?.indices.delete({ index: MEMORY_INDEX, ignore_unavailable: true });
    await deleteIndexTemplate();
    await esClient?.close();
    await esServer?.stop();
  });

  it('creates a hidden index with the production semantic_text mapping', async () => {
    const mapping = await esClient.indices.getMapping({ index: MEMORY_INDEX });
    const settings = await esClient.indices.getSettings({
      index: MEMORY_INDEX,
      flat_settings: true,
    });

    expect(mapping[MEMORY_INDEX].mappings.properties?.context).toEqual(
      expect.objectContaining({
        type: 'text',
        fields: expect.objectContaining({
          semantic: expect.objectContaining({ type: 'semantic_text' }),
        }),
      })
    );
    expect(settings[MEMORY_INDEX].settings?.['index.hidden']).toBe('true');
  });

  it('exercises page lifecycle, isolation, and counter OCC on the semantic index', async () => {
    const storeA = createMemoryPageStore({
      esClient,
      logger,
      spaceId: SPACE_A,
      agentId: AGENT_ID,
      now: () => NOW_SECONDS,
    });
    const storeB = createMemoryPageStore({
      esClient,
      logger,
      spaceId: SPACE_B,
      agentId: AGENT_ID,
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
        status: 'archived',
        archive_reason: 'harmful',
      })
    );
    expect((await storeA.retrieve()).map(({ id }) => id)).toEqual(['memory_cache-warmup']);
    expect((await storeA.list({ status: 'archived' })).pages.map(({ id }) => id)).toEqual([
      pageA.id,
    ]);

    await storeA.applyCounterUpdates([{ id: pageA.id, addImp: 1, addConv: 1 }]);
    expect((await storeA.get(pageA.id))?.telemetry.impressions).toBe(2);
    expect((await storeB.get(pageB.id))?.title).toBe('Payments database recovery');
  });

  // Semantic/RRF retrieval requires a configured inference endpoint and is intentionally
  // separate coverage. These writes omit context so this test never downloads or provisions a model.
});
