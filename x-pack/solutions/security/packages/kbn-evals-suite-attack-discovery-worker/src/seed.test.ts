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
    mget: jest.fn(async ({ ids }: { ids: string[] }) => ({
      docs: ids.map((_id) => ({ _id, found: false })),
    })),
    ...overrides,
  } as unknown as Client);

describe('assertCleanSpace', () => {
  it('names where in the run it was checked', async () => {
    const count = jest.fn(async () => ({ count: 1 }));
    await expect(
      assertCleanSpace({ esClient: esWith({ count }), spaceId: 's', when: 'after the last row' })
    ).rejects.toThrow(/not clean after the last row/);
  });

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
  interface BulkArgs {
    refresh?: boolean | string;
    operations: Array<Record<string, { _id?: string; _index?: string }>>;
  }

  const rejectedItems = {
    errors: true,
    items: [{ index: { error: { type: 'mapper_parsing_exception' } } }],
  };
  const notFound = { delete: { status: 404, result: 'not_found' } };
  const indexMissing = {
    delete: { status: 404, error: { type: 'index_not_found_exception' } },
  };

  /** The bulk calls the seed made: the seed write first, then the cleanup. */
  const bulkCall = (bulk: jest.Mock, index: number): BulkArgs =>
    bulk.mock.calls[index][0] as BulkArgs;

  /** The ids the seed wrote its alerts under, read from the seed bulk request. */
  const seededIds = (bulk: jest.Mock): string[] =>
    bulkCall(bulk, 0).operations.flatMap((op) => (op.index?._id ? [op.index._id] : []));

  const wait = jest.fn(async (_ms: number) => undefined);
  const seed = (esClient: Client) => seedScenario({ esClient, log, scenario, spaceId: 's', wait });

  beforeEach(() => wait.mockClear());

  /** Every bulk call after the seed write deletes exactly the ids the seed wrote, and no others. */
  const expectEveryCleanupDeletesTheSeededIds = (bulk: jest.Mock, cleanupCalls: number): void => {
    expect(bulk).toHaveBeenCalledTimes(1 + cleanupCalls);
    const ids = seededIds(bulk);
    expect(ids).toHaveLength(scenario.alerts.length);
    for (let call = 1; call <= cleanupCalls; call++) {
      const { operations, refresh } = bulkCall(bulk, call);
      expect(refresh).toBe(true);
      expect(operations.every((op) => Object.keys(op).join() === 'delete')).toBe(true);
      expect(operations.map((op) => op.delete)).toEqual(
        ids.map((_id) => ({ _index: alertsIndexForSpace('s'), _id }))
      );
    }
  };

  it('deletes the seeded ids, and nothing else, after a transport failure of the seed bulk', async () => {
    const deleteByQuery = jest.fn();
    const bulk = jest
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue({ errors: false, items: [notFound] });
    await expect(seed(esWith({ bulk, deleteByQuery }))).rejects.toThrow(/socket hang up/);
    expectEveryCleanupDeletesTheSeededIds(bulk, 8);
    expect(deleteByQuery).not.toHaveBeenCalled();
  });

  it('deletes the seeded ids when the bulk write rejects some', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce(rejectedItems)
      .mockResolvedValueOnce({ errors: false, items: [notFound] });
    await expect(seed(esWith({ bulk }))).rejects.toThrow(/Seeding ".*" failed/);
    expectEveryCleanupDeletesTheSeededIds(bulk, 1);
  });

  it('deletes the seeded ids when reading the open alerts back fails', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce({ errors: false, items: [] })
      .mockResolvedValueOnce({ errors: false, items: [notFound] });
    const search = jest.fn().mockRejectedValue(new Error('search unavailable'));
    await expect(seed(esWith({ bulk, search }))).rejects.toThrow(/search unavailable/);
    expectEveryCleanupDeletesTheSeededIds(bulk, 1);
  });

  it('treats a missing document or index (404) as cleaned and rethrows the seed error', async () => {
    const bulk = jest
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue({ errors: true, items: [notFound, indexMissing] });
    const error = await seed(esWith({ bulk })).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(AggregateError);
    expect((error as Error).message).toMatch(/socket hang up/);
  });

  describe('while the seed bulk may still be running in Elasticsearch', () => {
    const stillThere = (ids: string[]) => ({
      docs: ids.map((_id) => ({ _id, found: true, _source: {} })),
    });
    const gone = (ids: string[]) => ({ docs: ids.map((_id) => ({ _id, found: false })) });
    const cleaned = { errors: false, items: [notFound] };
    const ROUNDS = 8;
    const PAUSE_MS = 500;
    const rejectedBulk = () =>
      jest.fn().mockRejectedValueOnce(new Error('socket hang up')).mockResolvedValue(cleaned);

    it('waits through the whole window when the bulk rejected and nothing ever shows up', async () => {
      const bulk = rejectedBulk();
      const mget = jest.fn(async ({ ids }: { ids: string[] }) => gone(ids));
      const error = await seed(esWith({ bulk, mget })).catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(AggregateError);
      expect((error as Error).message).toMatch(/socket hang up/);
      expectEveryCleanupDeletesTheSeededIds(bulk, ROUNDS);
      expect(mget).toHaveBeenCalledTimes(ROUNDS);
      expect(wait.mock.calls).toEqual(Array.from({ length: ROUNDS - 1 }, () => [PAUSE_MS]));
    });

    it('deletes a write that lands mid-window and calls the seed clean once the last read-back is empty', async () => {
      const bulk = rejectedBulk();
      const mget = jest
        .fn()
        .mockImplementationOnce(async ({ ids }: { ids: string[] }) => gone(ids))
        .mockImplementationOnce(async ({ ids }: { ids: string[] }) => stillThere(ids))
        .mockImplementation(async ({ ids }: { ids: string[] }) => gone(ids));
      const error = await seed(esWith({ bulk, mget })).catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(AggregateError);
      expect(mget).toHaveBeenCalledTimes(ROUNDS);
      expectEveryCleanupDeletesTheSeededIds(bulk, ROUNDS);
      expect(wait).toHaveBeenCalledTimes(ROUNDS - 1);
    });

    it('reports ids still present at the end of the window, even after earlier empty read-backs', async () => {
      const bulk = rejectedBulk();
      let reads = 0;
      const mget = jest.fn(async ({ ids }: { ids: string[] }) =>
        ++reads < ROUNDS ? gone(ids) : stillThere(ids)
      );
      const error = await seed(esWith({ bulk, mget })).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).message).toMatch(/socket hang up/);
      expect((error as AggregateError).message).toMatch(/still exist after 8 delete rounds/);
    });

    it('does one delete and one read-back, with no pause, when the bulk settled with rejected items', async () => {
      const bulk = jest.fn().mockResolvedValueOnce(rejectedItems).mockResolvedValue(cleaned);
      const mget = jest.fn(async ({ ids }: { ids: string[] }) => gone(ids));
      await expect(seed(esWith({ bulk, mget }))).rejects.toThrow(/Seeding ".*" failed/);
      expectEveryCleanupDeletesTheSeededIds(bulk, 1);
      expect(mget).toHaveBeenCalledTimes(1);
      expect(wait).not.toHaveBeenCalled();
    });

    it.each([
      [
        '400 on the first attempt',
        Object.assign(new Error('bad request'), {
          meta: { statusCode: 400, meta: { attempts: 0 } },
        }),
      ],
      [
        '413 on the first attempt',
        Object.assign(new Error('too large'), { meta: { statusCode: 413, meta: { attempts: 0 } } }),
      ],
    ])(
      'treats a 4xx rejection of the seed bulk (%s) as settled: one pass, no pause',
      async (_where, rejection) => {
        const bulk = jest.fn().mockRejectedValueOnce(rejection).mockResolvedValue(cleaned);
        const mget = jest.fn(async ({ ids }: { ids: string[] }) => gone(ids));
        await expect(seed(esWith({ bulk, mget }))).rejects.toThrow(/bad request|too large/);
        expectEveryCleanupDeletesTheSeededIds(bulk, 1);
        expect(mget).toHaveBeenCalledTimes(1);
        expect(wait).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['a 5xx', Object.assign(new Error('unavailable'), { meta: { statusCode: 503 } })],
      ['a transport error without a status', new Error('connection reset')],
      [
        'a 429 after a transport retry (attempt 1 may have been accepted)',
        Object.assign(new Error('unavailable (429)'), {
          meta: { statusCode: 429, meta: { attempts: 1 } },
        }),
      ],
      [
        'a 4xx with no attempts information',
        Object.assign(new Error('unavailable (4xx)'), { meta: { statusCode: 400 } }),
      ],
      [
        'a top-level statusCode with no attempts information',
        Object.assign(new Error('unavailable (413)'), { statusCode: 413 }),
      ],
    ])('keeps %s on the seed bulk unsettled: the whole window', async (_what, rejection) => {
      const bulk = jest.fn().mockRejectedValueOnce(rejection).mockResolvedValue(cleaned);
      const mget = jest.fn(async ({ ids }: { ids: string[] }) => gone(ids));
      await expect(seed(esWith({ bulk, mget }))).rejects.toThrow(/unavailable|connection reset/);
      expectEveryCleanupDeletesTheSeededIds(bulk, ROUNDS);
      expect(wait).toHaveBeenCalledTimes(ROUNDS - 1);
    });

    it('does one pass when only the read of the open alerts failed after the bulk returned', async () => {
      const bulk = jest
        .fn()
        .mockResolvedValueOnce({ errors: false, items: [] })
        .mockResolvedValue(cleaned);
      const search = jest.fn().mockRejectedValue(new Error('search unavailable'));
      await expect(seed(esWith({ bulk, search }))).rejects.toThrow(/search unavailable/);
      expectEveryCleanupDeletesTheSeededIds(bulk, 1);
      expect(wait).not.toHaveBeenCalled();
    });

    it('reports a settled seed whose ids are still present after its single pass', async () => {
      const bulk = jest.fn().mockResolvedValueOnce(rejectedItems).mockResolvedValue(cleaned);
      const mget = jest.fn(async ({ ids }: { ids: string[] }) => stillThere(ids));
      const error = await seed(esWith({ bulk, mget })).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).message).toMatch(/still exist after 1 delete round\b/);
      expect(wait).not.toHaveBeenCalled();
    });

    it('treats a missing index on the read-back as nothing left', async () => {
      const bulk = jest
        .fn()
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValue({ errors: true, items: [indexMissing] });
      const missingIndex = jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('index_not_found_exception'), { statusCode: 404 })
        );
      const error = await seed(esWith({ bulk, mget: missingIndex })).catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(AggregateError);
    });

    it('fails the cleanup when the read-back itself errors', async () => {
      const bulk = rejectedBulk();
      const mget = jest.fn().mockRejectedValue(new Error('es unavailable'));
      const error = await seed(esWith({ bulk, mget })).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).message).toMatch(/es unavailable/);
    });
  });

  it('reports both failures when a cleanup item fails for another reason', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce(rejectedItems)
      .mockResolvedValueOnce({
        errors: true,
        items: [{ delete: { status: 503, error: { type: 'unavailable_shards_exception' } } }],
      });
    const error = await seed(esWith({ bulk })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AggregateError);
    const { message, errors } = error as AggregateError;
    expect(message).toMatch(/mapper_parsing_exception/);
    expect(message).toMatch(/unavailable_shards_exception/);
    expect(message).toMatch(/could not be removed/);
    expect(errors).toHaveLength(2);
  });

  it('reports both failures, in the message too, when the cleanup request itself fails', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce(rejectedItems)
      .mockRejectedValueOnce(new Error('es unavailable'));
    const error = await seed(esWith({ bulk })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toMatch(/mapper_parsing_exception/);
    expect((error as AggregateError).message).toMatch(/es unavailable/);
    expect((error as AggregateError).errors).toHaveLength(2);
  });

  it('deletes nothing when the space is dirty, because the leftovers are not this seed', async () => {
    const bulk = jest.fn();
    const deleteByQuery = jest.fn();
    const count = jest.fn(async () => ({ count: 1 }));
    await expect(seed(esWith({ count, bulk, deleteByQuery }))).rejects.toThrow(/not clean/);
    expect(bulk).not.toHaveBeenCalled();
    expect(deleteByQuery).not.toHaveBeenCalled();
  });
});

