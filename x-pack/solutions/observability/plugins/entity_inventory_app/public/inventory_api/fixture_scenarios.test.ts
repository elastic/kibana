/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createScenarioEntityInventoryApiClient } from './fixture_scenarios';
import type { InventoryListRequest } from './types';

const REQUEST: InventoryListRequest = {
  from: '2026-10-30T10:00:00.000Z',
  to: '2026-10-30T10:15:00.000Z',
  limit: 10_000,
};

describe('createScenarioEntityInventoryApiClient', () => {
  it('returns truncated rows for the truncated scenario', async () => {
    const list = await createScenarioEntityInventoryApiClient({
      scenario: 'truncated',
    }).getEntities('host', REQUEST, {});

    expect(list.truncated).toBe(true);
    expect(list.rows.length).toBeGreaterThan(0);
  });

  it('returns source errors and unavailable columns for the withDiagnostics scenario', async () => {
    const list = await createScenarioEntityInventoryApiClient({
      scenario: 'withDiagnostics',
    }).getEntities('host', REQUEST, {});

    expect(list.errors.length).toBeGreaterThan(0);
    expect(list.unavailableColumns.length).toBeGreaterThan(0);
  });

  it('returns no rows for the empty scenario', async () => {
    const list = await createScenarioEntityInventoryApiClient({ scenario: 'empty' }).getEntities(
      'host',
      REQUEST,
      {}
    );

    expect(list.rows).toEqual([]);
    expect(list.truncated).toBe(false);
  });

  it('returns no rows and several errors for the allSourcesFailed scenario', async () => {
    const list = await createScenarioEntityInventoryApiClient({
      scenario: 'allSourcesFailed',
    }).getEntities('host', REQUEST, {});

    expect(list.rows).toEqual([]);
    expect(list.truncated).toBe(false);
    expect(list.errors.length).toBeGreaterThan(1);
  });

  it('rejects with the given error', async () => {
    const failWith = new Error('Request failed');

    await expect(
      createScenarioEntityInventoryApiClient({ failWith }).getEntities('host', REQUEST, {})
    ).rejects.toBe(failWith);
  });

  it('rejects for an unknown type in any scenario', async () => {
    await expect(
      createScenarioEntityInventoryApiClient({ scenario: 'truncated' }).getEntities(
        'service',
        REQUEST,
        {}
      )
    ).rejects.toThrow('service');
  });
});
