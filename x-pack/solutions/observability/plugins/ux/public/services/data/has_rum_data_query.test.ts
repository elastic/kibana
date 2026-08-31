/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasRumDataQuery,
  hasRumDataWithServiceNameQuery,
  HAS_RUM_DATA_TIERS,
} from './has_rum_data_query';

const TIER_CLAUSE = { terms: { _tier: HAS_RUM_DATA_TIERS } };

describe('hasRumDataQuery', () => {
  it('builds an unrestricted existence query', () => {
    expect(hasRumDataQuery()).toMatchSnapshot();
  });

  it('builds a tier restricted existence query', () => {
    expect(hasRumDataQuery({ dataTiers: HAS_RUM_DATA_TIERS })).toMatchSnapshot();
  });

  it('omits aggregations and stops after the first hit', () => {
    const query = hasRumDataQuery({ dataTiers: HAS_RUM_DATA_TIERS });

    expect(query).not.toHaveProperty('aggs');
    expect(query).toMatchObject({ terminate_after: 1, track_total_hits: 1 });
  });

  it('places the tier filter at the top level, where can_match can read it', () => {
    const { filter } = hasRumDataQuery({ dataTiers: HAS_RUM_DATA_TIERS }).query.bool;

    expect(filter).toContainEqual(TIER_CLAUSE);
  });

  it('omits the tier filter when no tiers are given', () => {
    const { filter } = hasRumDataQuery().query.bool;

    expect(filter).not.toContainEqual(TIER_CLAUSE);
    expect(filter).toHaveLength(2);
  });
});

describe('hasRumDataWithServiceNameQuery', () => {
  it('builds an unrestricted query with a services aggregation', () => {
    expect(hasRumDataWithServiceNameQuery({ start: 0, end: 50000 })).toMatchSnapshot();
  });

  it('builds a tier restricted query with a services aggregation', () => {
    expect(
      hasRumDataWithServiceNameQuery({
        start: 0,
        end: 50000,
        dataTiers: HAS_RUM_DATA_TIERS,
      })
    ).toMatchSnapshot();
  });

  it('keeps the tier filter out of the aggregation', () => {
    const query = hasRumDataWithServiceNameQuery({
      start: 0,
      end: 50000,
      dataTiers: HAS_RUM_DATA_TIERS,
    });

    expect(query.query.bool.filter).toContainEqual(TIER_CLAUSE);
    expect(query).toHaveProperty('aggs');
    expect(query).not.toHaveProperty('terminate_after');
    expect(JSON.stringify(query.aggs)).not.toContain('_tier');
  });
});
