/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Build a string that is exactly `n` characters long. */
const str = (n: number) => 'a'.repeat(n);
const arr = (n: number, s = 'x') => Array(n).fill(s);

import { QuerySchema, OverviewStatusSchema } from '../common';
import { getPingsRouteQuerySchema } from '../pings/get_pings';
import { getLatestTestRunRouteQuerySchema } from '../pings/get_latest_test_run';
import { DynamicSettingsSchema } from '../settings/dynamic_settings';
import { PrivateLocationSchema } from '../settings/private_locations/add_private_location';

describe('QuerySchema – common.ts', () => {
  it('accepts valid query and filter strings', () => {
    expect(QuerySchema.safeParse({ query: 'valid', filter: 'term: value' }).success).toBe(true);
  });

  it('rejects query and filter strings longer than the route limit', () => {
    expect(QuerySchema.safeParse({ query: str(4097) }).success).toBe(false);
    expect(QuerySchema.safeParse({ filter: str(4097) }).success).toBe(false);
  });

  it('rejects date ranges longer than the route limit', () => {
    expect(QuerySchema.safeParse({ dateRangeStart: str(4097) }).success).toBe(false);
  });

  it('rejects oversized search-after arrays and values', () => {
    expect(QuerySchema.safeParse({ searchAfter: arr(51) }).success).toBe(false);
    expect(QuerySchema.safeParse({ searchAfter: [str(4097)] }).success).toBe(false);
  });

  it('rejects an oversized logical-and filter', () => {
    expect(QuerySchema.safeParse({ useLogicalAndFor: str(4097) }).success).toBe(false);
  });

  it('accepts a valid payload', () => {
    expect(OverviewStatusSchema.safeParse({ query: 'test' }).success).toBe(true);
  });
});

describe('getPingsRouteQuerySchema – pings/get_pings.ts', () => {
  const validBase = { from: 'now-1h', to: 'now' };

  it('accepts a valid payload', () => {
    expect(getPingsRouteQuerySchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects oversized date ranges and optional query strings', () => {
    expect(getPingsRouteQuerySchema.safeParse({ ...validBase, from: str(4097) }).success).toBe(
      false
    );
    expect(getPingsRouteQuerySchema.safeParse({ ...validBase, monitorId: str(4097) }).success).toBe(
      false
    );
  });
});

describe('getLatestTestRunRouteQuerySchema – pings/get_latest_test_run.ts', () => {
  const validBase = { monitorId: 'mon-123' };

  it('accepts a valid payload', () => {
    expect(getLatestTestRunRouteQuerySchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects oversized IDs, labels, and date ranges', () => {
    expect(getLatestTestRunRouteQuerySchema.safeParse({ monitorId: str(1025) }).success).toBe(false);
    expect(
      getLatestTestRunRouteQuerySchema.safeParse({ ...validBase, locationLabel: str(4097) }).success
    ).toBe(false);
    expect(
      getLatestTestRunRouteQuerySchema.safeParse({ ...validBase, from: str(4097) }).success
    ).toBe(false);
  });
});

describe('DynamicSettingsSchema – settings/dynamic_settings.ts', () => {
  it('accepts valid defaultConnectors', () => {
    expect(DynamicSettingsSchema.safeParse({ defaultConnectors: ['connector-1'] }).success).toBe(
      true
    );
  });

  it('rejects defaultConnectors with more than 1000 entries or an oversized value', () => {
    expect(
      DynamicSettingsSchema.safeParse({ defaultConnectors: arr(1001, 'conn') }).success
    ).toBe(false);
    expect(
      DynamicSettingsSchema.safeParse({ defaultConnectors: [str(4097)] }).success
    ).toBe(false);
  });

  it('rejects oversized email lists and values', () => {
    expect(
      DynamicSettingsSchema.safeParse({ defaultEmail: { to: arr(1001, 'a@b.com') } }).success
    ).toBe(false);
    expect(
      DynamicSettingsSchema.safeParse({ defaultEmail: { to: [str(4097)] } }).success
    ).toBe(false);
  });
});

describe('PrivateLocationSchema – settings/private_locations/add_private_location.ts', () => {
  const validBase = { label: 'My Location', agentPolicyId: 'policy-1' };

  it('accepts valid values', () => {
    expect(PrivateLocationSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects oversized fields and arrays', () => {
    expect(PrivateLocationSchema.safeParse({ ...validBase, label: str(1025) }).success).toBe(
      false
    );
    expect(PrivateLocationSchema.safeParse({ ...validBase, tags: arr(101, 'tag') }).success).toBe(
      false
    );
    expect(
      PrivateLocationSchema.safeParse({ ...validBase, spaces: [str(257)] }).success
    ).toBe(false);
  });
});
