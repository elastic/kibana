/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { makeRehydrateProcessSelectors } from './rehydrate_process_selectors';

type MgetDoc = Record<string, unknown>;

const esClientWith = (docs: MgetDoc[]): ElasticsearchClient =>
  ({
    mget: jest.fn().mockResolvedValue({ docs }),
  } as unknown as ElasticsearchClient);

const found = (index: string, id: string, source: Record<string, unknown>): MgetDoc => ({
  _index: index,
  _id: id,
  found: true,
  _source: source,
});

const eventRef = (index: string, id: string, technique_id?: string) => ({
  source_index: index,
  event_id: id,
  ...(technique_id ? { matched: { technique_id } } : {}),
});

describe('makeRehydrateProcessSelectors', () => {
  it('maps a found event doc with entity_id to a process selector', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'WIN-ANALYST01' },
        process: { entity_id: 'ent-1', pid: 4312, name: 'powershell.exe' },
        event: { type: 'start' },
      }),
    ]);
    const rehydrate = makeRehydrateProcessSelectors(esClient);
    const selectors = await rehydrate({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0]).toMatchObject({
      hostName: 'WIN-ANALYST01',
      entityId: 'ent-1',
      pid: 4312,
      processKey: 'entity_id:ent-1',
      observedAt: '2026-09-26T10:00:00.000Z',
      processName: 'powershell.exe',
    });
  });

  it('prefers entity_id over pid when both are present, and derives processKey from it', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { entity_id: 'ent-1', pid: 100 },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors[0].processKey).toBe('entity_id:ent-1');
  });

  it('falls back to pid-based processKey when entity_id is absent', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 200 },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors[0].processKey).toBe('pid:200');
    expect(selectors[0].entityId).toBeUndefined();
  });

  it('drops a doc whose event.type contains "end"', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 200 },
        event: { type: 'end' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors).toHaveLength(0);
  });

  it('drops a doc with no host name', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        process: { pid: 200 },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors).toHaveLength(0);
  });

  it('drops a doc with neither entity_id nor pid', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { name: 'x.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors).toHaveLength(0);
  });

  it('dedupes on host + processKey, keeping the newest observation', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'old.exe' },
        event: { type: 'start' },
      }),
      found('logs-endpoint.events-default', 'ev-2', {
        '@timestamp': '2026-09-26T12:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'new.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        eventRef('logs-endpoint.events-default', 'ev-1'),
        eventRef('logs-endpoint.events-default', 'ev-2'),
      ],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0].processName).toBe('new.exe');
  });

  it('prefers a technique-attributed ref over a plain sample ref regardless of recency', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-newer-unmatched', {
        '@timestamp': '2026-09-26T12:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'sample.exe' },
        event: { type: 'start' },
      }),
      found('logs-endpoint.events-default', 'ev-older-matched', {
        '@timestamp': '2026-09-26T09:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'confirmed.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        eventRef('logs-endpoint.events-default', 'ev-newer-unmatched'),
        eventRef('logs-endpoint.events-default', 'ev-older-matched', 'T1059.001'),
      ],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0].processName).toBe('confirmed.exe');
  });

  it('carries the matched technique id onto the selector', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'confirmed.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1', 'T1059.001')],
    });
    expect(selectors[0].techniqueId).toBe('T1059.001');
  });

  it('marks a selector iocMatched when its ref carried matched.ioc, and false otherwise', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-ioc', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'ioc.exe' },
        event: { type: 'start' },
      }),
      found('logs-endpoint.events-default', 'ev-plain', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 200, name: 'plain.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        { ...eventRef('logs-endpoint.events-default', 'ev-ioc'), matched: { ioc: true } },
        eventRef('logs-endpoint.events-default', 'ev-plain'),
      ],
    });
    expect(selectors.find((s) => s.pid === 100)?.iocMatched).toBe(true);
    expect(selectors.find((s) => s.pid === 200)?.iocMatched).toBe(false);
  });

  it('ORs iocMatched across refs for the same process even when a technique-attributed ref wins the slot', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-ioc', {
        '@timestamp': '2026-09-26T09:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'a.exe' },
        event: { type: 'start' },
      }),
      found('logs-endpoint.events-default', 'ev-technique', {
        '@timestamp': '2026-09-26T12:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'a.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        { ...eventRef('logs-endpoint.events-default', 'ev-ioc'), matched: { ioc: true } },
        eventRef('logs-endpoint.events-default', 'ev-technique', 'T1059.001'),
      ],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0]).toMatchObject({ techniqueId: 'T1059.001', iocMatched: true });
  });

  it('leaves techniqueId undefined for a plain sample ref with no technique match', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'sample.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors[0].techniqueId).toBeUndefined();
  });

  it('caps at 5 selectors per host, keeping the newest', async () => {
    const docs = Array.from({ length: 7 }, (_, i) =>
      found('logs-endpoint.events-default', `ev-${i}`, {
        '@timestamp': `2026-09-26T${String(i + 1).padStart(2, '0')}:00:00.000Z`,
        host: { name: 'h1' },
        process: { pid: 100 + i, name: `p${i}.exe` },
        event: { type: 'start' },
      })
    );
    const esClient = esClientWith(docs);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: docs.map((_, i) => eventRef('logs-endpoint.events-default', `ev-${i}`)),
    });
    expect(selectors).toHaveLength(5);
    // Newest 5 (indexes 2-6) survive the cap; the two oldest are dropped.
    expect(selectors.map((s) => s.pid).sort()).toEqual([102, 103, 104, 105, 106]);
  });

  it('accepts an alerts-index doc as a valid source', async () => {
    const esClient = esClientWith([
      found('.internal.alerts-security.alerts-default-000001', 'alert-1', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { entity_id: 'ent-1', name: 'powershell.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [{ index: '.internal.alerts-security.alerts-default-000001', alert_id: 'alert-1' }],
      events: [],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0].entityId).toBe('ent-1');
  });

  it('returns no selectors, without throwing, when there are no refs at all', async () => {
    const esClient = esClientWith([]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({ alerts: [], events: [] });
    expect(selectors).toEqual([]);
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('returns [] rather than throwing when mget itself fails', async () => {
    const esClient = {
      mget: jest.fn().mockRejectedValue(new Error('cluster unavailable')),
    } as unknown as ElasticsearchClient;
    const logger = { warn: jest.fn() } as unknown as import('@kbn/core/server').Logger;
    const selectors = await makeRehydrateProcessSelectors(
      esClient,
      logger
    )({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips a per-doc mget error entry and still returns selectors from the rest', async () => {
    const esClient = esClientWith([
      {
        _index: 'logs-endpoint.events-default',
        _id: 'ev-1',
        error: { type: 'security_exception' },
      },
      found('logs-endpoint.events-default', 'ev-2', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100 },
        event: { type: 'start' },
      }),
    ]);
    const logger = { warn: jest.fn() } as unknown as import('@kbn/core/server').Logger;
    const selectors = await makeRehydrateProcessSelectors(
      esClient,
      logger
    )({
      alerts: [],
      events: [
        eventRef('logs-endpoint.events-default', 'ev-1'),
        eventRef('logs-endpoint.events-default', 'ev-2'),
      ],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0].pid).toBe(100);
    expect(logger.warn).toHaveBeenCalled();
  });
});
