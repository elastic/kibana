/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { QueryArgs, Row } from '../common';
import type { PageEnricher, RunContext } from '../queries/types';
import { fetchEnrichedRows, getLoadedRows } from './use_entity_grid_data';

describe('getLoadedRows', () => {
  it('shows the rows of every batch in order', () => {
    expect(
      getLoadedRows([
        { rows: [{ 'entity.id': 'a' }, { 'entity.id': 'b' }] },
        { rows: [{ 'entity.id': 'c' }] },
      ])
    ).toEqual([{ 'entity.id': 'a' }, { 'entity.id': 'b' }, { 'entity.id': 'c' }]);
  });

  it("adds a batch's computed columns once its enrich data arrives", () => {
    expect(
      getLoadedRows([
        {
          rows: [{ 'entity.id': 'a' }, { 'entity.id': 'b' }],
          enriched: [
            { 'entity.id': 'a', alert_count: 3 },
            { 'entity.id': 'b', alert_count: 0 },
          ],
        },
        { rows: [{ 'entity.id': 'c' }] },
      ])
    ).toEqual([
      { 'entity.id': 'a', alert_count: 3 },
      { 'entity.id': 'b', alert_count: 0 },
      { 'entity.id': 'c' },
    ]);
  });

  it('keeps the fresh entity fields of a refetched batch over its earlier enrich data', () => {
    expect(
      getLoadedRows([
        {
          rows: [{ 'entity.id': 'a', 'entity.risk.calculated_score_norm': 80 }],
          enriched: [{ 'entity.id': 'a', 'entity.risk.calculated_score_norm': 70, alert_count: 3 }],
        },
      ])
    ).toEqual([{ 'entity.id': 'a', 'entity.risk.calculated_score_norm': 80, alert_count: 3 }]);
  });
});

describe('fetchEnrichedRows', () => {
  const ARGS = {} as QueryArgs;
  const ROWS: readonly Row[] = [{ 'entity.id': 'a' }, { 'entity.id': 'b' }];
  const ctx: RunContext = { runQuery: jest.fn(), http: httpServiceMock.createSetupContract() };

  /** An enricher of `field` that resolves to `values` per entity id, or rejects with `error`. */
  const enricherOf = (
    field: string,
    values: Record<string, unknown>,
    error?: Error
  ): PageEnricher & { fetch: jest.Mock } => ({
    fields: [field],
    fetch: jest.fn(async () => {
      if (error) throw error;
      return new Map(Object.entries(values).map(([id, value]) => [id, { [field]: value }]));
    }),
  });

  it('adds the fields of every enricher to copies of the rows', async () => {
    const { rows, errors } = await fetchEnrichedRows(ROWS, ARGS, ctx, [
      enricherOf('alert_count', { a: 3, b: 0 }),
      enricherOf('anomaly_count', { a: 1 }),
    ]);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { 'entity.id': 'a', alert_count: 3, anomaly_count: 1 },
      { 'entity.id': 'b', alert_count: 0 },
    ]);
    expect(ROWS[0]).not.toHaveProperty('alert_count');
  });

  it('skips an enricher whose fields the rows already have', async () => {
    const enricher = enricherOf('alert_count', {});

    await fetchEnrichedRows(
      ROWS.map((row) => ({ ...row, alert_count: 0 })),
      ARGS,
      ctx,
      [enricher]
    );

    expect(enricher.fetch).not.toHaveBeenCalled();
  });

  it('leaves the fields of a failed enricher unset and returns its error', async () => {
    const error = new Error('boom');

    const { rows, errors } = await fetchEnrichedRows(ROWS, ARGS, ctx, [
      enricherOf('alert_count', {}, error),
      enricherOf('anomaly_count', { a: 2 }),
    ]);

    expect(errors).toEqual([error]);
    expect(rows[0]).toEqual({ 'entity.id': 'a', anomaly_count: 2 });
  });

  it('rejects when the enrichers are aborted', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });

    await expect(
      fetchEnrichedRows(ROWS, ARGS, ctx, [enricherOf('alert_count', {}, abort)])
    ).rejects.toBe(abort);
  });
});
