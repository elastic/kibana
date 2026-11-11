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
      const list = await createFixtureEntityInventoryApiClient().getEntities(type, REQUEST, {});
      const columnNames = list.columns.map(({ name }) => name);
      const lastSeen = list.rows.map((row) => String(row.last_seen));

      expect(list.rows.length).toBeGreaterThan(0);
      expect(list.truncated).toBe(false);
      expect(lastSeen).toEqual([...lastSeen].sort().reverse());
      list.rows.forEach((row) => expect(Object.keys(row).sort()).toEqual([...columnNames].sort()));
    }
  );

  it('includes host rows with null, multi-value and no host.id values', async () => {
    const { rows } = await createFixtureEntityInventoryApiClient().getEntities('host', REQUEST, {});

    expect(rows.some((row) => row['cloud.provider'] === null)).toBe(true);
    expect(rows.some((row) => Array.isArray(row['host.ip']))).toBe(true);
    expect(rows.some((row) => row['host.id'] === null && row['host.name'] !== null)).toBe(true);
  });

  it('reports deployments from Elastic Agent, OpenTelemetry, or both', async () => {
    const { rows } = await createFixtureEntityInventoryApiClient().getEntities(
      'k8s.deployment',
      REQUEST,
      {}
    );
    const reportedBy = (row: (typeof rows)[number]) => ({
      otel: row['k8s.deployment.uid'] !== null,
      elasticAgent: row['k8s.deployment.paused'] !== null,
    });

    expect(rows.some((row) => reportedBy(row).otel && !reportedBy(row).elasticAgent)).toBe(true);
    expect(rows.some((row) => !reportedBy(row).otel && reportedBy(row).elasticAgent)).toBe(true);
    expect(rows.some((row) => reportedBy(row).otel && reportedBy(row).elasticAgent)).toBe(true);
  });

  it('includes a paused deployment', async () => {
    const { rows } = await createFixtureEntityInventoryApiClient().getEntities(
      'k8s.deployment',
      REQUEST,
      {}
    );

    expect(rows.some((row) => row['k8s.deployment.paused'] === true)).toBe(true);
  });

  it('rejects for an unknown type', async () => {
    await expect(
      createFixtureEntityInventoryApiClient().getEntities('service', REQUEST, {})
    ).rejects.toThrow('service');
  });

  it('rejects with an AbortError when the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createFixtureEntityInventoryApiClient().getEntities('host', REQUEST, {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      createFixtureEntityInventoryApiClient().getTypes({ signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
