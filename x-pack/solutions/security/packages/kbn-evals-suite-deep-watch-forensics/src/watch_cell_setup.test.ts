/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under
 * one or more contributor license agreements. Licensed under the Elastic
 * License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */
import type { ToolingLog } from '@kbn/tooling-log';
import { ATTACK_DISCOVERY_INDEX } from './constants';
import { DEEP_WATCH_GOLDEN_ROWS } from './golden_dataset';
import { setupWatchCell, teardownWatchCell } from './watch_cell_setup';

// The jsdom jest environment ships a crypto object without webcrypto's
// randomUUID (and defines crypto as a getter, so plain assignment is a no-op).
const cryptoRef = globalThis as { crypto?: { randomUUID?: () => string } };
if (!cryptoRef.crypto?.randomUUID) {
  const patched = { ...(cryptoRef.crypto ?? {}), randomUUID: () => require('crypto').randomUUID() };
  Object.defineProperty(globalThis, 'crypto', { value: patched, configurable: true });
}

const EVENT_INDEX = 'logs-endpoint.events.process-default';

/** Records every call so assertions run against real payloads, not mocks' promises. */
const fakeEsClient = (behavior: {
  bulkErrors?: boolean;
  counts: () => { events: number; ads: number };
}) => {
  const calls: Record<string, unknown[]> = { bulk: [], count: [], delete: [], deleteByQuery: [] };
  return {
    calls,
    bulk: jest.fn(async ({ body }: { body: unknown[] }) => {
      calls.bulk.push(body);
      return { errors: behavior.bulkErrors ?? false, items: [] };
    }),
    count: jest.fn(async ({ index }: { index: string }) => {
      calls.count.push(index);
      const { events, ads } = behavior.counts();
      return { count: index === EVENT_INDEX ? events : ads };
    }),
    delete: jest.fn(async (args: unknown) => {
      calls.delete.push(args);
      return { result: 'deleted' };
    }),
    deleteByQuery: jest.fn(async (args: unknown) => {
      calls.deleteByQuery.push(args);
      return { deleted: 0 };
    }),
  };
};

const fakeLog = () =>
  ({ info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() }) as unknown as
    ToolingLog;