describe('cleanupSeed alert delete', () => {
  interface DeleteArgs {
    index: string;
    query?: unknown;
    ignore_unavailable?: boolean;
  }

  it('matches the alerts exactly by run marker, never by prefix', async () => {
    const deleteByQuery = jest.fn(async (_args: DeleteArgs) => ({}));
    await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded });
    const call = deleteByQuery.mock.calls.find(
      ([{ index }]) => index === alertsIndexForSpace('space-a')
    );
    expect(call?.[0].query).toEqual({ term: { tags: seeded.runMarker } });
  });

  it('tolerates a missing index', async () => {
    const deleteByQuery = jest.fn(async (_args: DeleteArgs) => ({}));
    await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded });
    expect(deleteByQuery.mock.calls.every(([args]) => args.ignore_unavailable === true)).toBe(true);
  });

  it('throws when a delete reports failures, after attempting the others', async () => {
    const deleteByQuery = jest
      .fn()
      .mockResolvedValueOnce({ failures: [{ cause: { type: 'x' } }] })
      .mockResolvedValue({});
    await expect(cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded })).rejects.toThrow(
      /Cleanup of space "space-a" failed/
    );
    expect(deleteByQuery).toHaveBeenCalledTimes(3);
  });

  it('throws when a delete reports version conflicts', async () => {
    const deleteByQuery = jest
      .fn()
      .mockResolvedValueOnce({ version_conflicts: 2 })
      .mockResolvedValue({});
    const error = await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded }).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors[0].message).toMatch(/2 version conflicts/);
  });

  it('throws when a delete timed out', async () => {
    const deleteByQuery = jest
      .fn()
      .mockResolvedValueOnce({ timed_out: true })
      .mockResolvedValue({});
    const error = await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded }).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors[0].message).toMatch(/timed out/);
  });

  it('throws when fewer documents were deleted than matched', async () => {
    const deleteByQuery = jest
      .fn()
      .mockResolvedValueOnce({ deleted: 2, total: 3 })
      .mockResolvedValue({});
    const error = await cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded }).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors[0].message).toMatch(/deleted 2 of 3/);
  });

  it('accepts a response with no failures and no conflicts', async () => {
    const deleteByQuery = jest.fn(async () => ({
      failures: [],
      version_conflicts: 0,
      timed_out: false,
      deleted: 3,
      total: 3,
    }));
    await expect(
      cleanupSeed({ esClient: esWith({ deleteByQuery }), seeded })
    ).resolves.toBeUndefined();
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
