/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { buildActorDiscoveryQuery, buildActorPageFilter } from './build_actor_discovery_query';
import type { RelationshipIntegrationConfig, CompositeBucket } from './types';

const HOST_EUID_FILTER = euid.dsl.getEuidDocumentsContainsIdFilter('host');
const USER_EUID_FILTER = euid.dsl.getEuidDocumentsContainsIdFilter('user');

const accessesConfig: RelationshipIntegrationConfig = {
  id: 'test_accesses',
  name: 'Test Accesses',
  indexPattern: (ns) => `logs-test-${ns}`,
  relationshipType: 'accesses',
  targetEntityType: 'host',
  bucketTargetsByAccessCount: {
    threshold: 4,
    aboveThresholdRelationship: 'accesses_frequently',
    belowThresholdRelationship: 'accesses_infrequently',
  },
  requireTargetEntityIdExists: true,
  esqlWhereClause: 'event.action == "log_on" AND event.outcome == "success"',
};

const communicatesConfig: RelationshipIntegrationConfig = {
  id: 'test_comm',
  name: 'Test Comm',
  indexPattern: (ns) => `logs-okta-${ns}`,
  relationshipType: 'communicates_with',
  targetEntityType: 'user',
  esqlWhereClause: 'event.action == "user.lifecycle.create"',
};

