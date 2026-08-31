/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasRumDataQuery, HAS_RUM_DATA_TIERS } from './has_rum_data_query';

const TIER_CLAUSE = { terms: { _tier: HAS_RUM_DATA_TIERS } };

describe('hasRumDataQuery', () => {
  it('builds an unrestricted query', () => {
    expect(hasRumDataQuery({ start: 0, end: 50000 })).toMatchSnapshot();
  });

  it('builds a tier restricted query', () => {
    expect(
      hasRumDataQuery({ start: 0, end: 50000, dataTiers: HAS_RUM_DATA_TIERS })
    ).toMatchSnapshot();
  });

  it('places the tier filter at the top level, where can_match can read it', () => {
    const query = hasRumDataQuery({ start: 0, end: 50000, dataTiers: HAS_RUM_DATA_TIERS });

    expect(query.query.bool.filter).toContainEqual(TIER_CLAUSE);
    expect(JSON.stringify(query.aggs)).not.toContain('_tier');
  });

  it('omits the tier filter when no tiers are given', () => {
    const { filter } = hasRumDataQuery({ start: 0, end: 50000 }).query.bool;

    expect(filter).not.toContainEqual(TIER_CLAUSE);
    expect(filter).toHaveLength(2);
  });
});
