/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies that every `schema.string()` call patched with a `maxLength` constraint
 * (and every `schema.arrayOf` patched with `maxSize`) actually enforces those limits.
 *
 * Strategy
 * --------
 * `@kbn/config-schema`'s `schema.object().validate()` throws when a value fails
 * validation, so we can use the pattern:
 *
 *   expect(() => SomeSchema.validate({ field: 'x'.repeat(N + 1) })).toThrow();
 *   expect(() => SomeSchema.validate({ field: 'valid' })).not.toThrow();
 *
 * All schemas are imported from their real source modules so that future regressions
 * (e.g. removing a maxLength) are caught automatically.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a string that is exactly `n` characters long. */
const str = (n: number) => 'a'.repeat(n);

/** Build an array of `n` identical items. */
const arr = (n: number, s = 'x') => Array(n).fill(s);

// ── imports from fixed source files ──────────────────────────────────────────

import { QuerySchema, OverviewStatusSchema } from '../common';
import { getPingsRouteQuerySchema } from '../pings/get_pings';
import { getLatestTestRunRouteQuerySchema } from '../pings/get_latest_test_run';
import { journeyParamsSchema } from '../pings/journeys';
import { monitorSummaryStatsQuerySchema } from '../monitor_cruds/get_monitor_summary_stats';
import { overviewTrendsItemSchema } from '../overview_trends/overview_trends';
import { DynamicSettingsSchema } from '../settings/dynamic_settings';
import { PrivateLocationSchema } from '../settings/private_locations/add_private_location';
import { deleteParamsBulkBodySchema } from '../settings/params/delete_params_bulk';

// ─── QuerySchema (common.ts) ──────────────────────────────────────────────────

describe('QuerySchema – common.ts', () => {
  it('accepts valid query and filter strings', () => {
    expect(() =>
      QuerySchema.validate({ query: 'valid', filter: 'term: value' })
    ).not.toThrow();
  });

  it('rejects query longer than 1024 chars', () => {
    expect(() => QuerySchema.validate({ query: str(1025) })).toThrow();
  });

  it('rejects filter longer than 1024 chars', () => {
    expect(() => QuerySchema.validate({ filter: str(1025) })).toThrow();
  });

  it('accepts dateRangeStart within 256 chars', () => {
    expect(() => QuerySchema.validate({ dateRangeStart: 'now-15m' })).not.toThrow();
  });

  it('rejects dateRangeStart longer than 256 chars', () => {
    expect(() => QuerySchema.validate({ dateRangeStart: str(257) })).toThrow();
  });

  it('accepts searchAfter array within 100 elements', () => {
    expect(() => QuerySchema.validate({ searchAfter: arr(100) })).not.toThrow();
  });

  it('rejects searchAfter array exceeding 100 elements', () => {
    expect(() => QuerySchema.validate({ searchAfter: arr(101) })).toThrow();
  });

  it('rejects a single searchAfter item longer than 1024 chars', () => {
    expect(() => QuerySchema.validate({ searchAfter: [str(1025)] })).toThrow();
  });

  it('accepts a valid string value for useLogicalAndFor', () => {
    expect(() => QuerySchema.validate({ useLogicalAndFor: 'tags' })).not.toThrow();
  });

  it('rejects useLogicalAndFor string longer than 1024 chars', () => {
    expect(() => QuerySchema.validate({ useLogicalAndFor: str(1025) })).toThrow();
  });
});

// ── OverviewStatusSchema (common.ts) ─────────────────────────────────────────

describe('OverviewStatusSchema – common.ts', () => {
  it('accepts a valid payload', () => {
    expect(() => OverviewStatusSchema.validate({ query: 'test' })).not.toThrow();
  });

  it('rejects query longer than 1024 chars', () => {
    expect(() => OverviewStatusSchema.validate({ query: str(1025) })).toThrow();
  });
});

// ── getPingsRouteQuerySchema (pings/get_pings.ts) ────────────────────────────

