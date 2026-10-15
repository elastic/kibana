/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNewEntityCountQuery } from './new_entity_query';
import { buildNewEntitySeriesQuery, newEntitySeriesColumn } from './new_entity_series_query';

const INDEX = '.entities-v1';

describe('buildNewEntitySeriesQuery', () => {
  it('names the column of dot k', () => {
    expect(newEntitySeriesColumn(4)).toBe('new_entities_4');
  });

  it('has one exact column per dot, with no COUNT_DISTINCT', () => {
    const query = buildNewEntitySeriesQuery(INDEX, '30d');
    for (let k = 0; k < 30; k++) {
      expect(query).toContain(`${newEntitySeriesColumn(k)} = COUNT(${newEntitySeriesColumn(k)})`);
    }
    expect(query).not.toContain(`${newEntitySeriesColumn(30)} =`);
    expect(query).not.toContain('COUNT_DISTINCT');
  });

  it('keeps the earliest bucket of each resolved entity inside the window of every dot', () => {
    const query = buildNewEntitySeriesQuery(INDEX, '24h');
    expect(query).toContain('new_entities_5 = MIN(bucket) WHERE bucket >= 5 AND bucket <= 28');
    expect(query).toContain('BY effective_id');
  });

  it('numbers entities by when they were first seen, reading back far enough', () => {
    const query = buildNewEntitySeriesQuery(INDEX, '7d');
    expect(query).toContain('entity.lifecycle.first_seen >= NOW() - 330h');
    expect(query).toContain(
      '| EVAL bucket = DATE_DIFF("hour", entity.lifecycle.first_seen, NOW()) / 6'
    );
  });

  it('starts with the same stages as the count, with the same risk score rule', () => {
    const filters = ['| WHERE entity.risk.calculated_level == "High"'];
    const series = buildNewEntitySeriesQuery(INDEX, '7d', filters);
    const count = buildNewEntityCountQuery(INDEX, '7d', filters);
    const tail = (query: string) =>
      query.slice(query.indexOf('| WHERE entity.risk'), query.indexOf('| EVAL effective_id'));
    expect(series).toContain('AND entity.risk.calculated_score > 0');
    expect(count).toContain('AND entity.risk.calculated_score > 0');
    expect(tail(series).split('AND entity.risk')[1]).toBe(tail(count).split('AND entity.risk')[1]);
    expect(series).toContain(filters[0]);
  });
});
