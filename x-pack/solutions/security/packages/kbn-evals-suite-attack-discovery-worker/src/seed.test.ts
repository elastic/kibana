/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { alertsIndexForSpace, attackDiscoveryIndexForSpace } from './constants';
import type { KbnRequest } from './kbn_request';
import {
  assertCleanSpace,
  cleanupSeed,
  pauseEntityExtraction,
  prepareWorkerSpace,
  seedScenario,
  type SeededScenario,
} from './seed';
import { AUDIT_SCENARIOS } from './audit_failure_classes/registry';

const seeded: SeededScenario = {
  runMarker: 'adw-1',
  spaceId: 'space-a',
  goldIdBySeededId: new Map(),
  alertCount: 0,
  openAlertIds: [],
};

const esWith = (overrides: Record<string, unknown>): Client =>
  ({
    deleteByQuery: jest.fn(async () => ({})),
    count: jest.fn(async () => ({ count: 0 })),
    ...overrides,
  } as unknown as Client);

describe('assertCleanSpace', () => {
  it('passes an empty space', async () => {
    await expect(assertCleanSpace({ esClient: esWith({}), spaceId: 's' })).resolves.toBeUndefined();
  });

  it('fails loudly when open alerts are left over', async () => {
    const count = jest.fn(async ({ index }: { index: string }) => ({
      count: index.startsWith('.alerts-security') ? 2 : 0,
    }));
    await expect(assertCleanSpace({ esClient: esWith({ count }), spaceId: 's' })).rejects.toThrow(
      /2 open alerts and 0 attack fingerprints/
    );
  });

  it('fails loudly when fingerprints are left over', async () => {
    const count = jest.fn(async ({ index }: { index: string }) => ({
      count: index.startsWith('ai-index') ? 1 : 0,
    }));
    await expect(assertCleanSpace({ esClient: esWith({ count }), spaceId: 's' })).rejects.toThrow(
      /0 open alerts and 1 attack fingerprints/
    );
  });
});

describe('fingerprint space scoping', () => {
  it('counts fingerprints with an exact term on the space id', async () => {
    const count = jest.fn(async (_args: { index: string; query?: unknown }) => ({ count: 0 }));
    await assertCleanSpace({ esClient: esWith({ count }), spaceId: 'ad-worker-eval' });
    const queries = count.mock.calls
      .filter(([{ index }]) => index.startsWith('ai-index'))
      .map(([{ query }]) => query);
    expect(queries).toEqual([{ term: { 'attributes.space_id': 'ad-worker-eval' } }]);
  });

  it('deletes fingerprints with an exact term on the space id', async () => {
    const deleteByQuery = jest.fn(async (_args: { index: string; query?: unknown }) => ({}));
    await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded });
    const queries = deleteByQuery.mock.calls
      .filter(([{ index }]) => index.startsWith('ai-index'))
      .map(([{ query }]) => query);
    expect(queries).toEqual([{ term: { 'attributes.space_id': 'space-a' } }]);
  });
});

describe('cleanupSeed', () => {
  it('deletes alerts, fingerprints and persisted discoveries', async () => {
    const deleteByQuery = jest.fn(async (_args: { index: string }) => ({}));
    await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded });
    const indices = deleteByQuery.mock.calls.map(([{ index }]) => index);
    expect(indices).toContain(attackDiscoveryIndexForSpace('space-a'));
    expect(indices).toHaveLength(3);
  });

  it('throws when a delete fails, after attempting the others', async () => {
    const deleteByQuery = jest
      .fn()
      .mockRejectedValueOnce(new Error('es unavailable'))
      .mockResolvedValue({});
    await expect(cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded })).rejects.toThrow(
      /Cleanup of space "space-a" failed/
    );
    expect(deleteByQuery).toHaveBeenCalledTimes(3);
  });
});

