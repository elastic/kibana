/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLoadedRows } from './use_entity_grid_data';

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
