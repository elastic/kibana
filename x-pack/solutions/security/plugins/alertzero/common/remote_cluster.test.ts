/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isIndexExclusion,
  joinRemoteCluster,
  mapIndexPart,
  parseIndexScopeEntry,
  splitRemoteCluster,
  stripBackingPrefix,
} from './remote_cluster';

describe('splitRemoteCluster', () => {
  it.each([
    ['a local name', 'logs-aws.cloudtrail-default', { index: 'logs-aws.cloudtrail-default' }],
    [
      'a remote backing index',
      'infosec_zocalo:.ds-logs-aws.cloudtrail-default-2026.10.26-000001',
      { cluster: 'infosec_zocalo', index: '.ds-logs-aws.cloudtrail-default-2026.10.26-000001' },
    ],
    [
      'a dashed cluster alias',
      'infosec-redsector:logs-endpoint.events.*',
      { cluster: 'infosec-redsector', index: 'logs-endpoint.events.*' },
    ],
    ['a wildcard cluster alias', '*:logs-*', { cluster: '*', index: 'logs-*' }],
    ['a local selector', 'logs-*::failures', { index: 'logs-*::failures' }],
    ['a remote selector', 'remote:logs-*::data', { cluster: 'remote', index: 'logs-*::data' }],
    ['a leading colon', ':logs-*', { index: ':logs-*' }],
  ])('splits %s', (_label, name, expected) => {
    expect(splitRemoteCluster(name)).toEqual(expected);
  });
});

describe('joinRemoteCluster', () => {
  it('prefixes a remote index and leaves a local one bare', () => {
    expect(joinRemoteCluster({ cluster: 'remote', index: 'logs-a-*' })).toBe('remote:logs-a-*');
    expect(joinRemoteCluster({ index: 'logs-a-*' })).toBe('logs-a-*');
  });
});

describe('mapIndexPart', () => {
  it('rewrites only the index part', () => {
    const upper = (index: string) => index.toUpperCase();
    expect(mapIndexPart('remote:logs-a', upper)).toBe('remote:LOGS-A');
    expect(mapIndexPart('logs-a', upper)).toBe('LOGS-A');
  });
});

describe('stripBackingPrefix', () => {
  it.each([
    ['.ds-logs-a-default-2026.10.26-000001', 'logs-a-default-2026.10.26-000001'],
    ['remote:.ds-logs-a-default-2026.10.26-000001', 'remote:logs-a-default-2026.10.26-000001'],
    ['logs-a-default', 'logs-a-default'],
    ['remote:logs-a-default', 'remote:logs-a-default'],
    ['.alerts-security.alerts-default', '.alerts-security.alerts-default'],
  ])('strips %s to %s', (name, expected) => {
    expect(stripBackingPrefix(name)).toBe(expected);
  });
});

describe('parseIndexScopeEntry', () => {
  it.each([
    ['a local pattern', 'logs-*', { exclude: false, index: 'logs-*' }],
    ['a remote pattern', 'remote:logs-*', { exclude: false, cluster: 'remote', index: 'logs-*' }],
    ['a local exclusion', '-logs-elastic_agent*', { exclude: true, index: 'logs-elastic_agent*' }],
    [
      'a remote index exclusion',
      'remote:-logs-elastic_agent*',
      { exclude: true, cluster: 'remote', index: 'logs-elastic_agent*' },
    ],
    [
      'the 9.5+ leading-minus remote index exclusion',
      '-remote:logs-elastic_agent*',
      { exclude: true, cluster: 'remote', index: 'logs-elastic_agent*' },
    ],
    ['a whole-cluster exclusion', '-remote:*', { exclude: true, cluster: 'remote', index: '*' }],
  ])('reads %s', (_label, entry, expected) => {
    expect(parseIndexScopeEntry(entry)).toEqual(expected);
    expect(isIndexExclusion(entry)).toBe(expected.exclude);
  });
});
