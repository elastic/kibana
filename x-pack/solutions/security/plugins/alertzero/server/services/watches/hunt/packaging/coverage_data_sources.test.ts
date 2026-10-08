/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  eventDataSources,
  fromDataSources,
  reportIntentDataSources,
  stripEsqlComments,
  vendorFallbackDataSources,
} from './coverage_data_sources';
import type { CoverageBehavior } from './types';

const ENDPOINT_PADDING = [
  'logs-endpoint.alerts.00e5ea78.2026.10.08*',
  'logs-endpoint.alerts.07d8f63a.2026.10.08*',
  'logs-endpoint.events.00e5ea78.2026.10.08*',
  'logs-endpoint.events.e8c68216.2026.10.08*',
];

const behavior = (validatedEsql: string): CoverageBehavior => ({
  techniqueId: 'T1110.003',
  confidence: 0.92,
  validatedEsql,
  rowCount: 0,
  hit: false,
});

describe('eventDataSources', () => {
  it('returns the deduped dataset patterns of source event indices', () => {
    expect(
      eventDataSources([
        '.ds-logs-aws.cloudtrail-default-2026.10.08-000001',
        '.ds-logs-aws.cloudtrail-default-2026.10.07-000001',
      ])
    ).toEqual(['logs-aws.cloudtrail-*']);
  });

  it('drops plain pack indices and alert indices', () => {
    expect(
      eventDataSources([
        'logs-endpoint.events.00e5ea78.2026.10.08',
        '.alerts-security.alerts-default',
        '.ds-logs-endpoint.alerts-default-2026.10.08-000001',
      ])
    ).toEqual([]);
  });
});

describe('stripEsqlComments', () => {
  it('removes comment lines and keeps the query', () => {
    expect(stripEsqlComments('// Generated from hunt\nFROM logs-aws.cloudtrail-*\n| LIMIT 5')).toBe(
      'FROM logs-aws.cloudtrail-*\n| LIMIT 5'
    );
  });
});

describe('fromDataSources', () => {
  it.each([
    ['a plain FROM', 'FROM logs-aws.cloudtrail-* | LIMIT 5', ['logs-aws.cloudtrail-*']],
    [
      'a header that says "from"',
      '// Generated from hunt.hunt_behavior\nFROM logs-aws.cloudtrail-*\n| LIMIT 5',
      ['logs-aws.cloudtrail-*'],
    ],
    [
      'several sources with METADATA',
      'FROM logs-aws.cloudtrail-*, logs-okta.system-* METADATA _id, _index\n| LIMIT 5',
      ['logs-aws.cloudtrail-*', 'logs-okta.system-*'],
    ],
    ['no FROM', 'ROW a = 1', []],
  ])('returns the dataset patterns for %s', (_label, esql, expected) => {
    expect(fromDataSources(esql)).toEqual(expected);
  });
});

describe('reportIntentDataSources', () => {
  const defaultArgs = {
    tier2Targets: ['logs-aws.cloudtrail-*', ...ENDPOINT_PADDING],
    actionableIndices: ENDPOINT_PADDING,
    behaviors: [] as CoverageBehavior[],
  };

  it('returns the report stream without the process padding', () => {
    expect(reportIntentDataSources(defaultArgs)).toEqual(['logs-aws.cloudtrail-*']);
  });

  it('drops a vendor wildcard the allowlist was bounded to when an actionable index shares its vendor', () => {
    expect(
      reportIntentDataSources({
        ...defaultArgs,
        tier2Targets: ['logs-aws.*', 'logs-endpoint.*'],
      })
    ).toEqual([]);
  });

  it('falls back to the executed behavior FROM when no target survives', () => {
    expect(
      reportIntentDataSources({
        ...defaultArgs,
        tier2Targets: ENDPOINT_PADDING,
        behaviors: [behavior('FROM logs-aws.cloudtrail-* | LIMIT 5')],
      })
    ).toEqual(['logs-aws.cloudtrail-*']);
  });

  it('returns nothing when there are no targets and no behaviors', () => {
    expect(
      reportIntentDataSources({ tier2Targets: [], actionableIndices: [], behaviors: [] })
    ).toEqual([]);
  });
});

describe('vendorFallbackDataSources', () => {
  it.each([
    ['an aliased vendor', { vendor: 'Amazon' }, ['logs-aws.*']],
    ['a plain vendor', { vendor: 'Okta' }, ['logs-okta.*']],
    [
      'vendor and product',
      { vendor: 'Fortinet', product: 'Fortigate' },
      ['logs-fortinetfortigate.*', 'logs-fortinet.*'].sort(),
    ],
    ['nothing', {}, []],
  ])('returns the soft hint for %s', (_label, args, expected) => {
    expect(vendorFallbackDataSources(args)).toEqual(expected);
  });
});
