/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMUNICATES_WITH_ENGINE_CONFIGS } from './configs';
import { buildActorDiscoveryQuery } from '../engine/build_actor_discovery_query';
import { buildTargetsPerActorQuery } from '../engine/build_targets_per_actor_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';

describe('COMMUNICATES_WITH_ENGINE_CONFIGS', () => {
  it('ships exactly the four expected integrations', () => {
    expect(COMMUNICATES_WITH_ENGINE_CONFIGS.map((c) => c.id).sort()).toEqual([
      'aws_cloudtrail',
      'azure_auditlogs',
      'jamf_pro',
      'okta',
    ]);
  });

  it('declares relationshipType "communicates_with" on every config', () => {
    for (const config of COMMUNICATES_WITH_ENGINE_CONFIGS) {
      expect(config.relationshipType).toBe('communicates_with');
    }
  });

  it('does NOT enable bucketTargetsByAccessCount on any communicates_with config (flat targets list)', () => {
    for (const config of COMMUNICATES_WITH_ENGINE_CONFIGS) {
      expect(config.bucketTargetsByAccessCount).toBeUndefined();
    }
  });

  it.each(COMMUNICATES_WITH_ENGINE_CONFIGS)(
    '$id: builds a syntactically-locked actor discovery query',
    (config) => {
      const query = buildActorDiscoveryQuery(config, undefined) as {
        size: number;
        query: { bool: { filter: unknown[] } };
        aggs: { users: { composite: { size: number; sources: unknown[] } } };
      };
      expect(query.size).toBe(0);
      expect(query.aggs.users.composite.size).toBe(COMPOSITE_PAGE_SIZE);
      expect(query.aggs.users.composite.sources.length).toBeGreaterThan(0);
    }
  );

  it.each(COMMUNICATES_WITH_ENGINE_CONFIGS)(
    '$id: indexPattern is namespace-templated',
    (config) => {
      expect(config.indexPattern('myns')).toContain('-myns');
      expect(config.indexPattern('default')).not.toContain('-myns');
    }
  );

  describe('host-targeted configs (require Step1/Step2 EUID-exists consistency)', () => {
    const hostTargeted = COMMUNICATES_WITH_ENGINE_CONFIGS.filter(
      (c) => c.targetEntityType === 'host'
    );

    it('jamf_pro and aws_cloudtrail are the host-targeted configs', () => {
      expect(hostTargeted.map((c) => c.id).sort()).toEqual(['aws_cloudtrail', 'jamf_pro']);
    });

    it.each(hostTargeted)(
      '$id: opts into requireTargetEntityIdExists so Step 1 and Step 2 narrow consistently',
      (config) => {
        expect(config.requireTargetEntityIdExists).toBe(true);
      }
    );

    it.each(hostTargeted)(
      '$id: produces a single communicates_with STATS column (no bucket classification)',
      (config) => {
        const query = buildTargetsPerActorQuery(config, 'default');
        expect(query).toContain(
          '| STATS communicates_with = VALUES(targetEntityId) BY actorUserId'
        );
        expect(query).not.toContain('access_count');
      }
    );
  });

  describe('user-targeted configs', () => {
    it('okta is the only standard-builder user-targeted config (azure uses an override)', () => {
      const userStandard = COMMUNICATES_WITH_ENGINE_CONFIGS.filter(
        (c) => c.targetEntityType === 'user' && !c.esqlQueryOverride
      );
      expect(userStandard.map((c) => c.id)).toEqual(['okta']);
    });

    it('okta uses targetEvalOverride + additionalTargetFilter to handle the @okta suffix and empty guard', () => {
      const okta = COMMUNICATES_WITH_ENGINE_CONFIGS.find((c) => c.id === 'okta');
      expect(okta?.targetEvalOverride).toContain('@okta');
      expect(okta?.additionalTargetFilter).toContain('user:@okta');
    });
  });

  describe('azure_auditlogs override path', () => {
    const azure = COMMUNICATES_WITH_ENGINE_CONFIGS.find((c) => c.id === 'azure_auditlogs');

    it('declares an esqlQueryOverride and an explicit actorFields list', () => {
      expect(azure).toBeDefined();
      expect(azure?.esqlQueryOverride).toBeInstanceOf(Function);
      expect(azure?.actorFields).toEqual([
        'azure.auditlogs.properties.initiated_by.user.userPrincipalName',
      ]);
    });

    it('produced override query includes the SET unmapped_fields preamble (parity with default builder)', () => {
      const query = buildTargetsPerActorQuery(azure!, 'default');
      expect(query).toMatch(/^SET unmapped_fields="nullify";\n/);
    });

    it('produced override query emits the engine-required column contract (actorUserId + communicates_with)', () => {
      const query = buildTargetsPerActorQuery(azure!, 'default');
      expect(query).toContain('EVAL actorUserId =');
      expect(query).toContain('STATS communicates_with =');
    });

    it('produced override query templates namespace into the FROM clause', () => {
      expect(buildTargetsPerActorQuery(azure!, 'prod')).toContain('FROM logs-azure.auditlogs-prod');
    });

    it('produced override query handles both User and Device target subtypes (multi-target)', () => {
      const query = buildTargetsPerActorQuery(azure!, 'default');
      expect(query).toContain('"User"');
      expect(query).toContain('"Device"');
      expect(query).toContain('CONCAT("user:"');
      expect(query).toContain('CONCAT("host:"');
    });

    it('produced override query guards against empty/missing-target-id false positives', () => {
      const query = buildTargetsPerActorQuery(azure!, 'default');
      expect(query).toContain('targetEntityId != "user:@entra_id"');
      expect(query).toContain('targetEntityId != "host:"');
    });
  });

  describe('non-override configs share the COALESCE empty-guard form', () => {
    const standardConfigs = COMMUNICATES_WITH_ENGINE_CONFIGS.filter((c) => !c.esqlQueryOverride);

    it.each(standardConfigs)('$id: uses COALESCE for the actorUserId guard', (config) => {
      expect(buildTargetsPerActorQuery(config, 'default')).toContain(
        '| WHERE COALESCE(actorUserId, "") != ""'
      );
    });

    it.each(standardConfigs)('$id: uses COALESCE for the targetEntityId guard', (config) => {
      expect(buildTargetsPerActorQuery(config, 'default')).toContain(
        '| WHERE COALESCE(targetEntityId, "") != ""'
      );
    });
  });

  // Golden snapshots: any future template change will surface here in PR review.
  // Update with `--ci=false -u` only when the change is intentional and reviewed.
  describe('golden snapshots', () => {
    it.each(COMMUNICATES_WITH_ENGINE_CONFIGS)(
      '$id: targets-per-actor ES|QL is locked',
      (config) => {
        expect(buildTargetsPerActorQuery(config, '__namespace__')).toMatchSnapshot();
      }
    );
  });
});