describe('getPingsRouteQuerySchema – pings/get_pings.ts', () => {
  const validBase = { from: 'now-1h', to: 'now' };

  it('accepts a valid payload', () => {
    expect(() => getPingsRouteQuerySchema.validate(validBase)).not.toThrow();
  });

  it('rejects `from` longer than 256 chars', () => {
    expect(() => getPingsRouteQuerySchema.validate({ ...validBase, from: str(257) })).toThrow();
  });

  it('rejects `to` longer than 256 chars', () => {
    expect(() => getPingsRouteQuerySchema.validate({ ...validBase, to: str(257) })).toThrow();
  });

  it('rejects monitorId longer than 1024 chars', () => {
    expect(() =>
      getPingsRouteQuerySchema.validate({ ...validBase, monitorId: str(1025) })
    ).toThrow();
  });

  it('rejects sort longer than 50 chars', () => {
    expect(() =>
      getPingsRouteQuerySchema.validate({ ...validBase, sort: str(51) })
    ).toThrow();
  });

  it('rejects status longer than 50 chars', () => {
    expect(() =>
      getPingsRouteQuerySchema.validate({ ...validBase, status: str(51) })
    ).toThrow();
  });
});

// ── getLatestTestRunRouteQuerySchema (pings/get_latest_test_run.ts) ──────────

describe('getLatestTestRunRouteQuerySchema – pings/get_latest_test_run.ts', () => {
  const validBase = { monitorId: 'mon-123' };

  it('accepts a valid payload', () => {
    expect(() => getLatestTestRunRouteQuerySchema.validate(validBase)).not.toThrow();
  });

  it('rejects monitorId longer than 1024 chars', () => {
    expect(() =>
      getLatestTestRunRouteQuerySchema.validate({ monitorId: str(1025) })
    ).toThrow();
  });

  it('rejects locationLabel longer than 256 chars', () => {
    expect(() =>
      getLatestTestRunRouteQuerySchema.validate({ ...validBase, locationLabel: str(257) })
    ).toThrow();
  });

  it('rejects from longer than 256 chars', () => {
    expect(() =>
      getLatestTestRunRouteQuerySchema.validate({ ...validBase, from: str(257) })
    ).toThrow();
  });
});

// ── journeyParamsSchema (pings/journeys.ts) ───────────────────────────────────

describe('journeyParamsSchema – pings/journeys.ts', () => {
  it('accepts a valid checkGroup', () => {
    expect(() => journeyParamsSchema.validate({ checkGroup: 'abc-123' })).not.toThrow();
  });

  it('rejects a checkGroup longer than 1024 chars', () => {
    expect(() => journeyParamsSchema.validate({ checkGroup: str(1025) })).toThrow();
  });
});

// ── monitorSummaryStatsQuerySchema (monitor_cruds/get_monitor_summary_stats.ts) ─

describe('monitorSummaryStatsQuerySchema – monitor_cruds/get_monitor_summary_stats.ts', () => {
  const validBase = { monitorId: 'mon-1', locationLabel: 'us-east' };

  it('accepts valid values', () => {
    expect(() => monitorSummaryStatsQuerySchema.validate(validBase)).not.toThrow();
  });

  it('rejects monitorId longer than 1024 chars', () => {
    expect(() =>
      monitorSummaryStatsQuerySchema.validate({ ...validBase, monitorId: str(1025) })
    ).toThrow();
  });

  it('rejects locationLabel longer than 256 chars', () => {
    expect(() =>
      monitorSummaryStatsQuerySchema.validate({ ...validBase, locationLabel: str(257) })
    ).toThrow();
  });
});

// ── DynamicSettingsSchema (settings/dynamic_settings.ts) ─────────────────────

