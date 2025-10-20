/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAssetMisconfigurationsQuery } from './get_asset_misconfigurations_query';

describe('getAssetMisconfigurationsQuery', () => {
  it('should create query with correct index pattern', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    expect(query.index).toBe('security_solution-*.misconfiguration_latest');
  });

  it('should filter for specific resource ID', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    const filters = Array.isArray(query.query?.bool?.filter)
      ? query.query.bool.filter
      : [query.query?.bool?.filter].filter(Boolean);
    const resourceFilter = filters.find((filter) => {
      const f = filter as Record<string, unknown>;
      return f?.term && (f.term as Record<string, unknown>)['resource.id'];
    });
    expect(resourceFilter).toEqual({
      term: {
        'resource.id': 'test-resource-id',
      },
    });
  });

  it('should filter for failed findings only', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    const filters = Array.isArray(query.query?.bool?.filter)
      ? query.query.bool.filter
      : [query.query?.bool?.filter].filter(Boolean);
    const evaluationFilter = filters.find((filter) => {
      const f = filter as Record<string, unknown>;
      return f?.term && (f.term as Record<string, unknown>)['result.evaluation'];
    });
    expect(evaluationFilter).toEqual({
      term: {
        'result.evaluation': 'failed',
      },
    });
  });

  it('should include timestamp filter with retention policy', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    const filters = Array.isArray(query.query?.bool?.filter)
      ? query.query.bool.filter
      : [query.query?.bool?.filter].filter(Boolean);
    const timestampFilter = filters.find((filter) => {
      const f = filter as Record<string, unknown>;
      return f?.range && (f.range as Record<string, unknown>)['@timestamp'];
    });
    expect(timestampFilter).toEqual({
      range: {
        '@timestamp': {
          gte: 'now-26h',
          lte: 'now',
        },
      },
    });
  });

  it('should include expected source fields', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    const expectedFields = [
      'rule.name',
      'rule.description',
      'rule.section',
      'rule.tags',
      'rule.benchmark.name',
      'rule.benchmark.id',
      'rule.benchmark.rule_number',
      'rule.benchmark.version',
      'rule.benchmark.posture_type',
      'resource.name',
      'resource.type',
      'resource.sub_type',
      'result.evaluation',
      'result.evidence',
      '@timestamp',
    ];
    expect(query._source).toEqual(expectedFields);
  });

  it('should use default size when not provided', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    expect(query.size).toBe(50);
  });

  it('should use provided size', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id', size: 100 });
    expect(query.size).toBe(100);
  });

  it('should sort by benchmark name, section, and timestamp', () => {
    const query = getAssetMisconfigurationsQuery({ resourceId: 'test-resource-id' });
    expect(query.sort).toEqual([
      { 'rule.benchmark.name': { order: 'asc' } },
      { 'rule.section': { order: 'asc' } },
      { '@timestamp': { order: 'desc' } },
    ]);
  });
});
