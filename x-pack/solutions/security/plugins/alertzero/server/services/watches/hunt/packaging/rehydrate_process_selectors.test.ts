/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { makeRehydrateProcessSelectors } from './rehydrate_process_selectors';

type MgetDoc = Record<string, unknown>;

const exitSearchResponse = (exitedAtByEntityId: Record<string, string>) => ({
  _shards: { total: 1 },
  aggregations: {
    exited: {
      buckets: Object.entries(exitedAtByEntityId).map(([key, exitedAt]) => ({
        key,
        exited_at: { value_as_string: exitedAt },
      })),
    },
  },
});

const esClientWith = (
  docs: MgetDoc[],
  exitedAtByEntityId: Record<string, string> = {}
): ElasticsearchClient =>
  ({
    mget: jest.fn().mockResolvedValue({ docs }),
    search: jest.fn().mockResolvedValue(exitSearchResponse(exitedAtByEntityId)),
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

  it('keeps the newest observation timestamp when an older technique-attributed ref wins the slot', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-old-technique', {
        '@timestamp': '2026-09-26T09:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'a.exe' },
        event: { type: 'start' },
      }),
      found('logs-endpoint.events-default', 'ev-new-plain', {
        '@timestamp': '2026-09-27T12:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'a.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        eventRef('logs-endpoint.events-default', 'ev-old-technique', 'T1059.001'),
        eventRef('logs-endpoint.events-default', 'ev-new-plain'),
      ],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0]).toMatchObject({
      techniqueId: 'T1059.001',
      observedAt: '2026-09-27T12:00:00.000Z',
    });
  });

  it('keeps every attributed technique, so a destructive one survives another winning the slot', async () => {
    const proc = {
      host: { name: 'h1' },
      process: { pid: 100, name: 'a.exe' },
      event: { type: 'start' },
    };
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T09:00:00.000Z',
        ...proc,
      }),
      found('logs-endpoint.events-default', 'ev-2', {
        '@timestamp': '2026-09-26T12:00:00.000Z',
        ...proc,
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        eventRef('logs-endpoint.events-default', 'ev-1', 'T1486'),
        eventRef('logs-endpoint.events-default', 'ev-2', 'T1059.001'),
      ],
    });
    expect(selectors).toHaveLength(1);
    expect(selectors[0].techniqueId).toBe('T1059.001');
    expect([...(selectors[0].techniqueIds ?? [])].sort()).toEqual(['T1059.001', 'T1486']);
  });

  it('picks the same representative regardless of an interleaved newer unattributed ref', async () => {
    const proc = {
      host: { name: 'h1' },
      process: { pid: 100, name: 'a.exe' },
      event: { type: 'start' },
    };
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T09:00:00.000Z',
        ...proc,
      }),
      found('logs-endpoint.events-default', 'ev-plain', {
        '@timestamp': '2026-09-27T09:00:00.000Z',
        ...proc,
      }),
      found('logs-endpoint.events-default', 'ev-2', {
        '@timestamp': '2026-09-26T12:00:00.000Z',
        ...proc,
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [
        eventRef('logs-endpoint.events-default', 'ev-1', 'T1486'),
        eventRef('logs-endpoint.events-default', 'ev-plain'),
        eventRef('logs-endpoint.events-default', 'ev-2', 'T1059.001'),
      ],
    });
    expect(selectors[0].techniqueId).toBe('T1059.001');
    expect(selectors[0].observedAt).toBe('2026-09-27T09:00:00.000Z');
  });

  it('carries the executable path onto the selector', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-1', {
        '@timestamp': '2026-09-26T09:00:00.000Z',
        host: { name: 'h1' },
        process: { pid: 100, name: 'lsass.exe', executable: 'C:\\Windows\\System32\\lsass.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('logs-endpoint.events-default', 'ev-1')],
    });
    expect(selectors[0].processExecutable).toBe('C:\\Windows\\System32\\lsass.exe');
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

  it('leaves cross-cluster refs out of the mget, which cannot read a remote index', async () => {
    const esClient = esClientWith([
      found('logs-endpoint.events-default', 'ev-local', {
        '@timestamp': '2026-09-26T10:00:00.000Z',
        host: { name: 'WIN-ANALYST01' },
        process: { entity_id: 'ent-1', pid: 4312, name: 'powershell.exe' },
        event: { type: 'start' },
      }),
    ]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [{ alert_id: 'al-remote', index: 'remote:.alerts-security.alerts-default' }],
      events: [
        eventRef('remote:.ds-logs-endpoint.events.process-default-2026.10.26-000001', 'ev-remote'),
        eventRef('logs-endpoint.events-default', 'ev-local'),
      ],
    });

    expect(esClient.mget).toHaveBeenCalledWith(
      expect.objectContaining({
        docs: [
          expect.objectContaining({ _index: 'logs-endpoint.events-default', _id: 'ev-local' }),
        ],
      })
    );
    expect(selectors).toHaveLength(1);
  });

  it('makes no mget call when every ref is remote', async () => {
    const esClient = esClientWith([]);
    const selectors = await makeRehydrateProcessSelectors(esClient)({
      alerts: [],
      events: [eventRef('remote:logs-endpoint.events.process-default', 'ev-remote')],
    });
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

  describe('exited processes', () => {
    const startDoc = (id: string, entityId: string, timestamp: string) =>
      found('logs-endpoint.events-default', id, {
        '@timestamp': timestamp,
        host: { name: 'h1' },
        process: { entity_id: entityId, name: `${entityId}.bin` },
        event: { type: ['start'] },
      });

    it('marks a process exited when Defend recorded its end event, and leaves a live one unmarked', async () => {
      const esClient = esClientWith(
        [
          startDoc('ev-1', 'ent-exited', '2026-09-26T10:00:00.000Z'),
          startDoc('ev-2', 'ent-live', '2026-09-26T11:00:00.000Z'),
        ],
        { 'ent-exited': '2026-09-26T10:02:00.000Z' }
      );
      const selectors = await makeRehydrateProcessSelectors(esClient)({
        alerts: [],
        events: [
          eventRef('logs-endpoint.events-default', 'ev-1'),
          eventRef('logs-endpoint.events-default', 'ev-2'),
        ],
      });

      expect(selectors.find((s) => s.entityId === 'ent-exited')?.exitedAt).toBe(
        '2026-09-26T10:02:00.000Z'
      );
      expect(selectors.find((s) => s.entityId === 'ent-live')).not.toHaveProperty('exitedAt');
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ['logs-endpoint.events.process-*'],
          query: {
            bool: {
              filter: [
                { terms: { 'process.entity_id': ['ent-exited', 'ent-live'] } },
                { term: { 'event.category': 'process' } },
                { term: { 'event.type': 'end' } },
                // Seven days before the earliest observation.
                { range: { '@timestamp': { gte: '2026-09-19T10:00:00.000Z' } } },
              ],
            },
          },
        })
      );
    });

    it('also searches the plain Defend indices the hunt read, and no other index it read', async () => {
      const packIndex = 'logs-endpoint.events.00e5ea78.2026.10.08';
      const esClient = esClientWith(
        Array.from({ length: 5 }, (_, i) =>
          startDoc(`ev-${i}`, `ent-${i}`, '2026-10-08T10:00:00.000Z')
        )
      );
      await makeRehydrateProcessSelectors(esClient)({
        alerts: [{ alert_id: 'ev-4', index: '.internal.alerts-security.alerts-default-000001' }],
        events: [
          eventRef(packIndex, 'ev-0'),
          eventRef(packIndex, 'ev-1'),
          eventRef('.ds-logs-endpoint.events.network-default-2026.10.08-000001', 'ev-2'),
          eventRef('winlogbeat-2026.10.08', 'ev-3'),
        ],
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ['logs-endpoint.events.process-*', packIndex],
          ignore_unavailable: true,
          size: 0,
          track_total_hits: false,
        })
      );
    });

    it('leaves a candidate without @timestamp out of the lookup, so it cannot widen the search window', async () => {
      const esClient = esClientWith([
        found('logs-endpoint.events-default', 'ev-undated', {
          host: { name: 'h1' },
          process: { entity_id: 'ent-undated', name: 'undated.bin' },
          event: { type: ['start'] },
        }),
        startDoc('ev-dated', 'ent-dated', '2026-09-26T10:00:00.000Z'),
      ]);
      const selectors = await makeRehydrateProcessSelectors(esClient)({
        alerts: [],
        events: [
          eventRef('logs-endpoint.events-default', 'ev-undated'),
          eventRef('logs-endpoint.events-default', 'ev-dated'),
        ],
      });

      expect(selectors).toHaveLength(2);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                { terms: { 'process.entity_id': ['ent-dated'] } },
                { range: { '@timestamp': { gte: '2026-09-19T10:00:00.000Z' } } },
              ]),
            },
          },
        })
      );
    });

    it('leaves a candidate with an unparsable @timestamp out of the lookup instead of failing it for the rest', async () => {
      const esClient = esClientWith(
        [
          found('logs-endpoint.events-default', 'ev-epoch-millis', {
            '@timestamp': 1761648064974,
            host: { name: 'h1' },
            process: { entity_id: 'ent-epoch-millis', name: 'millis.bin' },
            event: { type: ['start'] },
          }),
          startDoc('ev-exited', 'ent-exited', '2026-09-26T10:00:00.000Z'),
        ],
        { 'ent-exited': '2026-09-26T10:02:00.000Z' }
      );
      const logger = { warn: jest.fn() } as unknown as Logger;
      const selectors = await makeRehydrateProcessSelectors(
        esClient,
        logger
      )({
        alerts: [],
        events: [
          eventRef('logs-endpoint.events-default', 'ev-epoch-millis'),
          eventRef('logs-endpoint.events-default', 'ev-exited'),
        ],
      });

      expect(selectors.find((s) => s.entityId === 'ent-exited')?.exitedAt).toBe(
        '2026-09-26T10:02:00.000Z'
      );
      expect(selectors.find((s) => s.entityId === 'ent-epoch-millis')).not.toHaveProperty(
        'exitedAt'
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('makes no exit lookup when no candidate has a usable timestamp', async () => {
      const esClient = esClientWith([
        found('logs-endpoint.events-default', 'ev-undated', {
          host: { name: 'h1' },
          process: { entity_id: 'ent-undated', name: 'undated.bin' },
          event: { type: ['start'] },
        }),
      ]);
      const selectors = await makeRehydrateProcessSelectors(esClient)({
        alerts: [],
        events: [eventRef('logs-endpoint.events-default', 'ev-undated')],
      });

      expect(selectors).toHaveLength(1);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('keeps a live process inside the per-host cap ahead of newer exited ones', async () => {
      const docs = [
        startDoc('ev-live', 'ent-live', '2026-09-26T01:00:00.000Z'),
        ...Array.from({ length: 5 }, (_, i) =>
          startDoc(`ev-${i}`, `ent-${i}`, `2026-09-26T1${i}:00:00.000Z`)
        ),
      ];
      const exited = Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => [`ent-${i}`, '2026-09-26T20:00:00.000Z'])
      );
      const selectors = await makeRehydrateProcessSelectors(esClientWith(docs, exited))({
        alerts: [],
        events: docs.map(({ _id }) => eventRef('logs-endpoint.events-default', String(_id))),
      });

      expect(selectors).toHaveLength(5);
      expect(selectors.map((s) => s.entityId)).toContain('ent-live');
    });

    it('treats processes as live, with a warning, when the exit lookup fails', async () => {
      const esClient = {
        mget: jest
          .fn()
          .mockResolvedValue({ docs: [startDoc('ev-1', 'ent-1', '2026-09-26T10:00:00.000Z')] }),
        search: jest.fn().mockRejectedValue(new Error('search_phase_execution_exception')),
      } as unknown as ElasticsearchClient;
      const logger = { warn: jest.fn() } as unknown as Logger;
      const selectors = await makeRehydrateProcessSelectors(
        esClient,
        logger
      )({ alerts: [], events: [eventRef('logs-endpoint.events-default', 'ev-1')] });

      expect(selectors).toHaveLength(1);
      expect(selectors[0]).not.toHaveProperty('exitedAt');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('exit lookup failed'));
    });

    it('treats processes as live, with a warning, when no Defend process index is readable', async () => {
      const esClient = {
        mget: jest
          .fn()
          .mockResolvedValue({ docs: [startDoc('ev-1', 'ent-1', '2026-09-26T10:00:00.000Z')] }),
        search: jest.fn().mockResolvedValue({ _shards: { total: 0 } }),
      } as unknown as ElasticsearchClient;
      const logger = { warn: jest.fn() } as unknown as Logger;
      const selectors = await makeRehydrateProcessSelectors(
        esClient,
        logger
      )({ alerts: [], events: [eventRef('logs-endpoint.events-default', 'ev-1')] });

      expect(selectors[0]).not.toHaveProperty('exitedAt');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no readable Defend process events index')
      );
    });
  });
});
