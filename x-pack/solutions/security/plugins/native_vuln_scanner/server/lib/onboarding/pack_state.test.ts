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
      { code: 'query_not_snapshot', queryId: third.id },
      { code: 'query_disabled', queryId: third.id },
    ]);
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
