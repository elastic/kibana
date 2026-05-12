/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACCESSES_ENGINE_CONFIGS } from './configs';
import { buildActorDiscoveryQuery } from '../engine/build_actor_discovery_query';
import { buildTargetsPerActorQuery } from '../engine/build_targets_per_actor_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import type { BucketedRelationshipIntegrationConfig } from '../engine/types';

const bucketedConfigs = ACCESSES_ENGINE_CONFIGS.filter(
  (c): c is BucketedRelationshipIntegrationConfig => c.kind === 'bucketed'
);

describe('ACCESSES_ENGINE_CONFIGS', () => {
  it('ships exactly the four expected integrations', () => {
    expect(ACCESSES_ENGINE_CONFIGS.map((c) => c.id).sort()).toEqual([
      'aws_cloudtrail',
      'elastic_defend',
      'system_auth',
      'system_security',
    ]);
  });

  it('declares kind: "bucketed" on every accesses config (access-count classification is the contract)', () => {
    for (const config of ACCESSES_ENGINE_CONFIGS) {
      expect(config.kind).toBe('bucketed');
    }
    // Sanity-check that the typed filter lined up with the runtime assertion.
    expect(bucketedConfigs).toHaveLength(ACCESSES_ENGINE_CONFIGS.length);
  });

  it('declares targetEntityType "host" on every config (accesses is host-targeted)', () => {
    for (const config of ACCESSES_ENGINE_CONFIGS) {
      expect(config.targetEntityType).toBe('host');
    }
  });

  it('opts every accesses config into bucket classification (accesses_frequently / accesses_infrequently)', () => {
    for (const config of bucketedConfigs) {
      expect(config.bucketTargetByThreshold).toEqual({
        threshold: expect.any(Number),
        aboveThresholdRelationship: 'accesses_frequently',
        belowThresholdRelationship: 'accesses_infrequently',
      });
    }
  });

  it('requires a target-EUID-exists gate on every accesses config (Step1/Step2 consistency)', () => {
    for (const config of ACCESSES_ENGINE_CONFIGS) {
      expect(config.requireTargetEntityIdExists).toBe(true);
    }
  });

  it.each(ACCESSES_ENGINE_CONFIGS)(
    '$id: builds a syntactically-locked actor discovery query',
    (config) => {
      const query = buildActorDiscoveryQuery(config, undefined) as {
        size: number;
        query: { bool: { filter: unknown[] } };
        aggs: { users: { composite: { size: number; sources: unknown[] } } };
      };
      expect(query.size).toBe(0);
      expect(query.query.bool.filter.length).toBeGreaterThanOrEqual(2);
      expect(query.aggs.users.composite.size).toBe(COMPOSITE_PAGE_SIZE);
      expect(query.aggs.users.composite.sources.length).toBeGreaterThan(0);
    }
  );

  it.each(ACCESSES_ENGINE_CONFIGS)(
    '$id: builds a syntactically-locked targets-per-actor ES|QL query',
    (config) => {
      const query = buildTargetsPerActorQuery(config, 'default');
      expect(query).toMatch(/^SET unmapped_fields="nullify";\nFROM /);
      expect(query).toContain('| WHERE ');
      expect(query).toContain('| EVAL actorUserId = ');
      expect(query).toContain('| EVAL targetEntityId = ');
      expect(query).toContain('| WHERE COALESCE(actorUserId, "") != ""');
      expect(query).toContain('| WHERE COALESCE(targetEntityId, "") != ""');
      expect(query).toMatch(/\| LIMIT \d+/);
    }
  );

  it.each(ACCESSES_ENGINE_CONFIGS)(
    '$id: emits both bucket-relationship STATS columns',
    (config) => {
      const query = buildTargetsPerActorQuery(config, 'default');
      expect(query).toContain('accesses_frequently = VALUES(targets) WHERE access_type ==');
      expect(query).toContain('accesses_infrequently = VALUES(targets) WHERE access_type ==');
    }
  );

  it.each(ACCESSES_ENGINE_CONFIGS)(
    '$id: filters on event.outcome == "success" in both Step 1 and Step 2',
    (config) => {
      // Step 1: composite-agg additional filter array contains a success term.
      const successFilters = (config.compositeAggAdditionalFilters ?? []).filter(
        (f) => JSON.stringify(f) === JSON.stringify({ term: { 'event.outcome': 'success' } })
      );
      expect(successFilters.length).toBeGreaterThanOrEqual(1);
      // Step 2: ES|QL query includes the same constraint verbatim.
      expect(buildTargetsPerActorQuery(config, 'default')).toContain('event.outcome == "success"');
    }
  );

  it.each(ACCESSES_ENGINE_CONFIGS)(
    '$id: indexPattern is namespace-templated (namespace appears verbatim in the index name)',
    (config) => {
      expect(config.indexPattern('myns')).toContain('-myns');
      expect(config.indexPattern('default')).not.toContain('-myns');
    }
  );

  it('declares a single shared threshold across all four accesses configs (declarative, not magical)', () => {
    const thresholds = bucketedConfigs.map((c) => c.bucketTargetByThreshold.threshold);
    expect(new Set(thresholds).size).toBe(1);
  });

  // Golden snapshots: any future template change will surface here in PR review.
  // Update with `--ci=false -u` only when the change is intentional and reviewed.
  describe('golden snapshots', () => {
    it.each(ACCESSES_ENGINE_CONFIGS)('$id: targets-per-actor ES|QL is locked', (config) => {
      expect(buildTargetsPerActorQuery(config, '__namespace__')).toMatchSnapshot();
    });
  });
});