describe('buildActorDiscoveryQuery (actor discovery)', () => {
  it('includes timestamp range filter', () => {
    const result = buildActorDiscoveryQuery(accessesConfig, undefined);
    const filters = (result as { query: { bool: { filter: Array<Record<string, unknown>> } } })
      .query.bool.filter;
    const hasRange = filters.some(
      (f) => (f.range as Record<string, unknown> | undefined)?.['@timestamp']
    );
    expect(hasRange).toBe(true);
  });

  it('includes the user-EUID-exists DSL filter (deep-equality, not substring)', () => {
    const filters = (
      buildActorDiscoveryQuery(accessesConfig, undefined) as {
        query: { bool: { filter: Array<Record<string, unknown>> } };
      }
    ).query.bool.filter;
    const expected = JSON.stringify(USER_EUID_FILTER);
    const matches = filters.filter((f) => JSON.stringify(f) === expected);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT inject the engine-side event.outcome == "success" term filter that used to be auto-applied to accesses', () => {
    // The engine must no longer carry "accesses == success" semantics — that
    // belongs in the integration's compositeAggAdditionalFilters. Note: an
    // unrelated `event.outcome != "failure"` baseline appears inside
    // getEuidDocumentsContainsIdFilter and is expected.
    const filters = (
      buildActorDiscoveryQuery(accessesConfig, undefined) as {
        query: { bool: { filter: Array<Record<string, unknown>> } };
      }
    ).query.bool.filter;
    const successTerm = filters.find(
      (f) => JSON.stringify(f) === JSON.stringify({ term: { 'event.outcome': 'success' } })
    );
    expect(successTerm).toBeUndefined();
  });

  describe('requireTargetEntityIdExists', () => {
    it('emits the targetEntityType EUID-exists DSL filter when the flag is true (host target)', () => {
      const filters = (
        buildActorDiscoveryQuery(accessesConfig, undefined) as {
          query: { bool: { filter: Array<Record<string, unknown>> } };
        }
      ).query.bool.filter;
      const expected = JSON.stringify(HOST_EUID_FILTER);
      const hasHostFilter = filters.some((f) => JSON.stringify(f) === expected);
      expect(hasHostFilter).toBe(true);
    });

    it('parameterizes the gate by targetEntityType — a user-targeted config emits the user-EUID filter, not host', () => {
      const userTargetConfig: RelationshipIntegrationConfig = {
        ...communicatesConfig,
        requireTargetEntityIdExists: true,
      };
      const filters = (
        buildActorDiscoveryQuery(userTargetConfig, undefined) as {
          query: { bool: { filter: Array<Record<string, unknown>> } };
        }
      ).query.bool.filter;

      const hostShape = JSON.stringify(HOST_EUID_FILTER);
      const userShape = JSON.stringify(USER_EUID_FILTER);
      // User-EUID filter appears at least twice (actor identity + target gate),
      // host-EUID filter never appears as a top-level filter.
      const userMatches = filters.filter((f) => JSON.stringify(f) === userShape).length;
      const hostMatches = filters.filter((f) => JSON.stringify(f) === hostShape).length;
      expect(userMatches).toBeGreaterThanOrEqual(2);
      expect(hostMatches).toBe(0);
    });

    it('does NOT emit a target EUID-exists filter when the flag is omitted', () => {
      const filters = (
        buildActorDiscoveryQuery(communicatesConfig, undefined) as {
          query: { bool: { filter: Array<Record<string, unknown>> } };
        }
      ).query.bool.filter;
      // Only the actor-side user EUID filter should appear; no second copy and no host filter.
      const userShape = JSON.stringify(USER_EUID_FILTER);
      const hostShape = JSON.stringify(HOST_EUID_FILTER);
      const userMatches = filters.filter((f) => JSON.stringify(f) === userShape).length;
      const hostMatches = filters.filter((f) => JSON.stringify(f) === hostShape).length;
      expect(userMatches).toBe(1);
      expect(hostMatches).toBe(0);
    });
  });

  it('uses actorFields as composite sources when provided (structural, not substring)', () => {
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      actorFields: ['custom.actor.field'],
    };
    const result = buildActorDiscoveryQuery(config, undefined) as {
      aggs: {
        users: {
          composite: { sources: Array<Record<string, { terms: { field: string } }>> };
        };
      };
    };
    const sources = result.aggs.users.composite.sources;
    expect(sources).toHaveLength(1);
    expect(sources[0]).toEqual({
      'custom.actor.field': { terms: { field: 'custom.actor.field', missing_bucket: true } },
    });
  });

  it('uses actorFields in bucket filter when provided', () => {
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      actorFields: ['custom.actor.field'],
    };
    const buckets: CompositeBucket[] = [{ key: { 'custom.actor.field': 'alice' }, doc_count: 1 }];
    const result = buildActorPageFilter(config, buckets);
    expect(JSON.stringify(result)).toContain('custom.actor.field');
    expect(JSON.stringify(result)).toContain('alice');
  });

  it('includes afterKey in composite sources when provided', () => {
    const afterKey = { 'user.name': 'alice', 'user.email': null };
    const result = buildActorDiscoveryQuery(accessesConfig, afterKey);
    expect(JSON.stringify(result)).toContain('alice');
  });

  it('appends compositeAggAdditionalFilters to the base filters (deep-equality, not substring)', () => {
    const extra = { term: { 'event.action': 'log_on' } };
    const config: RelationshipIntegrationConfig = {
      ...accessesConfig,
      compositeAggAdditionalFilters: [extra],
    };
    const filters = (
      buildActorDiscoveryQuery(config, undefined) as {
        query: { bool: { filter: Array<Record<string, unknown>> } };
      }
    ).query.bool.filter;
    expect(filters.some((f) => JSON.stringify(f) === JSON.stringify(extra))).toBe(true);
  });

  it('does NOT include extra event filters when compositeAggAdditionalFilters is absent', () => {
    const result = buildActorDiscoveryQuery(accessesConfig, undefined);
    const queryStr = JSON.stringify(result);
    expect(queryStr).not.toContain('log_on');
  });
});

describe('buildActorPageFilter (page filter)', () => {
  it('returns a bool/should filter for user identity fields', () => {
    const buckets: CompositeBucket[] = [
      { key: { 'user.email': 'alice@corp', 'user.name': null }, doc_count: 2 },
    ];
    const result = buildActorPageFilter(accessesConfig, buckets);
    expect(JSON.stringify(result)).toContain('alice@corp');
  });

  it('returns a match_none filter when buckets is empty', () => {
    const result = buildActorPageFilter(accessesConfig, []);
    expect(JSON.stringify(result)).toContain('must_not');
  });
});
