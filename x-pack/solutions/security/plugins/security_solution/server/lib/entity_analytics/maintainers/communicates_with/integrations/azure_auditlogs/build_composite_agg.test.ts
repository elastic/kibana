/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { buildCompositeAggQuery, buildBucketUserFilter } from './build_composite_agg';
import {
  AZURE_AUDITLOGS_ACTOR_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_UPN_FIELD,
  AZURE_AUDITLOGS_TARGET_TYPE_FIELD,
  AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD,
} from './constants';

// Narrow shape matching the should branches produced by buildCompositeAggQuery.
interface TargetTypeShouldBranch {
  bool: { filter: Array<{ term?: Record<string, string>; exists?: { field: string } }> };
}
interface TargetTypeShouldClause {
  bool: { should: TargetTypeShouldBranch[]; minimum_should_match: number };
}

function findShouldClause(filters: QueryDslQueryContainer[]): TargetTypeShouldClause | undefined {
  return filters.find((f): f is QueryDslQueryContainer & TargetTypeShouldClause =>
    Array.isArray(f?.bool?.should)
  ) as TargetTypeShouldClause | undefined;
}

describe('communicates_with Azure Audit Logs buildCompositeAggQuery', () => {
  it('requires actor UPN to exist', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      exists: { field: AZURE_AUDITLOGS_ACTOR_UPN_FIELD },
    });
  });

  it('includes a should clause for User-type targets requiring target UPN', () => {
    const query = buildCompositeAggQuery();
    const shouldClause = findShouldClause(query.query.bool.filter as QueryDslQueryContainer[]);
    expect(shouldClause).toBeDefined();
    expect(shouldClause?.bool.minimum_should_match).toBe(1);

    const userBranch = shouldClause?.bool.should.find((s) =>
      s.bool.filter.some((f) => f.term?.[AZURE_AUDITLOGS_TARGET_TYPE_FIELD] === 'User')
    );
    expect(userBranch).toBeDefined();
    expect(userBranch?.bool.filter).toContainEqual({
      exists: { field: AZURE_AUDITLOGS_TARGET_UPN_FIELD },
    });
  });

  it('includes a should clause for Device-type targets requiring display name', () => {
    const query = buildCompositeAggQuery();
    const shouldClause = findShouldClause(query.query.bool.filter as QueryDslQueryContainer[]);

    const deviceBranch = shouldClause?.bool.should.find((s) =>
      s.bool.filter.some((f) => f.term?.[AZURE_AUDITLOGS_TARGET_TYPE_FIELD] === 'Device')
    );
    expect(deviceBranch).toBeDefined();
    expect(deviceBranch?.bool.filter).toContainEqual({
      exists: { field: AZURE_AUDITLOGS_TARGET_DISPLAY_NAME_FIELD },
    });
  });

  it('groups by actor UPN field', () => {
    const query = buildCompositeAggQuery();
    const sources = query.aggs.users.composite.sources;
    expect(sources).toContainEqual({
      [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: {
        terms: { field: AZURE_AUDITLOGS_ACTOR_UPN_FIELD, missing_bucket: true },
      },
    });
  });

  it('passes afterKey to composite aggregation when provided', () => {
    const afterKey = { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: 'admin@contoso.com' };
    const query = buildCompositeAggQuery(afterKey);
    expect(query.aggs.users.composite.after).toEqual(afterKey);
  });
});

describe('communicates_with Azure Audit Logs buildBucketUserFilter', () => {
  it('returns a terms filter for all actor UPNs in the buckets', () => {
    const buckets = [
      { key: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: 'admin@contoso.com' }, doc_count: 5 },
      { key: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: 'user@contoso.com' }, doc_count: 3 },
    ];
    const filter = buildBucketUserFilter(buckets);
    expect(filter).toEqual({
      terms: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: ['admin@contoso.com', 'user@contoso.com'] },
    });
  });

  it('excludes null bucket keys', () => {
    const buckets = [
      { key: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: 'admin@contoso.com' }, doc_count: 5 },
      { key: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: null }, doc_count: 1 },
    ];
    const filter = buildBucketUserFilter(buckets);
    expect(filter).toEqual({
      terms: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: ['admin@contoso.com'] },
    });
  });

  it('returns a match-none filter when all bucket keys are null', () => {
    const buckets = [{ key: { [AZURE_AUDITLOGS_ACTOR_UPN_FIELD]: null }, doc_count: 1 }];
    const filter = buildBucketUserFilter(buckets);
    expect(filter).toEqual({ bool: { must_not: { match_all: {} } } });
  });
});
