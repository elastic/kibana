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
  esqlWhereClause: 'event.action == "log_on"',
};

const communicatesConfig: RelationshipIntegrationConfig = {
  id: 'test_comm',
  name: 'Test Comm',
  indexPattern: (ns) => `logs-okta-${ns}`,
  relationshipType: 'communicates_with',
  targetEntityType: 'user',
  esqlWhereClause: 'event.action == "user.lifecycle.create"',
};

describe('buildCompositeAgg', () => {
  it('includes timestamp range filter', () => {
    const result = buildCompositeAgg(accessesConfig, undefined);
    const filters = (result as { query: { bool: { filter: Array<Record<string, unknown>> } } })
      .query.bool.filter;
    const hasRange = filters.some(
      (f) => (f.range as Record<string, unknown> | undefined)?.['@timestamp']
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

  it('uses actorFields as composite sources when provided', () => {
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      actorFields: ['custom.actor.field'],
    };
    const result = buildCompositeAgg(config, undefined);
    expect(JSON.stringify(result)).toContain('custom.actor.field');
  });

  it('uses actorFields in bucket filter when provided', () => {
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      actorFields: ['custom.actor.field'],
    };
    const buckets: CompositeBucket[] = [{ key: { 'custom.actor.field': 'alice' }, doc_count: 1 }];
    const result = buildBucketFilter(config, buckets);
    expect(JSON.stringify(result)).toContain('custom.actor.field');
    expect(JSON.stringify(result)).toContain('alice');
  });

  it('includes afterKey in composite sources when provided', () => {
    const afterKey = { 'user.name': 'alice', 'user.email': null };
    const result = buildCompositeAgg(accessesConfig, afterKey);
    expect(JSON.stringify(result)).toContain('alice');
  });

  it('appends compositeAggAdditionalFilters to the base filters', () => {
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      compositeAggAdditionalFilters: [{ term: { 'event.action': 'log_on' } }],
    };
    const result = buildCompositeAgg(config, undefined);
    const queryStr = JSON.stringify(result);
    expect(queryStr).toContain('event.action');
    expect(queryStr).toContain('log_on');
  });

  it('does NOT include extra event filters when compositeAggAdditionalFilters is absent', () => {
    const result = buildCompositeAgg(accessesConfig, undefined);
    const queryStr = JSON.stringify(result);
    expect(queryStr).not.toContain('log_on');
  });
});

describe('buildBucketFilter', () => {
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
