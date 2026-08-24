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

  // Entra ID is log-based (see entityanalytics_entra_id describe below); only
  // entity-index sources must resolve to the `entities-latest-{ns}` alias (it
  // covers both legacy `security_{ns}` and neutral concrete indices).
  it.each(OWNS_INTEGRATION_RELATIONSHIP_CONFIGS.filter((c) => c.id === OKTA_ID))(
    '$id: indexPattern points to the entity index (not a log index)',
    (config) => {
      expect(config.indexPattern('myns')).toBe('entities-latest-myns');
      expect(config.indexPattern('default')).not.toContain('myns');
    }
  );

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
    const OWNERS_FIELD = 'device.registered_owners';

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
      expect(entraConfig().indexPattern('myns')).toBe('logs-entityanalytics_entra_id.device-myns');
      // The index pattern targets the device data stream directly, so no
      // data_stream.dataset filter is needed to separate device from user docs.
      expect(entraConfig().indexPattern('myns')).not.toContain('.entity-');
      expect(entraConfig().indexPattern('default')).not.toContain('entities-latest');
    });

    it('does NOT disable the lookback window (log index uses the engine 30d @timestamp filter)', () => {
      expect(entraConfig().disableLookbackWindow).toBeUndefined();
    });

    it('does NOT validate target ids (host:<device.id> target is never ambiguous)', () => {
      expect(entraConfig().validateTargetIds).toBe(false);
    });

    it('discovers actors from all three flattened owner identifier fields (mail > id > upn)', () => {
      expect(entraConfig().customActor?.fields).toEqual([
        `${OWNERS_FIELD}.mail`,
        `${OWNERS_FIELD}.id`,
        `${OWNERS_FIELD}.user_principal_name`,
      ]);
    });

    it('Step 1 requires host.id and gates on owner presence (any of mail, id, upn)', () => {
      const filters = entraConfig().compositeAggAdditionalFilters ?? [];
      expect(filters).toContainEqual({ exists: { field: 'host.id' } });

      const ownerGate = filters.find((f) => JSON.stringify(f).includes('registered_owners'));
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.mail`);
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.id`);
      expect(JSON.stringify(ownerGate)).toContain(`${OWNERS_FIELD}.user_principal_name`);
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

    it('Step 2 unions all owner identifier arrays before MV_EXPAND', () => {
      const query = entraConfig().esqlQueryOverride('default');
      // `registered_owners` is a plain object mapping (not nested), so the indexed
      // representation is parallel arrays of different lengths. A ranked CASE over
      // the whole column would short-circuit on the first non-null one and drop
      // owners lacking that field, so all three are unioned instead.
      expect(query).toContain('MV_APPEND(');
      expect(query).toContain(`${OWNERS_FIELD}.mail`);
      expect(query).toContain(`${OWNERS_FIELD}.id`);
      expect(query).toContain(`${OWNERS_FIELD}.user_principal_name`);
      expect(query).toContain('MV_EXPAND ownerKey');
      expect(query.indexOf('MV_APPEND(')).toBeLessThan(query.indexOf('MV_EXPAND ownerKey'));
      expect(query.indexOf('MV_EXPAND ownerKey')).toBeLessThan(
        query.indexOf('CONCAT("user:", ownerKey')
      );
    });

    it('Step 2 null-guards every MV_APPEND (a null argument nulls the whole result)', () => {
      const query = entraConfig().esqlQueryOverride('default');
      // MV_APPEND returns null if ANY argument is null, and the engine's
      // `unmapped_fields="nullify"` preamble makes an absent column null. An
      // unguarded union therefore drops every owner on any document missing one
      // of the three fields. Each append must fall back to the other operand.
      const appendCalls = query.match(/MV_APPEND\(/g) ?? [];
      expect(appendCalls.length).toBeGreaterThan(0);
      for (const suffix of ['mail', 'id', 'user_principal_name']) {
        expect(query).toContain(`${OWNERS_FIELD}.${suffix} IS NULL`);
      }
      // Every MV_APPEND must sit inside a CASE that has already excluded nulls.
      expect(query).not.toMatch(/EVAL\s+\w+\s*=\s*MV_APPEND\(/);
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

    it('Step 2 WHERE gate accepts documents with any of mail, id, or upn', () => {
      const query = entraConfig().esqlQueryOverride('default');
      expect(query).toContain(`${OWNERS_FIELD}.mail IS NOT NULL`);
      expect(query).toContain(`${OWNERS_FIELD}.id IS NOT NULL`);
      expect(query).toContain(`${OWNERS_FIELD}.user_principal_name IS NOT NULL`);
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