describe('setupWatchCell', () => {
  it('seeds kill-chain events plus one AD alert and one constituent detection per golden row', async () => {
    const es = fakeEsClient({
      counts: () => ({ events: 11, ads: DEEP_WATCH_GOLDEN_ROWS.length }),
    });
    await setupWatchCell({ esClient: es as never, log: fakeLog(), rows: DEEP_WATCH_GOLDEN_ROWS });

    const body = es.calls.bulk[0] as Array<Record<string, any>>;
    const ops = body.filter((line) => 'create' in line || 'index' in line);
    const createEvents = ops.filter((o) => 'create' in o);
    const indexAds = ops.filter(
      (o) => 'index' in o && o.index._index === ATTACK_DISCOVERY_INDEX
    );
    const indexDetections = ops.filter(
      (o) => 'index' in o && o.index._index === '.alerts-security.alerts-default'
    );
    expect(createEvents).toHaveLength(11);
    expect(indexAds).toHaveLength(DEEP_WATCH_GOLDEN_ROWS.length);
    // One constituent detection alert per AD row: without it the watch takes
    // emit_no_host for every row (extract_host_from_alerts reads the
    // constituent detections, not the AD doc).
    expect(indexDetections).toHaveLength(DEEP_WATCH_GOLDEN_ROWS.length);
    // Golden row ids must be used verbatim as AD doc ids -- the run route
    // replays them back as attack_discovery_alert_id.
    expect(indexAds.map((o) => o.index._id)).toEqual(
      DEEP_WATCH_GOLDEN_ROWS.map((r) => r.id)
    );
  });

  it('writes every AD doc with a non-empty api_config so the _find transformer keeps it', async () => {
    const es = fakeEsClient({
      counts: () => ({ events: 11, ads: DEEP_WATCH_GOLDEN_ROWS.length }),
    });
    await setupWatchCell({ esClient: es as never, log: fakeLog(), rows: DEEP_WATCH_GOLDEN_ROWS });

    const body = es.calls.bulk[0] as Array<Record<string, any>>;
    const docs = body.filter((line) => !('create' in line) && !('index' in line));
    const adDocs = docs.filter((d) => d['kibana.alert.attack_discovery.alert_ids']);
    expect(adDocs.length).toBeGreaterThan(0);
    for (const doc of adDocs) {
      // An empty api_config {} is silently dropped by the transformer: total
      // counts the doc but data stays []. Found live 2026-09-03.
      expect(Object.keys(doc['kibana.alert.attack_discovery.api_config']).length).toBeGreaterThan(
        0
      );
    }
  });

  it('throws on bulk item errors rather than running the watch against a partial seed', async () => {
    const es = fakeEsClient({
      bulkErrors: true,
      counts: () => ({ events: 11, ads: DEEP_WATCH_GOLDEN_ROWS.length }),
    });
    await expect(
      setupWatchCell({ esClient: es as never, log: fakeLog(), rows: DEEP_WATCH_GOLDEN_ROWS })
    ).rejects.toThrow(/Seed bulk had/);
  });

  it('polls until the seed is actually queryable and never returns before counts match', async () => {
    let polls = 0;
    const es = {
      bulk: jest.fn(async () => ({ errors: false, items: [] })),
      count: jest.fn(async ({ index }: { index: string }) => {
        polls += 1;
        // First poll reports nothing searchable; second reports the full seed.
        const ready = polls > 2;
        const { events, ads } = ready
          ? { events: 11, ads: DEEP_WATCH_GOLDEN_ROWS.length }
          : { events: 0, ads: 0 };
        return { count: index === EVENT_INDEX ? events : ads };
      }),
      delete: jest.fn(async () => ({ result: 'deleted' })),
      deleteByQuery: jest.fn(async () => ({ deleted: 0 })),
    };
    await setupWatchCell({ esClient: es as never, log: fakeLog(), rows: DEEP_WATCH_GOLDEN_ROWS });
    // "Not ready" poll (2 counts: events + AD) then the ready poll (2 more)
    // must both have happened -- the loop iterated rather than passing on the
    // first try, and it only returned once counts actually matched.
    expect(polls).toBeGreaterThanOrEqual(4);
    expect(es.count).toHaveBeenCalledTimes(polls);
  });

  it('aborts after 30s of an unqueryable seed instead of running the watch against missing data', async () => {
    jest.useFakeTimers();
    try {
      const es = {
        bulk: jest.fn(async () => ({ errors: false, items: [] })),
        count: jest.fn(async () => ({ count: 0 })),
        delete: jest.fn(async () => ({ result: 'deleted' })),
        deleteByQuery: jest.fn(async () => ({ deleted: 0 })),
      };
      // Attach the catch handler synchronously so the rejection never floats
      // (the repo's process-warning monitor terminates jest otherwise).
      let caught: Error | undefined;
      const promise = setupWatchCell({
        esClient: es as never,
        log: fakeLog(),
        rows: DEEP_WATCH_GOLDEN_ROWS,
      }).catch((e: Error) => {
        caught = e;
      });
      // Drain the poll loop past its deadline.
      await jest.advanceTimersByTimeAsync(35_000);
      await promise;
      expect((caught as Error | undefined)?.message).toMatch(/Seed not queryable after 30s/);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('teardownWatchCell', () => {
  it('removes every seeded doc idempotently (missing docs are not errors)', async () => {
    const es = fakeEsClient({ counts: () => ({ events: 0, ads: 0 }) });
    await teardownWatchCell({ esClient: es as never, rows: DEEP_WATCH_GOLDEN_ROWS });
    // One deleteByQuery covers all events (tagged via event.dataset), not a
    // per-event loop repeating the identical query.
    expect(es.calls.deleteByQuery).toHaveLength(1);
    // Every AD alert and its constituent detection are deleted.
    expect(es.calls.delete).toHaveLength(DEEP_WATCH_GOLDEN_ROWS.length * 2);
    const deletedIds = (es.calls.delete as Array<{ id: string }>).map((d) => d.id).sort();
    const expected = DEEP_WATCH_GOLDEN_ROWS.flatMap((r) => [r.id, `${r.id}-detection`]).sort();
    expect(deletedIds).toEqual(expected);
  });
});
