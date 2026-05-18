/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { buildTargetsPerActorQuery } from './build_targets_per_actor_query';
import type { RelationshipIntegrationConfig } from './types';

const HOST_ESQL_EXISTS = euid.esql.getEuidDocumentsContainsIdFilter('host');
const USER_ESQL_EXISTS = euid.esql.getEuidDocumentsContainsIdFilter('user');

const accessesConfig: RelationshipIntegrationConfig = {
  kind: 'bucketed',
  id: 'elastic_defend',
  name: 'Elastic Defend',
  indexPattern: (ns) => `logs-endpoint.events.security-${ns}`,
  targetEntityType: 'host',
  bucketTargetByThreshold: {
    threshold: 4,
    aboveThresholdRelationship: 'accesses_frequently',
    belowThresholdRelationship: 'accesses_infrequently',
  },
  requireTargetEntityIdExists: true,
  esqlWhereClause:
    'event.action == "log_on" AND process.Ext.session_info.logon_type IN ("RemoteInteractive", "Interactive", "Network") AND event.outcome == "success"',
};

const commWithHostConfig: RelationshipIntegrationConfig = {
  kind: 'standard',
  id: 'jamf_pro',
  name: 'Jamf Pro',
  indexPattern: (ns) => `logs-jamf_pro.events-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'host',
  requireTargetEntityIdExists: true,
  esqlWhereClause: 'user.name IS NOT NULL',
};

const commWithUserConfig: RelationshipIntegrationConfig = {
  kind: 'standard',
  id: 'okta',
  name: 'Okta',
  indexPattern: (ns) => `logs-okta.system-${ns}`,
  relationshipKey: 'communicates_with',
  targetEntityType: 'user',
  esqlWhereClause: 'event.action IN ("user.lifecycle.create") AND user.target.email IS NOT NULL',
  targetEvalOverride: 'CONCAT("user:", user.target.email, "@okta")',
  additionalTargetFilter: 'AND targetEntityId != "user:@okta"',
};

describe('buildTargetsPerActorQuery (targets per actor)', () => {
  it('delegates body to esqlQueryOverride and prepends the engine preamble for kind: "override" configs', () => {
    const override = jest.fn().mockReturnValue('FROM test | LIMIT 1');
    const overrideConfig: RelationshipIntegrationConfig = {
      kind: 'override',
      id: 'test_override',
      name: 'Test Override',
      indexPattern: (ns) => `logs-test-${ns}`,
      relationshipKey: 'communicates_with',
      targetEntityType: 'user',
      esqlQueryOverride: override,
    };
    // The engine owns the preamble — overrides only return the body. This
    // means a future override that forgets `SET unmapped_fields="nullify"`
    // still gets the right semantics.
    expect(buildTargetsPerActorQuery(overrideConfig, 'default')).toBe(
      'SET unmapped_fields="nullify";\nFROM test | LIMIT 1'
    );
    expect(override).toHaveBeenCalledWith('default');
  });

  it('prepends the engine preamble exactly once on the override path (overrides must not include their own SET)', () => {
    const overrideConfig: RelationshipIntegrationConfig = {
      kind: 'override',
      id: 'test_override',
      name: 'Test Override',
      indexPattern: (ns) => `logs-test-${ns}`,
      relationshipKey: 'communicates_with',
      targetEntityType: 'user',
      esqlQueryOverride: () => 'FROM test | LIMIT 1',
    };
    const query = buildTargetsPerActorQuery(overrideConfig, 'default');
    const matches = query.match(/SET unmapped_fields="nullify";/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('prepends the engine preamble exactly once on the default-builder path', () => {
    const query = buildTargetsPerActorQuery(accessesConfig, 'default');
    const matches = query.match(/SET unmapped_fields="nullify";/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  describe('engine no longer injects integration data semantics', () => {
    it('does NOT add an `event.outcome == "success"` filter on its own — that is the config\'s job', () => {
      // The engine must no longer carry the "accesses == success" semantic.
      // (Note: an unrelated `event.outcome != "failure"` baseline exists inside
      // getEuidDocumentsContainsIdFilter and is expected.)
      const noOutcomeConfig: RelationshipIntegrationConfig = {
        ...accessesConfig,
        esqlWhereClause: 'event.action == "log_on"',
      };
      expect(buildTargetsPerActorQuery(noOutcomeConfig, 'default')).not.toContain(
        'event.outcome == "success"'
      );
    });

    it('preserves an event.outcome filter that the config declares in esqlWhereClause', () => {
      // When the config opts into the outcome filter (as the four accesses
      // configs do), it appears verbatim in the WHERE clause.
      expect(buildTargetsPerActorQuery(accessesConfig, 'default')).toContain(
        'event.outcome == "success"'
      );
    });
  });

  describe('accesses template', () => {
    it('uses the namespace-derived index pattern', () => {
      expect(buildTargetsPerActorQuery(accessesConfig, 'prod')).toContain(
        'logs-endpoint.events.security-prod'
      );
    });

    it('includes the integration esqlWhereClause', () => {
      expect(buildTargetsPerActorQuery(accessesConfig, 'default')).toContain(
        'event.action == "log_on"'
      );
    });

    it('produces accesses_frequently and accesses_infrequently STATS columns', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      expect(query).toContain('accesses_frequently');
      expect(query).toContain('accesses_infrequently');
    });

    it('uses the threshold the config declares (no engine-side default)', () => {
      // The fixture declares threshold: 4
      expect(buildTargetsPerActorQuery(accessesConfig, 'default')).toContain('>= 4');
      // A different config declares a different threshold and that value flows through verbatim.
      expect(
        buildTargetsPerActorQuery(
          {
            ...accessesConfig,
            bucketTargetByThreshold: {
              threshold: 10,
              aboveThresholdRelationship: 'accesses_frequently',
              belowThresholdRelationship: 'accesses_infrequently',
            },
          },
          'default'
        )
      ).toContain('>= 10');
    });

    it('emits the bucket relationship keys the config declares (engine has no hardcoded names)', () => {
      // Reuse the accesses fixture with a different schema-valid pair to prove
      // the engine reads keys from config, not from a baked-in literal.
      const ownsBucketed: RelationshipIntegrationConfig = {
        ...accessesConfig,
        bucketTargetByThreshold: {
          threshold: 7,
          aboveThresholdRelationship: 'owns',
          belowThresholdRelationship: 'owns_inferred',
        },
      };
      const query = buildTargetsPerActorQuery(ownsBucketed, 'default');
      expect(query).toContain('access_count >= 7, "owns"');
      expect(query).toContain('"owns_inferred"');
      expect(query).toContain('owns = VALUES(targets) WHERE access_type == "owns"');
      expect(query).toContain(
        'owns_inferred = VALUES(targets) WHERE access_type == "owns_inferred"'
      );
      // The accesses bucket-pair literals must not leak into a non-accesses
      // bucketed config — proves the column names are 100% data-driven.
      expect(query).not.toContain('accesses_frequently');
      expect(query).not.toContain('accesses_infrequently');
    });

    it('uses customActor.evalOverride when provided', () => {
      const evalOverride = 'CONCAT("user:", user.name, "@", host.id, "@local")';
      const query = buildTargetsPerActorQuery(
        { ...accessesConfig, customActor: { fields: ['user.name'], evalOverride } },
        'default'
      );
      expect(query).toContain(evalOverride);
    });

    it('skips entity.namespace field evals when customActor.evalOverride is set', () => {
      const evalOverride = 'CONCAT("user:", user.name, "@", host.id, "@local")';
      const query = buildTargetsPerActorQuery(
        { ...accessesConfig, customActor: { fields: ['user.name'], evalOverride } },
        'default'
      );
      expect(query).not.toContain('entity.namespace');
      expect(query).not.toContain('_src_entity_namespace');
    });

    it('includes entity.namespace field evals when customActor.evalOverride is not set', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      expect(query).toContain('entity.namespace');
    });

    // Type-level co-requirement: setting `customActor` requires `fields`.
    // Setting `evalOverride` without `fields` is a compile error because the
    // two live in the same nested object — Step 1 (composite-agg sources)
    // and Step 2 (actor EUID expression) cannot drift apart silently.
    it('co-requires customActor.fields when customActor is set (compile-time invariant)', () => {
      const config: RelationshipIntegrationConfig = {
        ...accessesConfig,
        customActor: { fields: ['user.name'], evalOverride: 'CONCAT("user:", user.name)' },
      };
      // Smoke check: both fields present in the build path.
      const query = buildTargetsPerActorQuery(config, 'default');
      expect(query).toContain('CONCAT("user:", user.name)');
    });
  });

  describe('communicates_with template', () => {
    it('produces a communicates_with STATS column', () => {
      expect(buildTargetsPerActorQuery(commWithHostConfig, 'default')).toContain(
        'communicates_with'
      );
    });
  });

  describe('requireTargetEntityIdExists (target EUID-exists gate)', () => {
    it('emits the host EUID-exists filter line when the flag is true with a host target', () => {
      const query = buildTargetsPerActorQuery(commWithHostConfig, 'default');
      expect(query).toContain(`AND (${HOST_ESQL_EXISTS})`);
    });

    it('parameterizes the filter by targetEntityType — a user target emits the user-EUID filter, not host', () => {
      const userTargetWithFlag: RelationshipIntegrationConfig = {
        ...commWithUserConfig,
        requireTargetEntityIdExists: true,
      };
      const query = buildTargetsPerActorQuery(userTargetWithFlag, 'default');
      // The actor user-EUID filter is always present; with the flag set on a
      // user target, the same filter shape appears a second time as the gate.
      const userFilterCount = query.split(`(${USER_ESQL_EXISTS})`).length - 1;
      expect(userFilterCount).toBeGreaterThanOrEqual(2);
      expect(query).not.toContain(`AND (${HOST_ESQL_EXISTS})`);
    });

    it('does NOT emit a target-EUID-exists filter line when the flag is omitted', () => {
      const query = buildTargetsPerActorQuery(commWithUserConfig, 'default');
      expect(query).not.toContain(`AND (${HOST_ESQL_EXISTS})`);
      // user-actor identity filter is still present (one occurrence), but no extra target gate
      const userFilterCount = query.split(`(${USER_ESQL_EXISTS})`).length - 1;
      expect(userFilterCount).toBe(1);
    });
  });

  describe('targetEvalOverride / additionalTargetFilter', () => {
    it('uses targetEvalOverride when provided', () => {
      expect(buildTargetsPerActorQuery(commWithUserConfig, 'default')).toContain('@okta');
    });

    it('appends additionalTargetFilter when provided', () => {
      expect(buildTargetsPerActorQuery(commWithUserConfig, 'default')).toContain('"user:@okta"');
    });
  });

  // Regression for the same shape of bug fixed in Step 1: when a config
  // supplies `customActor`, the engine-injected userIdFilter (the
  // `AND (...)` clause that follows `esqlWhereClause`) must be derived from
  // `customActor.fields` rather than hardcoded to ECS `user.*`. Otherwise
  // standard/bucketed configs that opt into a custom actor identity would
  // silently produce zero rows in Step 2.
  describe('customActor userId existence gate (no ECS user.* dependency)', () => {
    const customField = 'custom.actor.field';
    const customActorConfig: RelationshipIntegrationConfig = {
      ...commWithUserConfig,
      customActor: {
        fields: [customField],
        evalOverride: `CONCAT("user:", ${customField}, "@custom")`,
      },
    };

    it('does NOT include the ECS user-EUID-exists ES|QL filter when customActor is set', () => {
      const query = buildTargetsPerActorQuery(customActorConfig, 'default');
      expect(query).not.toContain(`AND (${USER_ESQL_EXISTS})`);
    });

    it('emits an "any of customActor.fields is non-empty" ES|QL gate immediately after the integration WHERE clause', () => {
      const multiFieldConfig: RelationshipIntegrationConfig = {
        ...commWithUserConfig,
        customActor: {
          fields: ['custom.actor.one', 'custom.actor.two'],
          evalOverride: 'CONCAT("user:", custom.actor.one, "@custom")',
        },
      };
      const query = buildTargetsPerActorQuery(multiFieldConfig, 'default');
      expect(query).toContain('`custom.actor.one` IS NOT NULL');
      expect(query).toContain('`custom.actor.one` != ""');
      expect(query).toContain('`custom.actor.two` IS NOT NULL');
      expect(query).toContain('`custom.actor.two` != ""');
    });

    it('keeps the requireTargetEntityIdExists target-EUID gate independent of customActor', () => {
      const query = buildTargetsPerActorQuery(
        { ...customActorConfig, targetEntityType: 'host', requireTargetEntityIdExists: true },
        'default'
      );
      // Target-side gate is parameterized by targetEntityType, so the
      // host-EUID gate is still present even though the actor is custom.
      expect(query).toContain(`AND (${HOST_ESQL_EXISTS})`);
      expect(query).not.toContain(`AND (${USER_ESQL_EXISTS})`);
    });
  });

  // Regression guard for an ES|QL quirk where `WHERE col IS NOT NULL`
  // evaluates to FALSE for every row when `col` is produced by CONCAT() over
  // a CASE() with nested CASE arms (as the user EUID actorEval does). Using
  // COALESCE(col, "") != "" preserves the original semantic intent while
  // sidestepping the bug.
  describe('null/empty filter form (ES|QL CONCAT(CASE) quirk workaround)', () => {
    it('uses COALESCE(actorUserId, "") != "" rather than `IS NOT NULL AND`', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      expect(query).toContain('| WHERE COALESCE(actorUserId, "") != ""');
      expect(query).not.toMatch(/WHERE\s+actorUserId\s+IS\s+NOT\s+NULL/);
    });

    it('uses COALESCE(targetEntityId, "") != "" rather than `IS NOT NULL AND`', () => {
      const query = buildTargetsPerActorQuery(accessesConfig, 'default');
      expect(query).toContain('| WHERE COALESCE(targetEntityId, "") != ""');
      expect(query).not.toMatch(/WHERE\s+targetEntityId\s+IS\s+NOT\s+NULL/);
    });

    it('applies the COALESCE form on the non-bucketed (kind: "standard") path as well', () => {
      const query = buildTargetsPerActorQuery(commWithHostConfig, 'default');
      expect(query).toContain('| WHERE COALESCE(actorUserId, "") != ""');
      expect(query).toContain('| WHERE COALESCE(targetEntityId, "") != ""');
    });

    it('still composes the additionalTargetFilter immediately after the targetEntityId filter', () => {
      const query = buildTargetsPerActorQuery(commWithUserConfig, 'default');
      expect(query).toContain(
        '| WHERE COALESCE(targetEntityId, "") != ""\n    AND targetEntityId != "user:@okta"'
      );
    });
  });
});