describe('seedScenario', () => {
  it('refuses to seed into a dirty space and writes nothing', async () => {
    const bulk = jest.fn();
    const count = jest.fn(async () => ({ count: 1 }));
    await expect(
      seedScenario({
        esClient: esWith({ bulk, count }),
        log: { info: jest.fn() } as unknown as ToolingLog,
        scenario: AUDIT_SCENARIOS[0],
        spaceId: 's',
      })
    ).rejects.toThrow(/not clean/);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('records the open alert ids of the space after seeding, mapped to scenario ids', async () => {
    const scenario = AUDIT_SCENARIOS[0];
    const search = jest.fn(async () => ({ hits: { hits: [] as Array<{ _id: string }> } }));
    const bulk = jest.fn(async () => ({ errors: false, items: [] }));
    search.mockImplementation(async () => ({
      hits: {
        hits: scenario.alerts.map(({ id }) => ({
          _id: (
            bulk.mock.calls[0] as unknown as [{ operations: Array<{ index?: { _id: string } }> }]
          )[0].operations.find((op) => op.index?._id.endsWith(`-${id}`))?.index?._id as string,
        })),
      },
    }));
    const result = await seedScenario({
      esClient: esWith({ bulk, search }),
      log: { info: jest.fn() } as unknown as ToolingLog,
      scenario,
      spaceId: 's',
    });
    expect([...result.openAlertIds].sort()).toEqual(scenario.alerts.map(({ id }) => id).sort());
  });
});

describe('seedScenario partial failure', () => {
  const log = { info: jest.fn() } as unknown as ToolingLog;
  const scenario = AUDIT_SCENARIOS[0];
  interface DeleteArgs {
    index: string;
    query?: unknown;
    refresh?: boolean;
    ignore_unavailable?: boolean;
  }

  const failingBulk = () =>
    jest.fn(async () => ({
      errors: true,
      items: [{ index: { error: { type: 'mapper_parsing_exception' } } }],
    }));

  /** The marker the seed wrote its alerts under, read from the bulk request. */
  const markerOf = (bulk: jest.Mock): string => {
    const [{ operations }] = bulk.mock.calls[0] as unknown as [
      { operations: Array<{ index?: { _id: string } }> }
    ];
    const id = operations.find((op) => op.index)?.index?._id ?? '';
    return id.slice(0, id.indexOf(`-${scenario.alerts[0].id}`));
  };

  const expectOnlyThisSeedsAlertsDeleted = (deleteByQuery: jest.Mock, bulk: jest.Mock): void => {
    expect(deleteByQuery).toHaveBeenCalledTimes(1);
    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: alertsIndexForSpace('s'),
        query: { term: { tags: markerOf(bulk) } },
        refresh: true,
        ignore_unavailable: true,
      })
    );
    expect(markerOf(bulk)).toMatch(/^adw-[0-9a-f]{10}$/);
  };

  it('removes only the seed alerts, by exact run marker, when the bulk write rejects some', async () => {
    const deleteByQuery = jest.fn(async (_args: DeleteArgs) => ({}));
    const bulk = failingBulk();
    await expect(
      seedScenario({ esClient: esWith({ bulk, deleteByQuery }), log, scenario, spaceId: 's' })
    ).rejects.toThrow(/Seeding ".*" failed/);
    expectOnlyThisSeedsAlertsDeleted(deleteByQuery, bulk);
  });

  it('removes only the seed alerts when reading the open alerts back fails', async () => {
    const deleteByQuery = jest.fn(async (_args: DeleteArgs) => ({}));
    const bulk = jest.fn(async () => ({ errors: false, items: [] }));
    const search = jest.fn().mockRejectedValue(new Error('search unavailable'));
    await expect(
      seedScenario({
        esClient: esWith({ bulk, search, deleteByQuery }),
        log,
        scenario,
        spaceId: 's',
      })
    ).rejects.toThrow(/search unavailable/);
    expectOnlyThisSeedsAlertsDeleted(deleteByQuery, bulk);
  });

  it('never touches the fingerprints or the discoveries of the space', async () => {
    const deleteByQuery = jest.fn(async (_args: DeleteArgs) => ({}));
    await seedScenario({
      esClient: esWith({ bulk: failingBulk(), deleteByQuery }),
      log,
      scenario,
      spaceId: 's',
    }).catch(() => undefined);
    const indices = deleteByQuery.mock.calls.map(([{ index }]) => index);
    expect(indices).toEqual([alertsIndexForSpace('s')]);
  });

  it('reports both failures, in the message too, when the partial seed cannot be removed', async () => {
    const deleteByQuery = jest.fn().mockRejectedValue(new Error('es unavailable'));
    const error = await seedScenario({
      esClient: esWith({ bulk: failingBulk(), deleteByQuery }),
      log,
      scenario,
      spaceId: 's',
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toMatch(/mapper_parsing_exception/);
    expect((error as AggregateError).message).toMatch(/es unavailable/);
    expect((error as AggregateError).message).toMatch(/could not be removed/);
    expect((error as AggregateError).errors).toHaveLength(2);
  });

  it('deletes nothing when the space is dirty, because the leftovers are not this seed', async () => {
    const deleteByQuery = jest.fn(async () => ({}));
    const count = jest.fn(async () => ({ count: 1 }));
    await expect(
      seedScenario({ esClient: esWith({ count, deleteByQuery }), log, scenario, spaceId: 's' })
    ).rejects.toThrow(/not clean/);
    expect(deleteByQuery).not.toHaveBeenCalled();
  });
});

describe('cleanupSeed on a partly seeded space', () => {
  it('tolerates a missing alerts index', async () => {
    const deleteByQuery = jest.fn(
      async (_args: { index: string; ignore_unavailable?: boolean }) => ({})
    );
    await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded });
    expect(deleteByQuery.mock.calls.every(([args]) => args.ignore_unavailable === true)).toBe(true);
  });
});

