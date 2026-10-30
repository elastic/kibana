/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFixtureEntityInventoryApiClient } from './fixture_client';
import type { InventoryListRequest } from './types';

const REQUEST: InventoryListRequest = {
  from: '2026-10-30T10:00:00.000Z',
  to: '2026-10-30T10:15:00.000Z',
  limit: 10_000,
};

describe('createFixtureEntityInventoryApiClient', () => {
  it('returns the host and k8s.deployment types with columns in definition order', async () => {
    const { types } = await createFixtureEntityInventoryApiClient().getTypes({});

    expect(types.map(({ type }) => type)).toEqual(['host', 'k8s.deployment']);
    types.forEach(({ columns }) => {
      expect(columns[0]).toEqual({ name: 'entity.id', kind: 'id' });
      expect(columns[columns.length - 1]).toEqual({ name: 'last_seen', kind: 'last_seen' });
    });
  });

  it.each(['host', 'k8s.deployment'])(
    'lists every %s entity in last seen order with every column',
    async (type) => {
      const list = await createFixtureEntityInventoryApiClient().listEntities(type, REQUEST, {});
      const columnNames = list.columns.map(({ name }) => name);
      const lastSeen = list.rows.map((row) => String(row.last_seen));

      expect(list.rows.length).toBeGreaterThan(0);
      expect(list.total).toBe(list.rows.length);
      expect(list.truncated).toBe(false);
      expect(lastSeen).toEqual([...lastSeen].sort().reverse());
      list.rows.forEach((row) => expect(Object.keys(row).sort()).toEqual([...columnNames].sort()));
    }
  );

  it('includes rows with null, multi-value and fallback-name host values', async () => {
    const { rows } = await createFixtureEntityInventoryApiClient().listEntities(
      'host',
      REQUEST,
      {}
    );

    expect(rows.some((row) => row['cloud.provider'] === null)).toBe(true);
    expect(rows.some((row) => Array.isArray(row['host.ip']))).toBe(true);
    expect(rows.some((row) => row['host.id'] === null && row['host.name'] !== null)).toBe(true);
  });

  it('includes a paused deployment', async () => {
    const { rows } = await createFixtureEntityInventoryApiClient().listEntities(
      'k8s.deployment',
      REQUEST,
      {}
    );

    expect(rows.some((row) => row.paused === true)).toBe(true);
  });

  it('returns fewer rows than the total for the truncated scenario', async () => {
    const list = await createFixtureEntityInventoryApiClient({
      scenario: 'truncated',
    }).listEntities('host', REQUEST, {});

    expect(list.truncated).toBe(true);
    expect(list.total).toBeGreaterThan(list.rows.length);
  });

  it('returns an unknown total for the countFailed scenario', async () => {
    const list = await createFixtureEntityInventoryApiClient({
      scenario: 'countFailed',
    }).listEntities('host', REQUEST, {});

    expect(list.truncated).toBe(true);
    expect(list.total).toBeNull();
    expect(list.rows.length).toBeGreaterThan(0);
  });

  it('returns source errors and unavailable columns for the withDiagnostics scenario', async () => {
    const list = await createFixtureEntityInventoryApiClient({
      scenario: 'withDiagnostics',
    }).listEntities('host', REQUEST, {});

    expect(list.errors.length).toBeGreaterThan(0);
    expect(list.unavailableColumns.length).toBeGreaterThan(0);
  });

  it('returns no rows for the empty scenario', async () => {
    const list = await createFixtureEntityInventoryApiClient({ scenario: 'empty' }).listEntities(
      'host',
      REQUEST,
      {}
    );

    expect(list.rows).toEqual([]);
    expect(list.total).toBe(0);
    expect(list.truncated).toBe(false);
  });

  it('returns no rows and several errors for the allSourcesFailed scenario', async () => {
    const list = await createFixtureEntityInventoryApiClient({
      scenario: 'allSourcesFailed',
    }).listEntities('host', REQUEST, {});

    expect(list.rows).toEqual([]);
    expect(list.total).toBeNull();
    expect(list.errors.length).toBeGreaterThan(1);
  });

  it('rejects with the given error', async () => {
    const failWith = new Error('Request failed');

    await expect(
      createFixtureEntityInventoryApiClient({ failWith }).listEntities('host', REQUEST, {})
    ).rejects.toBe(failWith);
  });

  it('rejects for an unknown type', async () => {
    await expect(
      createFixtureEntityInventoryApiClient().listEntities('service', REQUEST, {})
    ).rejects.toThrow('service');
  });

  it('rejects with an AbortError when the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createFixtureEntityInventoryApiClient().listEntities('host', REQUEST, {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      createFixtureEntityInventoryApiClient().getTypes({ signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
