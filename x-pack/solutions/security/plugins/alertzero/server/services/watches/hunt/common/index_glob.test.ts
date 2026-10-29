/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clusterCovers, compileGlob, exclusionReachesCluster, globsOverlap } from './index_glob';

describe('compileGlob', () => {
  it('treats only `*` as a wildcard', () => {
    expect(compileGlob('logs-aws.*').test('logs-aws.cloudtrail-default')).toBe(true);
    expect(compileGlob('logs-aws.*').test('logs-awsXcloudtrail')).toBe(false);
    expect(compileGlob('logs-aws').test('logs-aws-default')).toBe(false);
  });
});

describe('globsOverlap', () => {
  it('tests a concrete candidate exactly and a wildcard one by literal prefix', () => {
    expect(globsOverlap('logs-elastic_agent-default', 'logs-elastic_agent*')).toBe(true);
    expect(globsOverlap('logs-okta-default', 'logs-elastic_agent*')).toBe(false);
    expect(globsOverlap('logs-e*', 'logs-elastic_agent*')).toBe(true);
    expect(globsOverlap('logs-o*', 'logs-elastic_agent*')).toBe(false);
  });
});

describe('clusterCovers', () => {
  it('keeps local and remote apart', () => {
    expect(clusterCovers(undefined, undefined)).toBe(true);
    expect(clusterCovers(undefined, 'remote')).toBe(false);
    expect(clusterCovers('*', undefined)).toBe(false);
  });

  it('globs a concrete candidate cluster against the entry alias', () => {
    expect(clusterCovers('*', 'infosec_zocalo')).toBe(true);
    expect(clusterCovers('infosec_*', 'infosec_zocalo')).toBe(true);
    expect(clusterCovers('infosec_*', 'other')).toBe(false);
  });

  it('only covers a wildcard candidate cluster with that exact string', () => {
    expect(clusterCovers('*', '*')).toBe(true);
    expect(clusterCovers('*', 'infosec_*')).toBe(false);
    expect(clusterCovers('infosec_zocalo', '*')).toBe(false);
  });
});

describe('exclusionReachesCluster', () => {
  it('reaches any cluster its glob could share, wildcard candidates included', () => {
    expect(exclusionReachesCluster(undefined, undefined)).toBe(true);
    expect(exclusionReachesCluster(undefined, 'remote')).toBe(false);
    expect(exclusionReachesCluster('*', 'remote')).toBe(true);
    expect(exclusionReachesCluster('remote', '*')).toBe(true);
    expect(exclusionReachesCluster('remote', 'other')).toBe(false);
  });
});
