/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAgg, buildBucketFilter } from './build_composite_agg';
import type { RelationshipIntegrationConfig, CompositeBucket } from './types';

const accessesConfig: RelationshipIntegrationConfig = {
  id: 'test_accesses',
  name: 'Test Accesses',
  indexPattern: (ns) => `logs-test-${ns}`,
  relationshipType: 'accesses',
  targetEntityType: 'host',
  compositeAggFilters: [{ term: { 'event.action': 'log_on' } }],
  esqlWhereClause: 'event.action == "log_on"',
};

const communicatesConfig: RelationshipIntegrationConfig = {
  id: 'test_comm',
  name: 'Test Comm',
  indexPattern: (ns) => `logs-okta-${ns}`,
  relationshipType: 'communicates_with',
  targetEntityType: 'user',
  compositeAggFilters: [{ terms: { 'event.action': ['user.lifecycle.create'] } }],
  esqlWhereClause: 'event.action == "user.lifecycle.create"',
};

describe('buildCompositeAgg', () => {
  it('uses buildCompositeAggOverride when provided', () => {
    const override = jest.fn().mockReturnValue({ size: 0, query: { match_all: {} }, aggs: {} });
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      buildCompositeAggOverride: override,
    };
    buildCompositeAgg(config, undefined);
    expect(override).toHaveBeenCalledWith(undefined);
  });

  it('includes timestamp range filter', () => {
    const result = buildCompositeAgg(accessesConfig, undefined);
    const filters: unknown[] = (result as any).query.bool.filter;
    const hasRange = filters.some(
      (f: any) => f.range?.['@timestamp']
    );
    expect(hasRange).toBe(true);
  });

  it('includes user identity filter', () => {
    const result = buildCompositeAgg(accessesConfig, undefined);
    const queryStr = JSON.stringify(result);
    // euid.dsl.getEuidDocumentsContainsIdFilter('user') adds a user.* existence check
    expect(queryStr).toContain('user');
  });

  it('includes event.outcome:success filter for accesses', () => {
    const result = buildCompositeAgg(accessesConfig, undefined);
    const queryStr = JSON.stringify(result);
    expect(queryStr).toContain('event.outcome');
    expect(queryStr).toContain('success');
  });

  it('does NOT include event.outcome:success filter for communicates_with', () => {
    const result = buildCompositeAgg(communicatesConfig, undefined);
    const queryStr = JSON.stringify(result);
    expect(queryStr).not.toContain('"success"');
  });

  it('includes the integration-specific compositeAggFilters', () => {
    const result = buildCompositeAgg(accessesConfig, undefined);
    const queryStr = JSON.stringify(result);
    expect(queryStr).toContain('log_on');
  });

  it('includes afterKey in composite sources when provided', () => {
    const afterKey = { 'user.name': 'alice', 'user.email': null };
    const result = buildCompositeAgg(accessesConfig, afterKey);
    expect(JSON.stringify(result)).toContain('alice');
  });
});

describe('buildBucketFilter', () => {
  it('uses buildBucketFilterOverride when provided', () => {
    const override = jest.fn().mockReturnValue({ term: { field: 'value' } });
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      buildBucketFilterOverride: override,
    };
    const buckets: CompositeBucket[] = [{ key: { 'user.name': 'alice' }, doc_count: 1 }];
    buildBucketFilter(config, buckets);
    expect(override).toHaveBeenCalledWith(buckets);
  });

  it('returns a bool/should filter for user identity fields', () => {
    const buckets: CompositeBucket[] = [
      { key: { 'user.email': 'alice@corp', 'user.name': null }, doc_count: 2 },
    ];
    const result = buildBucketFilter(accessesConfig, buckets);
    expect(JSON.stringify(result)).toContain('alice@corp');
  });

  it('returns a match_none filter when buckets is empty', () => {
    const result = buildBucketFilter(accessesConfig, []);
    expect(JSON.stringify(result)).toContain('must_not');
  });
});
