/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatsQuery } from './stats';

describe('StatsQuery', () => {
  const schema = {
    id: 'process.entity_id',
    parent: 'process.parent.entity_id',
    agentId: 'agent.id',
  };

  it('excludes cold and frozen tiers when shouldExcludeColdAndFrozenTiers is true', () => {
    const query = new StatsQuery({
      schema,
      indexPatterns: [''],
      timeRange: undefined,
      isInternalRequest: false,
      shouldExcludeColdAndFrozenTiers: true,
      agentId: undefined,
    });

    expect(query.getColdAndFrozenTierFilter()).toEqual([
      {
        bool: {
          must_not: {
            terms: {
              _tier: ['data_frozen', 'data_cold'],
            },
          },
        },
      },
    ]);
  });

  it('does not exclude cold and frozen tiers when shouldExcludeColdAndFrozenTiers is false or omitted', () => {
    const query = new StatsQuery({
      schema,
      indexPatterns: [''],
      timeRange: undefined,
      isInternalRequest: false,
      agentId: undefined,
    });

    expect(query.getColdAndFrozenTierFilter()).toEqual([]);
  });

  it('applies the provided timeRange as a range filter', () => {
    const timeRange = { from: 'now-1d', to: 'now' };
    const query = new StatsQuery({
      schema,
      indexPatterns: [''],
      timeRange,
      isInternalRequest: false,
      agentId: undefined,
    });

    expect(query.getRangeFilter()).toEqual([
      {
        range: {
          '@timestamp': {
            gte: 'now-1d',
            lte: 'now',
            format: 'strict_date_optional_time',
          },
        },
      },
    ]);
  });

  it('returns no range filter when timeRange is undefined', () => {
    const query = new StatsQuery({
      schema,
      indexPatterns: [''],
      timeRange: undefined,
      isInternalRequest: false,
      agentId: undefined,
    });

    expect(query.getRangeFilter()).toEqual([]);
  });
});
