/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResult } from '@kbn/core/server';
import { INVENTORY_PACK_BODY, INVENTORY_PACK_NAME } from '../inventory';
import { inspectInventoryPack, planPackAction } from './pack_state';

const packObject = (
  overrides: Record<string, unknown> = {},
  policyIds: string[] = []
): SavedObjectsFindResult<Record<string, unknown>> =>
  ({
    id: 'pack-1',
    type: 'osquery-pack',
    score: 1,
    attributes: {
      name: INVENTORY_PACK_NAME,
      enabled: true,
      schedule_type: INVENTORY_PACK_BODY.schedule_type,
      queries: Object.values(INVENTORY_PACK_BODY.queries),
      ...overrides,
    },
    references: policyIds.map((id) => ({ type: 'ingest-agent-policies', id, name: id })),
  } as SavedObjectsFindResult<Record<string, unknown>>);

const findReturns = (...pages: Array<SavedObjectsFindResult<Record<string, unknown>>[]>) => {
  const soClient = savedObjectsClientMock.create();
  const total = pages.reduce((sum, page) => sum + page.length, 0);
  pages.forEach((saved_objects) =>
    soClient.find.mockResolvedValueOnce({ saved_objects, total, per_page: 100, page: 1 })
  );
  return soClient;
};

describe('inspectInventoryPack', () => {
  it('reports missing when no pack has the exact name', async () => {
    const soClient = findReturns([packObject({ name: `${INVENTORY_PACK_NAME} copy` })]);
    expect(await inspectInventoryPack(soClient)).toEqual({
      state: 'missing',
      differences: [],
      policyIds: [],
    });
  });

  it('reports ok with the assigned policies when the queries match', async () => {
    const soClient = findReturns([packObject({}, ['p1', 'p2'])]);
    expect(await inspectInventoryPack(soClient)).toEqual({
      state: 'ok',
      packId: 'pack-1',
      differences: [],
      policyIds: ['p1', 'p2'],
    });
  });

  it('only looks in the default space', async () => {
    const soClient = findReturns([packObject()]);
    await inspectInventoryPack(soClient);
    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'osquery-pack', namespaces: ['default'] })
    );
  });

  it('reports differs and names a changed, a missing and a disabled pack', async () => {
    const [first, ...rest] = Object.values(INVENTORY_PACK_BODY.queries);
    const soClient = findReturns([
      packObject({ enabled: false, queries: [{ ...first, query: 'select 1' }, ...rest.slice(1)] }),
    ]);
    const result = await inspectInventoryPack(soClient);
    expect(result.state).toBe('differs');
    expect(result.differences).toEqual(
      expect.arrayContaining([
        { code: 'pack_disabled' },
        { code: 'query_sql_differs', queryId: first.id },
        { code: 'query_missing', queryId: rest[0].id },
      ])
    );
  });

  it('reports a pack on another schedule_type, but not one without a stored schedule_type', async () => {
    const missing = await inspectInventoryPack(
      findReturns([packObject({ schedule_type: undefined, interval: 86_400 })])
    );
    expect(missing.state).toBe('ok');
    const rrule = await inspectInventoryPack(findReturns([packObject({ schedule_type: 'rrule' })]));
    expect(rrule.state).toBe('differs');
    expect(rrule.differences).toEqual([{ code: 'schedule_type_differs' }]);
  });

  it('reads a pack created from INVENTORY_PACK_BODY as ok', async () => {
    const { queries, ...pack } = INVENTORY_PACK_BODY;
    const result = await inspectInventoryPack(
      findReturns([packObject({ ...pack, queries: Object.values(queries) })])
    );
    expect(result).toEqual({ state: 'ok', packId: 'pack-1', differences: [], policyIds: [] });
  });

  it('reports a pack-level interval that differs, but not an absent one', async () => {
    const differing = await inspectInventoryPack(findReturns([packObject({ interval: 1 })]));
    expect(differing.differences).toEqual([{ code: 'interval_differs' }]);
    const absent = await inspectInventoryPack(findReturns([packObject({ interval: undefined })]));
    expect(absent.state).toBe('ok');
  });

  it('reports a platform, snapshot and enabled difference per query', async () => {
    const [first, second, third] = Object.values(INVENTORY_PACK_BODY.queries);
    const { snapshot, ...rest } = third;
    const soClient = findReturns([
      packObject({
        queries: [
          { ...first, platform: 'darwin' },
          { ...second, snapshot: false },
          { ...rest, enabled: false },
          ...Object.values(INVENTORY_PACK_BODY.queries).slice(3),
        ],
      }),
    ]);
    const { differences } = await inspectInventoryPack(soClient);
    expect(differences).toEqual([
      { code: 'query_platform_differs', queryId: first.id },
      { code: 'query_not_snapshot', queryId: second.id },
      { code: 'query_disabled', queryId: third.id },
    ]);
  });

  describe('snapshot mode, resolved the way osquery does', () => {
    // osquery persists snapshot mode as no key. The other queries pin snapshot explicitly so a
    // pack-level default only changes the query under test.
    const [noKey, ...others] = Object.values(INVENTORY_PACK_BODY.queries).map(
      ({ snapshot, ...query }, index) =>
        index === 0 ? query : { ...query, result_type: 'snapshot' }
    );
    const first = noKey;
    const inspectWith = (query: Record<string, unknown>, pack: Record<string, unknown> = {}) =>
      inspectInventoryPack(findReturns([packObject({ ...pack, queries: [query, ...others] })]));

    it('treats an absent snapshot key as a snapshot, since osquery stores snapshot mode as no key', async () => {
      expect((await inspectWith(noKey)).state).toBe('ok');
    });

    it('reports a query with no key as differing when the pack defaults to differential', async () => {
      const { differences } = await inspectWith(noKey, { result_type: 'differential' });
      expect(differences).toEqual([{ code: 'query_not_snapshot', queryId: first.id }]);
    });

    it('lets a query result_type win over the pack default', async () => {
      expect(
        (await inspectWith({ ...noKey, result_type: 'snapshot' }, { result_type: 'differential' }))
          .state
      ).toBe('ok');
      expect((await inspectWith({ ...noKey, result_type: 'differential' })).state).toBe('differs');
    });

    it('does not treat a legacy snapshot: true as a choice, so a differential pack default applies', async () => {
      const { differences } = await inspectWith(
        { ...noKey, snapshot: true },
        { result_type: 'differential' }
      );
      expect(differences).toEqual([{ code: 'query_not_snapshot', queryId: first.id }]);
    });

    it('lets a legacy snapshot: false win over a snapshot pack default', async () => {
      expect(
        (await inspectWith({ ...noKey, snapshot: false }, { result_type: 'snapshot' })).state
      ).toBe('differs');
      expect((await inspectWith({ ...noKey, snapshot: false, removed: false })).state).toBe(
        'differs'
      );
    });
  });

  describe('platform, resolved the way osquery does', () => {
    const [first, ...others] = Object.values(INVENTORY_PACK_BODY.queries);
    const { platform, ...noPlatform } = first;
    const inspectWith = (query: Record<string, unknown>, pack: Record<string, unknown> = {}) =>
      inspectInventoryPack(findReturns([packObject({ ...pack, queries: [query, ...others] })]));

    it('inherits the pack platform when the query has none', async () => {
      expect((await inspectWith(noPlatform, { platform: 'linux' })).state).toBe('ok');
      expect(
        (await inspectWith({ ...noPlatform, platform: ' ' }, { platform: 'linux' })).state
      ).toBe('ok');
    });

    it('treats an all-OS query platform as unrestricted and inherits the pack platform', async () => {
      const allOs = { ...noPlatform, platform: 'darwin, windows,linux' };
      expect((await inspectWith(allOs, { platform: 'linux' })).state).toBe('ok');
    });

    it('reports a query with no platform when the pack has none either', async () => {
      const { differences } = await inspectWith(noPlatform);
      expect(differences).toEqual([{ code: 'query_platform_differs', queryId: first.id }]);
    });

    it('lets a restrictive query platform win over the pack platform', async () => {
      const { differences } = await inspectWith(
        { ...noPlatform, platform: 'darwin' },
        { platform: 'linux' }
      );
      expect(differences).toEqual([{ code: 'query_platform_differs', queryId: first.id }]);
    });
  });

  it('treats an osquery-saved pack with extra fields as ok', async () => {
    const queries = Object.values(INVENTORY_PACK_BODY.queries).map(
      ({ snapshot, platform, ...query }) => ({
        ...query,
        platform: ` ${platform}, `,
        result_type: 'snapshot',
        ecs_mapping: { 'host.name': { field: 'hostname' } },
        version: '1.0.0',
        timeout: 60,
        schedule_id: 'abc',
        enabled: true,
      })
    );
    const result = await inspectInventoryPack(
      findReturns([packObject({ queries, interval: undefined, shards: [], created_by: 'u' })])
    );
    expect(result).toMatchObject({ state: 'ok', differences: [] });
  });

  it('pages on until the exact name turns up', async () => {
    const soClient = savedObjectsClientMock.create();
    const filler = Array.from({ length: 100 }, () => packObject({ name: 'other' }));
    soClient.find
      .mockResolvedValueOnce({ saved_objects: filler, total: 101, per_page: 100, page: 1 })
      .mockResolvedValueOnce({
        saved_objects: [packObject({}, ['p9'])],
        total: 101,
        per_page: 100,
        page: 2,
      });
    const result = await inspectInventoryPack(soClient);
    expect(result.policyIds).toEqual(['p9']);
    expect(soClient.find).toHaveBeenCalledTimes(2);
  });
});

describe('planPackAction', () => {
  const inspection = (state: 'missing' | 'ok' | 'differs', policyIds: string[] = []) => ({
    state,
    differences: state === 'differs' ? [{ code: 'query_sql_differs' as const, queryId: 'x' }] : [],
    policyIds,
  });

  it.each([
    ['missing', [], 'create', ['a', 'b']],
    ['ok', ['a', 'b'], 'no_change', []],
    ['ok', ['a'], 'add_policies', ['b']],
    ['differs', ['a', 'b'], 'repair_queries', []],
    ['differs', ['a'], 'repair_queries_and_add_policies', ['b']],
  ] as const)('%s pack assigned to %j -> %s', (state, assigned, action, add) => {
    const plan = planPackAction(inspection(state, [...assigned]), ['a', 'b']);
    expect(plan.action).toBe(action);
    expect(plan.addPolicyIds).toEqual(add);
  });
});