describe('DynamicSettingsSchema – settings/dynamic_settings.ts', () => {
  it('accepts valid defaultConnectors', () => {
    expect(() =>
      DynamicSettingsSchema.validate({ defaultConnectors: ['connector-1'] })
    ).not.toThrow();
  });

  it('rejects defaultConnectors with more than 100 entries', () => {
    expect(() =>
      DynamicSettingsSchema.validate({ defaultConnectors: arr(101, 'conn') })
    ).toThrow();
  });

  it('rejects a connector ID longer than 256 chars', () => {
    expect(() =>
      DynamicSettingsSchema.validate({ defaultConnectors: [str(257)] })
    ).toThrow();
  });

  it('accepts a valid defaultEmail', () => {
    expect(() =>
      DynamicSettingsSchema.validate({
        defaultEmail: { to: ['user@example.com'], cc: [], bcc: [] },
      })
    ).not.toThrow();
  });

  it('rejects defaultEmail.to with more than 100 entries', () => {
    expect(() =>
      DynamicSettingsSchema.validate({ defaultEmail: { to: arr(101, 'a@b.com') } })
    ).toThrow();
  });

  it('rejects an email address longer than 256 chars', () => {
    expect(() =>
      DynamicSettingsSchema.validate({ defaultEmail: { to: [str(257)] } })
    ).toThrow();
  });
});

// ── PrivateLocationSchema (settings/private_locations/add_private_location.ts) ─

describe('PrivateLocationSchema – settings/private_locations/add_private_location.ts', () => {
  const validBase = { label: 'My Location', agentPolicyId: 'policy-1' };

  it('accepts valid values', () => {
    expect(() => PrivateLocationSchema.validate(validBase)).not.toThrow();
  });

  it('rejects label longer than 256 chars', () => {
    expect(() =>
      PrivateLocationSchema.validate({ ...validBase, label: str(257) })
    ).toThrow();
  });

  it('rejects agentPolicyId longer than 256 chars', () => {
    expect(() =>
      PrivateLocationSchema.validate({ ...validBase, agentPolicyId: str(257) })
    ).toThrow();
  });

  it('rejects tags array with more than 100 entries', () => {
    expect(() =>
      PrivateLocationSchema.validate({ ...validBase, tags: arr(101, 'tag') })
    ).toThrow();
  });

  it('rejects spaces array with more than 100 entries', () => {
    expect(() =>
      PrivateLocationSchema.validate({ ...validBase, spaces: arr(101, 'space') })
    ).toThrow();
  });
});

// ── deleteParamsBulkBodySchema (settings/params/delete_params_bulk.ts) ────────

describe('deleteParamsBulkBodySchema – settings/params/delete_params_bulk.ts', () => {
  it('accepts valid ids', () => {
    expect(() => deleteParamsBulkBodySchema.validate({ ids: ['id-1', 'id-2'] })).not.toThrow();
  });

  it('rejects ids array with more than 1000 entries', () => {
    expect(() => deleteParamsBulkBodySchema.validate({ ids: arr(1001, 'id') })).toThrow();
  });

  it('rejects an id longer than 1024 chars', () => {
    expect(() => deleteParamsBulkBodySchema.validate({ ids: [str(1025)] })).toThrow();
  });
});

// ── overviewTrendsItemSchema (overview_trends/overview_trends.ts) ─────────────

describe('overviewTrendsItemSchema – overview_trends/overview_trends.ts', () => {
  const validBase = { configId: 'cfg-1', locationIds: ['loc-1'], schedule: '10' };

  it('accepts valid values', () => {
    expect(() => overviewTrendsItemSchema.validate(validBase)).not.toThrow();
  });

  it('rejects configId longer than 1024 chars', () => {
    expect(() =>
      overviewTrendsItemSchema.validate({ ...validBase, configId: str(1025) })
    ).toThrow();
  });

  it('rejects locationIds array with more than 100 entries', () => {
    expect(() =>
      overviewTrendsItemSchema.validate({ ...validBase, locationIds: arr(101, 'loc') })
    ).toThrow();
  });

  it('rejects a locationId string longer than 256 chars', () => {
    expect(() =>
      overviewTrendsItemSchema.validate({ ...validBase, locationIds: [str(257)] })
    ).toThrow();
  });

  it('rejects schedule longer than 256 chars', () => {
    expect(() =>
      overviewTrendsItemSchema.validate({ ...validBase, schedule: str(257) })
    ).toThrow();
  });
});
