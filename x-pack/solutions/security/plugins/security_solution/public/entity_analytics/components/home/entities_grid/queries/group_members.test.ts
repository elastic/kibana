/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { QueryArgs, Row } from '../common';
import { groupEnricher } from './group_members';
import type { PageEnricher, RunContext } from './types';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'desc' },
  cursor: null,
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const HEAD_ROWS: Row[] = [{ 'entity.id': 'host:head' }, { 'entity.id': 'host:single' }];

const alias = (id: string, headId: string): Row => ({
  'entity.id': id,
  'entity.relationships.resolution.resolved_to': headId,
});

const createContext = (members: Row[]): RunContext & { runQuery: jest.Mock } => ({
  runQuery: jest.fn(async () => members),
  http: httpServiceMock.createSetupContract(),
});

type Fetch = PageEnricher['fetch'];

/** A base enricher that reads `values` per entity id, and the ids it was asked about. */
const createBaseEnricher = (
  values: Record<string, Row>
): PageEnricher & { fetch: jest.Mock<ReturnType<Fetch>, Parameters<Fetch>> } => ({
  fields: ['alert_count', 'last_seen_alert'],
  fetch: jest.fn<ReturnType<Fetch>, Parameters<Fetch>>(
    async (rows) =>
      new Map(rows.map((row) => [String(row['entity.id']), values[String(row['entity.id'])] ?? {}]))
  ),
});

const ROLL_UPS = { alert_count: 'sum', last_seen_alert: 'max' } as const;

describe('groupEnricher', () => {
  it("totals the counts and takes the latest time of a group's members", async () => {
    const base = createBaseEnricher({
      'host:head': { alert_count: 2, last_seen_alert: '2026-10-01T00:00:00.000Z' },
      'host:a1': { alert_count: 3, last_seen_alert: '2026-10-05T00:00:00.000Z' },
      'host:a2': { alert_count: 1, last_seen_alert: null },
      'host:single': { alert_count: 4, last_seen_alert: '2026-10-02T00:00:00.000Z' },
    });
    const ctx = createContext([alias('host:a1', 'host:head'), alias('host:a2', 'host:head')]);

    const fields = await groupEnricher(base, ROLL_UPS).fetch(HEAD_ROWS, ARGS, ctx);

    expect(Object.fromEntries(fields)).toEqual({
      'host:head': { alert_count: 6, last_seen_alert: '2026-10-05T00:00:00.000Z' },
      'host:single': { alert_count: 4, last_seen_alert: '2026-10-02T00:00:00.000Z' },
    });
  });

  it('reads the members of the heads in one query, and then the heads and their members', async () => {
    const base = createBaseEnricher({});
    const ctx = createContext([alias('host:a1', 'host:head')]);

    await groupEnricher(base, ROLL_UPS).fetch(HEAD_ROWS, ARGS, ctx);

    expect(ctx.runQuery).toHaveBeenCalledTimes(1);
    expect(ctx.runQuery).toHaveBeenCalledWith(
      expect.stringContaining('resolved_to IN ("host:head", "host:single")')
    );
    expect(base.fetch).toHaveBeenCalledTimes(1);
    expect(base.fetch.mock.calls[0][0].map((row) => row['entity.id'])).toEqual([
      'host:head',
      'host:single',
      'host:a1',
    ]);
  });

  it('has no value for a column that none of the members has one for', async () => {
    const base = createBaseEnricher({
      'host:head': { alert_count: null, last_seen_alert: null },
      'host:a1': { alert_count: null, last_seen_alert: null },
    });
    const ctx = createContext([alias('host:a1', 'host:head')]);

    const fields = await groupEnricher(base, ROLL_UPS).fetch([HEAD_ROWS[0]], ARGS, ctx);

    expect(fields.get('host:head')).toEqual({ alert_count: null, last_seen_alert: null });
  });

  it('reads long lists of entities in several reads', async () => {
    const base = createBaseEnricher({});
    const members = Array.from({ length: 450 }, (_, i) => alias(`host:a${i}`, 'host:head'));

    await groupEnricher(base, ROLL_UPS).fetch([HEAD_ROWS[0]], ARGS, createContext(members));

    expect(base.fetch).toHaveBeenCalledTimes(3);
  });

  it('fails when the groups of the page have too many members to read', async () => {
    const members = Array.from({ length: 10_000 }, (_, i) => alias(`host:a${i}`, 'host:head'));

    await expect(
      groupEnricher(createBaseEnricher({}), ROLL_UPS).fetch(
        [HEAD_ROWS[0]],
        ARGS,
        createContext(members)
      )
    ).rejects.toThrow('too many members');
  });

  it('reads individual rows as they are, without a query for members', async () => {
    const base = createBaseEnricher({ 'host:head': { alert_count: 2 } });
    const ctx = createContext([alias('host:a1', 'host:head')]);

    const fields = await groupEnricher(base, ROLL_UPS).fetch(
      [HEAD_ROWS[0]],
      { ...ARGS, rowsMode: 'individual' },
      ctx
    );

    expect(fields.get('host:head')).toEqual({ alert_count: 2 });
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });
});
