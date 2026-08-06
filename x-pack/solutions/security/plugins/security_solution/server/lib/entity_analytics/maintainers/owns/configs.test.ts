/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNS_INTEGRATION_RELATIONSHIP_CONFIGS, buildOwnsConfigs } from './configs';
import { buildActorDiscoveryQuery } from '../engine/build_actor_discovery_query';
import { buildTargetsPerActorQuery } from '../engine/build_targets_per_actor_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import type { OverrideRelationshipIntegrationConfig } from '../engine/types';

const overrideConfigs = OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.filter(
  (c): c is OverrideRelationshipIntegrationConfig => c.kind === 'override'
);

const OKTA_ID = 'entityanalytics_okta';

const oktaConfig = OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.find(
  (c): c is OverrideRelationshipIntegrationConfig => c.id === OKTA_ID
)!;

describe('OWNS_INTEGRATION_RELATIONSHIP_CONFIGS', () => {
  it('ships exactly the expected integrations', () => {
    expect(OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.map((c) => c.id).sort()).toEqual([
      'entityanalytics_entra_id',
      'entityanalytics_okta',
    ]);
  });

  it('declares kind: "override" on every owns config', () => {
    for (const config of OWNS_INTEGRATION_RELATIONSHIP_CONFIGS) {
      expect(config.kind).toBe('override');
    }
    expect(overrideConfigs).toHaveLength(OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.length);
  });

  it('declares relationshipKey "owns" on every config', () => {
    for (const config of overrideConfigs) {
      expect(config.relationshipKey).toBe('owns');
    }
  });

  it('declares targetEntityType "host" on every config (user → host device)', () => {
    for (const config of OWNS_INTEGRATION_RELATIONSHIP_CONFIGS) {
      expect(config.targetEntityType).toBe('host');
    }
  });

  it.each(OWNS_INTEGRATION_RELATIONSHIP_CONFIGS)(
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
    }
  );

  it('entityanalytics_okta: indexPattern points to the entity index', () => {
    expect(oktaConfig.indexPattern('myns')).toContain('.entities.v2.latest.security_myns');
    expect(oktaConfig.indexPattern('default')).not.toContain('myns');
  });

  it('entityanalytics_okta: override query expands raw host.id before CONCAT (CONCAT is null on multi-valued input)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).toContain('raw_identifiers.host.id');
    expect(query).toContain('MV_EXPAND rawKey0');
    expect(query).toContain('CONCAT("host:", rawKey0)');
  });

  it('entityanalytics_okta: override query does NOT resolve host.name (device display name is not a valid EUID basis)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).not.toContain('raw_identifiers.host.name');
  });

  it('entityanalytics_okta: override query guards against non-EUID target values via RLIKE', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).toContain('targetEntityId RLIKE ".+:.+"');
  });

  it('entityanalytics_okta: override query does NOT filter by entity.type (actor discovered by entity.id)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).not.toContain('entity.type ==');
  });

  it('entityanalytics_okta: override query sets actorUserId from entity.id (already EUID-prefixed)', () => {
    const query = buildTargetsPerActorQuery(oktaConfig, 'default');
    expect(query).toContain('actorUserId = entity.id');
  });

  describe('lookback window', () => {
    it('entityanalytics_okta declares disableLookbackWindow (entity-index source)', () => {
      expect(oktaConfig.disableLookbackWindow).toBe(true);
    });

    it('entityanalytics_okta: Step 1 actor discovery query omits the @timestamp lookback range', () => {
      const query = buildActorDiscoveryQuery(oktaConfig, undefined) as {
        query: { bool: { filter: unknown[] } };
      };
      const hasTimestampRange = query.query.bool.filter.some((f) =>
        JSON.stringify(f).includes('"@timestamp"')
      );
      expect(hasTimestampRange).toBe(false);
    });
  });

  describe('validateTargetIds', () => {
    it('entityanalytics_okta declares validateTargetIds (raw_identifiers targets may not exist)', () => {
      expect(oktaConfig.validateTargetIds).toBe(true);
    });
  });

  describe('actor existence gate', () => {
    it('captures actors that carry owns raw_identifiers under host.id', () => {
      const config = oktaConfig;
      const filters = config.compositeAggAdditionalFilters ?? [];
      const existenceGate = filters.find((f) =>
        JSON.stringify(f).includes('raw_identifiers.host.id')
      );
      expect(existenceGate).toBeDefined();
      const serialized = JSON.stringify(existenceGate);
      expect(serialized).toContain('entity.relationships.owns.raw_identifiers.host.id');
      // host.name (display name) is not a resolvable identifier — must not be in gate.
      expect(serialized).not.toContain('entity.relationships.owns.raw_identifiers.host.name');
    });
  });

  describe('entity.source filter', () => {
    it('Step 1 composite agg filters include an entity.source term for entityanalytics_okta', () => {
      const config = oktaConfig;
      const filters = config.compositeAggAdditionalFilters ?? [];
      const sourceFilter = filters.find((f) => JSON.stringify(f).includes('entity.source'));
      expect(sourceFilter).toEqual({ term: { 'entity.source': 'entityanalytics_okta' } });
    });

    it('Step 2 ES|QL override filters on entity.source == "entityanalytics_okta"', () => {
      const config = oktaConfig;
      const query = config.esqlQueryOverride('default');
      expect(query).toContain('entity.source == "entityanalytics_okta"');
    });
  });

  describe('watermark behaviour', () => {
    const WATERMARK_FIELD = 'entity.lifecycle.last_seen';

    it('with no watermark: query does NOT contain a last_seen filter', () => {
      const config = oktaConfig;
      const query = config.esqlQueryOverride('default');
      expect(query).not.toContain(`${WATERMARK_FIELD} >`);
    });

    it('with watermark: query filters on entity.lifecycle.last_seen after the watermark value', () => {
      const ts = '2026-06-01T00:00:00.000Z';
      const config = buildOwnsConfigs(ts).find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === OKTA_ID
      )!;
      const query = config.esqlQueryOverride('default');
      expect(query).toContain(`${WATERMARK_FIELD} > "${ts}"`);
      // The entity index @timestamp must NOT be used as the incremental signal.
      expect(query).not.toContain('@timestamp >');
    });

    it('with watermark: composite agg filters include an entity.lifecycle.last_seen range', () => {
      const ts = '2026-06-01T00:00:00.000Z';
      const config = buildOwnsConfigs(ts).find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === OKTA_ID
      )!;
      const filters = config.compositeAggAdditionalFilters ?? [];
      const rangeFilters = filters.filter((f) => JSON.stringify(f).includes(WATERMARK_FIELD));
      expect(rangeFilters.length).toBe(1);
      expect(JSON.stringify(rangeFilters[0])).toContain(ts);
      // Guard against a regression back to @timestamp on the entity index.
      const tsFilters = filters.filter((f) => JSON.stringify(f).includes('@timestamp'));
      expect(tsFilters.length).toBe(0);
    });

    it('with no watermark: composite agg filters do NOT include a last_seen range', () => {
      const config = oktaConfig;
      const filters = config.compositeAggAdditionalFilters ?? [];
      const rangeFilters = filters.filter((f) => JSON.stringify(f).includes(WATERMARK_FIELD));
      expect(rangeFilters.length).toBe(0);
    });
  });

  describe('golden snapshots', () => {
    it.each(OWNS_INTEGRATION_RELATIONSHIP_CONFIGS)(
      '$id: targets-per-actor ES|QL is locked (no watermark)',
      (config) => {
        expect(buildTargetsPerActorQuery(config, '__namespace__')).toMatchSnapshot();
      }
    );

    it('entityanalytics_okta: targets-per-actor ES|QL with watermark is locked', () => {
      const config = buildOwnsConfigs('2026-06-01T00:00:00.000Z').find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === OKTA_ID
      )!;
      expect(config.esqlQueryOverride('__namespace__')).toMatchSnapshot();
    });
  });

  describe('entityanalytics_entra_id (log-based)', () => {
    const ENTRA_ID = 'entityanalytics_entra_id';
    const OWNERS_FIELD = 'entityanalytics_entra_id.device.registered_owners';

    const entraConfig = () =>
      buildOwnsConfigs().find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === ENTRA_ID
      )!;

    it('is shipped alongside the okta config', () => {
      expect(
        buildOwnsConfigs()
          .map((c) => c.id)
          .sort()
      ).toEqual(['entityanalytics_entra_id', 'entityanalytics_okta']);
    });

    it('reads the Entra ID log index, not the entity index', () => {
      expect(entraConfig().indexPattern('myns')).toBe('logs-entityanalytics_entra_id.entity-myns');
      expect(entraConfig().indexPattern('default')).not.toContain('.entities.v2.latest');
    });

    it('does NOT disable the lookback window (log index uses the engine 30d @timestamp filter)', () => {
      expect(entraConfig().disableLookbackWindow).toBeUndefined();
    });

    it('does NOT validate target ids (host:<device.id> target is never ambiguous)', () => {
      expect(entraConfig().validateTargetIds).toBe(false);
    });

    it('discovers actors from both flattened owner identifier fields', () => {
      expect(entraConfig().customActor?.fields).toEqual([
        `${OWNERS_FIELD}.mail`,
        `${OWNERS_FIELD}.id`,
      ]);
    });

    it('Step 1 narrows to device documents, requires host.id, and gates on owner presence', () => {
      const filters = entraConfig().compositeAggAdditionalFilters ?? [];
      expect(filters).toContainEqual({
        term: { 'data_stream.dataset': 'entityanalytics_entra_id.device' },
      });
      expect(filters).toContainEqual({ exists: { field: 'host.id' } });

      const ownerGate = filters.find((f) => JSON.stringify(f).includes('registered_owners'));
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.mail`);
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.id`);
    });

    it('Step 1 applies the engine @timestamp lookback (log index)', () => {
      const query = buildActorDiscoveryQuery(entraConfig(), undefined) as {
        query: { bool: { filter: unknown[] } };
      };
      const hasTimestampRange = query.query.bool.filter.some((f) =>
        JSON.stringify(f).includes('"@timestamp"')
      );
      expect(hasTimestampRange).toBe(true);
    });

    it('Step 2 emits the engine column contract (actorUserId + owns)', () => {
      const query = buildTargetsPerActorQuery(entraConfig(), 'default');
      expect(query).toContain('STATS owns = VALUES(targetEntityId) BY actorUserId');
    });

    it('Step 2 guards MV_APPEND against nulls before expanding owners', () => {
      const query = entraConfig().esqlQueryOverride('default');
      // MV_APPEND(null, x) returns null in ES|QL, so each field is appended only
      // when the accumulator is non-null. Without the CASE, every owner missing
      // either field would be silently dropped.
      expect(query).toContain('CASE(');
      expect(query).toContain('MV_APPEND(');
      expect(query).toContain('MV_EXPAND ownerKey');
      // The expand must come after the union and before the actor CONCAT.
      expect(query.indexOf('MV_APPEND(')).toBeLessThan(query.indexOf('MV_EXPAND ownerKey'));
      expect(query.indexOf('MV_EXPAND ownerKey')).toBeLessThan(
        query.indexOf('CONCAT("user:", ownerKey')
      );
    });

    it('Step 2 builds namespace-suffixed actor EUIDs and a namespace-less host target', () => {
      const query = entraConfig().esqlQueryOverride('default');
      expect(query).toContain('CONCAT("user:", ownerKey, "@entra_id")');
      expect(query).toContain('CONCAT("host:", TO_STRING(host.id))');
    });

    it('Step 2 rejects empty-value actor EUIDs', () => {
      const query = entraConfig().esqlQueryOverride('default');
      // An empty owner value would otherwise yield the invalid id "user:@entra_id".
      expect(query).toContain('actorUserId != "user:@entra_id"');
      expect(query).toContain('actorUserId RLIKE ".+:.+@.+"');
    });

    it('never reads registered_users (a separate concept from registered_owners)', () => {
      const query = entraConfig().esqlQueryOverride('default');
      expect(query).not.toContain('registered_users');
      expect(JSON.stringify(entraConfig().compositeAggAdditionalFilters)).not.toContain(
        'registered_users'
      );
    });

    it('ignores the watermark (log-based config re-scans the trailing lookback window)', () => {
      const withWatermark = buildOwnsConfigs('2026-06-01T00:00:00.000Z').find(
        (c): c is OverrideRelationshipIntegrationConfig => c.id === ENTRA_ID
      )!;
      expect(withWatermark.esqlQueryOverride('default')).toBe(
        entraConfig().esqlQueryOverride('default')
      );
      expect(JSON.stringify(withWatermark.compositeAggAdditionalFilters)).not.toContain(
        'entity.lifecycle.last_seen'
      );
    });

    it('targets-per-actor ES|QL is locked', () => {
      expect(buildTargetsPerActorQuery(entraConfig(), '__namespace__')).toMatchSnapshot();
    });
  });
});
