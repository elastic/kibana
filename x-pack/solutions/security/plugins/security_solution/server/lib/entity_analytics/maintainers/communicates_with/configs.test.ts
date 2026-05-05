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
import type {
  StandardRelationshipIntegrationConfig,
  OverrideRelationshipIntegrationConfig,
} from '../engine/types';

const standardConfigs = COMMUNICATES_WITH_ENGINE_CONFIGS.filter(
  (c): c is StandardRelationshipIntegrationConfig => c.kind === 'standard'
);
const overrideConfigs = COMMUNICATES_WITH_ENGINE_CONFIGS.filter(
  (c): c is OverrideRelationshipIntegrationConfig => c.kind === 'override'
);

describe('COMMUNICATES_WITH_ENGINE_CONFIGS', () => {
  it('ships exactly the four expected integrations', () => {
    expect(COMMUNICATES_WITH_ENGINE_CONFIGS.map((c) => c.id).sort()).toEqual([
      'aws_cloudtrail',
      'azure_auditlogs',
      'jamf_pro',
      'okta',
    ]);
  });

  it('declares relationshipKey "communicates_with" on every standard/override config (bucketed has no relationshipKey)', () => {
    for (const config of [...standardConfigs, ...overrideConfigs]) {
      expect(config.relationshipKey).toBe('communicates_with');
    }
  });

  it('uses only kind: "standard" or "override" (no bucketing — communicates_with is a flat targets list)', () => {
    for (const config of COMMUNICATES_WITH_ENGINE_CONFIGS) {
      expect(['standard', 'override']).toContain(config.kind);
    }
    // Sanity-check that filtered partitions cover every config.
    expect(standardConfigs.length + overrideConfigs.length).toBe(
      COMMUNICATES_WITH_ENGINE_CONFIGS.length
    );
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

    // Each host-targeted config narrows Step 1 by target presence so it
    // matches what Step 2's WHERE clause filters on. Two equivalent
    // mechanisms exist:
    //   - `requireTargetEntityIdExists: true` for configs whose target eval
    //     reads any host.* EUID source (jamf_pro uses the engine default).
    //   - explicit `compositeAggAdditionalFilters: [{ exists: { field } }]`
    //     for configs whose target eval reads a single specific field
    //     (aws_cloudtrail reads only `host.target.entity.id`, so the broad
    //     EUID gate would surface actors that never produce target rows).
    it.each(hostTargeted)(
      '$id: narrows Step 1 by target presence so Step 1 and Step 2 select the same docs',
      (config) => {
        const broadGate = config.requireTargetEntityIdExists === true;
        const narrowGate =
          config.compositeAggAdditionalFilters?.some((f) => {
            const filter = f as { exists?: { field?: string } };
            return filter.exists?.field !== undefined;
          }) ?? false;
        expect(broadGate || narrowGate).toBe(true);
      }
    );

    it('jamf_pro uses the broad target-EUID gate (no targetEvalOverride)', () => {
      const jamf = standardConfigs.find((c) => c.id === 'jamf_pro');
      expect(jamf).toBeDefined();
      expect(jamf?.requireTargetEntityIdExists).toBe(true);
      expect(jamf?.targetEvalOverride).toBeUndefined();
    });

    it('aws_cloudtrail uses the narrow exists filter (because targetEvalOverride reads a single field)', () => {
      const aws = standardConfigs.find((c) => c.id === 'aws_cloudtrail');
      expect(aws).toBeDefined();
      expect(aws?.requireTargetEntityIdExists).toBeUndefined();
      expect(aws?.targetEvalOverride).toContain('host.target.entity.id');
      expect(aws?.compositeAggAdditionalFilters).toEqual(
        expect.arrayContaining([{ exists: { field: 'host.target.entity.id' } }])
      );
    });

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
      const userStandard = standardConfigs.filter((c) => c.targetEntityType === 'user');
      expect(userStandard.map((c) => c.id)).toEqual(['okta']);
    });

    it('okta uses targetEvalOverride + additionalTargetFilter to handle the @okta suffix and empty guard', () => {
      const okta = standardConfigs.find((c) => c.id === 'okta');
      expect(okta).toBeDefined();
      expect(okta?.targetEvalOverride).toContain('@okta');
      expect(okta?.additionalTargetFilter).toContain('user:@okta');
    });
  });

  describe('azure_auditlogs override path', () => {
    const azure = overrideConfigs.find((c) => c.id === 'azure_auditlogs');

    it('declares an esqlQueryOverride and an explicit customActor.fields list', () => {
      expect(azure).toBeDefined();
      expect(azure?.esqlQueryOverride).toBeInstanceOf(Function);
      expect(azure?.customActor?.fields).toEqual([
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