describe('Entity Store extraction pause', () => {
  const log = { info: jest.fn() } as unknown as ToolingLog;
  const esClient = { indices: { exists: jest.fn(async () => true) } } as unknown as Client;

  /** Answers every setup call with success; the Entity Store status reads come from `statuses`. */
  const stackWith = ({ statuses }: { statuses: Array<number | string> }) => {
    const remaining = [...statuses];
    const calls: string[] = [];
    const request: KbnRequest = async ({ method, path }) => {
      calls.push(`${method} ${path}`);
      if (path.endsWith('/api/security/entity_store/status')) {
        const next = remaining.length > 1 ? remaining.shift() : remaining[0];
        return typeof next === 'number'
          ? { statusCode: next, body: {} }
          : { statusCode: 200, body: { status: next } };
      }
      return { statusCode: 200, body: {} };
    };
    return { request, calls };
  };

  const entityStoreCalls = (calls: string[]) =>
    calls.filter((call) => call.includes('/api/security/entity_store/'));

  it('reports a store this run installed as running, so extraction is paused and restarted', async () => {
    const { request, calls } = stackWith({ statuses: [404, 'running'] });
    const prepared = await prepareWorkerSpace({ request, esClient, log, spaceId: 'eval' });
    expect(entityStoreCalls(calls)).toContain('POST /s/eval/api/security/entity_store/install');
    expect(prepared).toEqual({ entityStoreStatus: 'running' });

    const restore = await pauseEntityExtraction({ request, spaceId: 'eval', ...prepared });
    expect(entityStoreCalls(calls)).toContain('PUT /s/eval/api/security/entity_store/stop');
    await restore();
    expect(entityStoreCalls(calls)).toContain('PUT /s/eval/api/security/entity_store/start');
  });

  it('leaves behavior unchanged for a store that was already running', async () => {
    const { request, calls } = stackWith({ statuses: ['running'] });
    const prepared = await prepareWorkerSpace({ request, esClient, log, spaceId: 'eval' });
    expect(prepared).toEqual({ entityStoreStatus: 'running' });
    expect(entityStoreCalls(calls)).not.toContain('POST /s/eval/api/security/entity_store/install');

    const restore = await pauseEntityExtraction({ request, spaceId: 'eval', ...prepared });
    expect(entityStoreCalls(calls)).toContain('PUT /s/eval/api/security/entity_store/stop');
    await restore();
    expect(entityStoreCalls(calls)).toContain('PUT /s/eval/api/security/entity_store/start');
  });

  it('neither stops nor restarts a store that was already stopped', async () => {
    const { request, calls } = stackWith({ statuses: ['stopped'] });
    const prepared = await prepareWorkerSpace({ request, esClient, log, spaceId: 'eval' });
    expect(prepared).toEqual({ entityStoreStatus: 'stopped' });

    const restore = await pauseEntityExtraction({ request, spaceId: 'eval', ...prepared });
    await restore();
    expect(entityStoreCalls(calls).filter((call) => call.startsWith('PUT'))).toEqual([]);
  });
});
