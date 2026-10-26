/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAssetMisconfigurationsQuery } from './get_asset_misconfigurations_query';

const mockAnonymizationFields = [
  { id: '1', field: 'resource.id', allowed: true, anonymized: false },
  { id: '2', field: 'resource.name', allowed: true, anonymized: true },
  { id: '3', field: 'rule.name', allowed: true, anonymized: false },
  { id: '4', field: '@timestamp', allowed: true, anonymized: false },
];

describe('getAssetMisconfigurationsQuery', () => {
  it('should create query with correct index pattern', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
    expect(query.index).toBe('security_solution-*.misconfiguration_latest');
  });

  it('should filter for specific resource ID', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
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
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
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
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
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

  it('should include expected fields from anonymization', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
    const expectedFields = [
      { field: 'resource.name', include_unmapped: true },
      { field: 'rule.name', include_unmapped: true },
      { field: '@timestamp', include_unmapped: true },
    ];
    expect(query.fields).toEqual(expectedFields);
  });

  it('should use default size', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
    expect(query.size).toBe(50);
  });

  it('should sort by timestamp', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });
    expect(query.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
  });

  it('should only include fields that are in MISCONFIGURATION_FIELDS list', () => {
    const fieldsWithNonMisconfigurationField = [
      { id: '1', field: 'resource.name', allowed: true, anonymized: false },
      { id: '2', field: 'some.random.field', allowed: true, anonymized: false },
      { id: '3', field: 'rule.name', allowed: true, anonymized: false },
    ];

    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: fieldsWithNonMisconfigurationField,
      resourceId: 'test-resource-id',
    });

    expect(query.fields).toEqual([
      { field: 'resource.name', include_unmapped: true },
      { field: 'rule.name', include_unmapped: true },
    ]);
  });

  it('should only include allowed fields from anonymization config', () => {
    const fieldsWithDenied = [
      { id: '1', field: 'resource.name', allowed: true, anonymized: false },
      { id: '2', field: 'rule.name', allowed: false, anonymized: false }, // Not allowed
      { id: '3', field: '@timestamp', allowed: true, anonymized: false },
    ];

    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: fieldsWithDenied,
      resourceId: 'test-resource-id',
    });

    expect(query.fields).toEqual([
      { field: 'resource.name', include_unmapped: true },
      { field: '@timestamp', include_unmapped: true },
    ]);
  });

  it('should handle empty anonymization fields array', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: [],
      resourceId: 'test-resource-id',
    });

    expect(query.fields).toEqual([]);
  });

  it('should set include_unmapped to true for all fields', () => {
    const query = getAssetMisconfigurationsQuery({
      anonymizationFields: mockAnonymizationFields,
      resourceId: 'test-resource-id',
    });

    query.fields?.forEach((field) => {
      expect(field).toHaveProperty('include_unmapped', true);
    });
  });
});
