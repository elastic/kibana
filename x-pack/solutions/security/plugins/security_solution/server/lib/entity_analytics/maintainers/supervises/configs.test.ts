/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS, buildSupervisesConfigs } from './configs';
import {
  buildActorDiscoveryQuery,
  getPageActorValues,
} from '../engine/build_actor_discovery_query';
import { buildTargetsPerActorQuery } from '../engine/build_targets_per_actor_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import type { OverrideRelationshipIntegrationConfig } from '../engine/types';

const overrideConfigs = SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.filter(
  (c): c is OverrideRelationshipIntegrationConfig => c.kind === 'override'
);

// Log-inverted configs read the user log index and invert each row's manager
// field; they share none of the entity-index raw_identifiers query shape.
const LOG_INVERTED_CONFIG_IDS = ['workday', 'google_workspace'];

// The IDP configs read raw_identifiers off the entity index, so the
// raw_identifiers assertions below are scoped to these.
const rawIdentifiersConfigs = SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.filter(
  (c) => !LOG_INVERTED_CONFIG_IDS.includes(c.id)
);

// id → (entity.source values, namespace suffix) the config is expected to emit.
const EXPECTED_SOURCE_BY_ID: Record<string, { entitySources: string[]; namespace: string }> = {
  entityanalytics_okta: {
    entitySources: ['entityanalytics_okta', 'entityanalytics_okta.user'],
    namespace: 'okta',
  },
  entityanalytics_entra_id: {
    entitySources: ['entityanalytics_entra_id', 'entityanalytics_entra_id.user'],
    namespace: 'entra_id',
  },
  sailpoint_identity_sc: {
    entitySources: ['sailpoint_identity_sc', 'sailpoint_identity_sc.identities'],
    namespace: 'sailpoint_identity_sc',
  },
};

describe('SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS', () => {
  it('ships exactly the expected IDP and log-inverted integrations (okta + entra_id + sailpoint + workday + google_workspace)', () => {
    expect(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.map((c) => c.id).sort()).toEqual([
      'entityanalytics_entra_id',
      'entityanalytics_okta',
      'google_workspace',
      'sailpoint_identity_sc',
      'workday',
    ]);
  });

  it('declares kind: "override" on every supervises config', () => {
    for (const config of SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS) {
      expect(config.kind).toBe('override');
    }
    expect(overrideConfigs).toHaveLength(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.length);
  });

  it('declares relationshipKey "supervises" on every config', () => {
    for (const config of overrideConfigs) {
      expect(config.relationshipKey).toBe('supervises');
    }
  });

  it('declares targetEntityType "user" on every config (user → user)', () => {
    for (const config of SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS) {
      expect(config.targetEntityType).toBe('user');
    }
  });

  it.each(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS)(
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

  it.each(rawIdentifiersConfigs)(
    '$id: indexPattern points to the entity index (not a log index)',
    (config) => {
      expect(config.indexPattern('myns')).toBe('entities-latest-myns');
      expect(config.indexPattern('default')).not.toContain('myns');
    }
  );

  it.each(rawIdentifiersConfigs)(
    '$id: override query unions all three raw identifier fields with null-safe CASE guards',
    (config) => {
      const query = buildTargetsPerActorQuery(config, 'default');
      const emailField = 'entity.relationships.supervises.raw_identifiers.user.email';
      const idField = 'entity.relationships.supervises.raw_identifiers.user.id';
      const nameField = 'entity.relationships.supervises.raw_identifiers.user.name';
      // ES|QL MV_APPEND(null, x) = null, so both the accumulator and the field
      // being appended are guarded: CASE(a IS NULL, b, b IS NULL, a, MV_APPEND(a, b)).
      expect(query).toContain(
        `CASE(${emailField} IS NULL, ${idField}, ${idField} IS NULL, ${emailField}, MV_APPEND(${emailField}, ${idField}))`
      );
      expect(query).toContain(
        `CASE(${nameField} IS NULL, rawTargetKey, rawTargetKey IS NULL, ${nameField}, MV_APPEND(rawTargetKey, ${nameField}))`
      );
      // Single MV_EXPAND after the union — no cartesian product.
      expect(query).toContain('MV_EXPAND rawTargetKey');
      // Must not use MV_COUNT to pick only one field.
      expect(query).not.toContain('MV_COUNT(');
    }
  );

  it.each(rawIdentifiersConfigs)(
    '$id: override query MV_EXPANDs rawTargetKey BEFORE CONCAT (CONCAT is null on multi-valued input)',
    (config) => {
      const { namespace } = EXPECTED_SOURCE_BY_ID[config.id];
      const query = buildTargetsPerActorQuery(config, 'default');
      const expandIdx = query.indexOf('MV_EXPAND rawTargetKey');
      const concatIdx = query.indexOf(`CONCAT("user:", rawTargetKey, "@${namespace}")`);
      expect(expandIdx).toBeGreaterThanOrEqual(0);
      expect(concatIdx).toBeGreaterThanOrEqual(0);
      expect(expandIdx).toBeLessThan(concatIdx);
    }
  );

  it.each(rawIdentifiersConfigs)(
    '$id: override query builds the user EUID with the IDP namespace suffix',
    (config) => {
      const { namespace } = EXPECTED_SOURCE_BY_ID[config.id];
      const query = buildTargetsPerActorQuery(config, 'default');
      expect(query).toContain(`CONCAT("user:", rawTargetKey, "@${namespace}")`);
    }
  );

  it.each(rawIdentifiersConfigs)(
    '$id: override query guards against non-EUID and namespace-only target values',
    (config) => {
      const { namespace } = EXPECTED_SOURCE_BY_ID[config.id];
      const query = buildTargetsPerActorQuery(config, 'default');
      // Rejects empty/prefix-only values like "user:@<namespace>" from a blank raw
      // field, and requires a namespace-suffixed user EUID shape.
      expect(query).toContain(`targetEntityId != "user:@${namespace}"`);
      expect(query).toContain('targetEntityId RLIKE ".+:.+@.+"');
    }
  );

  it.each(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS)(
    '$id: override query does NOT filter by entity.type (actor discovered by entity.id)',
    (config) => {
      const query = buildTargetsPerActorQuery(config, 'default');
      expect(query).not.toContain('entity.type ==');
    }
  );

  it.each(rawIdentifiersConfigs)(
    '$id: override query sets actorUserId from entity.id (already EUID-prefixed)',
    (config) => {
      const query = buildTargetsPerActorQuery(config, 'default');
      expect(query).toContain('actorUserId = entity.id');
    }
  );

  describe('lookback window', () => {
    // Google Workspace keeps the engine's lookback: its @timestamp is the
    // collection time, and the pre-run reset probe reuses the same Step 1 filter.
    const lookbackDisabledConfigs = SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.filter(
      (c) => c.id !== 'google_workspace'
    );

    it('declares disableLookbackWindow on every config except google_workspace', () => {
      // IDP configs gate on entity.lifecycle.last_seen; Workday gates on event.ingested.
      // Neither wants the engine's @timestamp window.
      for (const config of lookbackDisabledConfigs) {
        expect(config.disableLookbackWindow).toBe(true);
      }
      expect(
        SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.find((c) => c.id === 'google_workspace')
          ?.disableLookbackWindow
      ).toBeUndefined();
    });

    it.each(lookbackDisabledConfigs)(
      '$id: Step 1 actor discovery query omits the @timestamp lookback range',
      (config) => {
        const query = buildActorDiscoveryQuery(config, undefined) as {
          query: { bool: { filter: unknown[] } };
        };
        const hasTimestampRange = query.query.bool.filter.some((f) =>
          JSON.stringify(f).includes('"@timestamp"')
        );
        expect(hasTimestampRange).toBe(false);
      }
    );
  });

  describe('actor existence gate', () => {
    it('captures actors that carry supervises raw_identifiers under user.email, user.id, or user.name', () => {
      const config = buildSupervisesConfigs()[0];
      const filters = config.compositeAggAdditionalFilters ?? [];
      const existenceGate = filters.find((f) =>
        JSON.stringify(f).includes('raw_identifiers.user.email')
      );
      expect(existenceGate).toBeDefined();
      const serialized = JSON.stringify(existenceGate);
      expect(serialized).toContain('entity.relationships.supervises.raw_identifiers.user.email');
      expect(serialized).toContain('entity.relationships.supervises.raw_identifiers.user.id');
      expect(serialized).toContain('entity.relationships.supervises.raw_identifiers.user.name');
    });
  });

  describe('entity.source filter', () => {
    // entity.source may be the bare integration name OR the full <integration>.user
    // dataset (depending on whether the integration emits event.module), so both
    // are matched.
    it.each(rawIdentifiersConfigs)(
      '$id: Step 1 composite agg filters match any of the entity.source values',
      (config) => {
        const { entitySources } = EXPECTED_SOURCE_BY_ID[config.id];
        const filters = config.compositeAggAdditionalFilters ?? [];
        const sourceFilter = filters.find((f) => JSON.stringify(f).includes('entity.source'));
        expect(sourceFilter).toEqual({ terms: { 'entity.source': entitySources } });
      }
    );

    it.each(rawIdentifiersConfigs)(
      '$id: Step 2 ES|QL override filters entity.source IN the configured values',
      (config) => {
        const { entitySources } = EXPECTED_SOURCE_BY_ID[config.id];
        const query = (config as OverrideRelationshipIntegrationConfig).esqlQueryOverride(
          'default'
        );
        const list = entitySources.map((s) => `"${s}"`).join(', ');
        expect(query).toContain(`entity.source IN (${list})`);
      }
    );
  });

  describe('watermark behaviour', () => {
    const WATERMARK_FIELD = 'entity.lifecycle.last_seen';

    it('with no watermark: query does NOT contain a last_seen filter', () => {
      const config = buildSupervisesConfigs()[0] as OverrideRelationshipIntegrationConfig;
      const query = config.esqlQueryOverride('default');
      expect(query).not.toContain(`${WATERMARK_FIELD} >`);
    });

    it('with watermark: query filters on entity.lifecycle.last_seen after the watermark value', () => {
      const ts = '2026-06-01T00:00:00.000Z';
      const config = buildSupervisesConfigs(ts)[0] as OverrideRelationshipIntegrationConfig;
      const query = config.esqlQueryOverride('default');
      expect(query).toContain(`${WATERMARK_FIELD} > "${ts}"`);
      // The entity index @timestamp must NOT be used as the incremental signal.
      expect(query).not.toContain('@timestamp >');
    });

    it('with watermark: composite agg filters include an entity.lifecycle.last_seen range', () => {
      const ts = '2026-06-01T00:00:00.000Z';
      const config = buildSupervisesConfigs(ts)[0];
      const filters = config.compositeAggAdditionalFilters ?? [];
      const rangeFilters = filters.filter((f) => JSON.stringify(f).includes(WATERMARK_FIELD));
      expect(rangeFilters.length).toBe(1);
      expect(JSON.stringify(rangeFilters[0])).toContain(ts);
      // Guard against a regression back to @timestamp on the entity index.
      const tsFilters = filters.filter((f) => JSON.stringify(f).includes('@timestamp'));
      expect(tsFilters.length).toBe(0);
    });

    it('with no watermark: composite agg filters do NOT include a last_seen range', () => {
      const config = buildSupervisesConfigs()[0];
      const filters = config.compositeAggAdditionalFilters ?? [];
      const rangeFilters = filters.filter((f) => JSON.stringify(f).includes(WATERMARK_FIELD));
      expect(rangeFilters.length).toBe(0);
    });
  });

  describe('golden snapshots', () => {
    // Only configs with `scopeToPageActorValues` read these; the engine passes them per page.
    const pageActorValues = ['__manager_email__', '__manager_id__'];

    it.each(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS)(
      '$id: targets-per-actor ES|QL is locked (no watermark)',
      (config) => {
        expect(
          buildTargetsPerActorQuery(config, '__namespace__', pageActorValues)
        ).toMatchSnapshot();
      }
    );

    it.each(SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS.map((c) => c.id))(
      '%s: targets-per-actor ES|QL with watermark is locked',
      (id) => {
        const config = buildSupervisesConfigs('2026-06-01T00:00:00.000Z').find(
          (c) => c.id === id
        ) as OverrideRelationshipIntegrationConfig;
        expect(config.esqlQueryOverride('__namespace__', pageActorValues)).toMatchSnapshot();
      }
    );
  });
});

describe('workday (log-inverted) supervises config', () => {
  const getWorkdayConfig = (lastProcessedTimestamp?: string) =>
    buildSupervisesConfigs(lastProcessedTimestamp).find(
      (c): c is OverrideRelationshipIntegrationConfig => c.id === 'workday'
    )!;

  it('is registered alongside the entity-index configs', () => {
    expect(
      buildSupervisesConfigs()
        .map((c) => c.id)
        .sort()
    ).toEqual([
      'entityanalytics_entra_id',
      'entityanalytics_okta',
      'google_workspace',
      'sailpoint_identity_sc',
      'workday',
    ]);
  });

  it('reads the workday user log data stream, not the entity index', () => {
    expect(getWorkdayConfig().indexPattern('default')).toBe('logs-workday.user-default');
  });

  it('declares a user → user override config with target validation', () => {
    const config = getWorkdayConfig();
    expect(config.kind).toBe('override');
    expect(config.relationshipKey).toBe('supervises');
    expect(config.targetEntityType).toBe('user');
    expect(config.validateTargetIds).toBe(true);
  });

  it('disables the engine lookback because @timestamp is Hire_Date', () => {
    expect(getWorkdayConfig().disableLookbackWindow).toBe(true);
  });

  it('buckets managers, not reports, in step 1', () => {
    expect(getWorkdayConfig().customActor?.fields).toEqual([
      'workday.user.Manager_Email',
      'workday.user.Manager_ID',
    ]);
  });

  it('never reads the Worker_s_Manager display name', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    expect(query).not.toContain('Worker_s_Manager');
    expect(JSON.stringify(getWorkdayConfig().compositeAggAdditionalFilters)).not.toContain(
      'Worker_s_Manager'
    );
  });

  it('emits the engine actor and relationship columns', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    expect(query).toContain('STATS supervises = VALUES(targetEntityId) BY actorUserId');
  });

  it('does not prepend the engine preamble (the engine adds it)', () => {
    expect(getWorkdayConfig().esqlQueryOverride('default')).not.toContain('unmapped_fields');
  });

  it('builds the actor EUID from both manager fields, null-safely', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // MV_APPEND(null, x) returns null, so each side must fall back when the
    // other is null; an unguarded append drops managers on partial rows.
    expect(query).toContain('MV_APPEND(workday.user.Manager_Email, workday.user.Manager_ID)');
    expect(query).toContain('MV_EXPAND managerKey');
    expect(query).toContain('CONCAT("user:", managerKey, "@workday")');
  });

  it('guards against namespace-only and malformed actor EUIDs', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    expect(query).toContain('actorUserId != "user:@workday"');
    expect(query).toContain('actorUserId RLIKE ".+:.+@.+"');
  });

  it('derives the target EUID via the canonical helper, not a hand-built CONCAT', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // The helper emits the full user ranking (email > id > name@domain > name)
    // plus the entity.namespace evaluation it depends on.
    expect(query).toContain('targetEntityId =');
    expect(query).toContain('entity.namespace');
    expect(query).not.toContain('CONCAT("user:", user.email');
  });

  it('keeps the full target ranking including the user.domain arm', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // Workday dissects user.domain from user.email, so the domain arm is
    // unreachable in practice — but it must still be present, because the
    // helper is the guard against the ranking drifting from user.ts.
    expect(query).toContain('user_domain_present');
    expect(query).toContain('user_email_present');
    expect(query).toContain('user_id_present');
  });

  it('emits the host-scoped local branch, which Workday rows must not trigger', () => {
    const query = getWorkdayConfig().esqlQueryOverride('default');
    // The `local` branch outranks the IDP branch and fires on
    // (user.name AND host.id), yielding user:<name>@<host.id>@local. Workday
    // user rows carry no host.id so it never wins, but if the ingest pipeline
    // ever adds one, every Workday target EUID would silently re-key. This
    // assertion documents the dependency; the Scout suite proves the outcome.
    expect(query).toContain('_euid_branch_0_cond');
    expect(query).toContain('"local"');
  });

  it('never filters on @timestamp in either step', () => {
    const config = getWorkdayConfig('2026-09-01T00:00:00.000Z');
    expect(config.esqlQueryOverride('default')).not.toContain('@timestamp');
    expect(JSON.stringify(config.compositeAggAdditionalFilters)).not.toContain('@timestamp');
  });

  describe('actor expansion vs the Step 2 row cap', () => {
    // `MV_EXPAND managerKey` can turn one composite bucket (Manager_Email,
    // Manager_ID) into two distinct actorUserId groups. Composite paging is
    // one-way, so any grouped row the LIMIT discards is never revisited and
    // those managers' reports are silently never written.
    const actorFieldCount = 2;
    // Default `esql.query.result_truncation_max_size`; a higher LIMIT is capped silently.
    const ESQL_RESULT_CAP = 10_000;

    it('caps Step 2 rows above the Step 1 page size, not at it', () => {
      const query = getWorkdayConfig().esqlQueryOverride('default');
      const limit = Number(/\| LIMIT (\d+)/.exec(query)?.[1]);

      expect(limit).toBeGreaterThanOrEqual(COMPOSITE_PAGE_SIZE * actorFieldCount);
      // Guards the specific regression: reusing COMPOSITE_PAGE_SIZE here would
      // drop up to half the actors on a saturated page.
      expect(limit).not.toBe(COMPOSITE_PAGE_SIZE);
    });

    it('scopes Step 2 to the page actor values, which bounds the rows by the page', () => {
      // Without the scope, a document matched through one manager field brings
      // in its other field's value from another page, and rows have no bound.
      expect(getWorkdayConfig().scopeToPageActorValues).toBe(true);
    });

    it("fits a saturated page's actor values under both the LIMIT and the ES|QL result cap", () => {
      // Worst case: every bucket carries a distinct email and a distinct id.
      const buckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) => ({
        key: {
          'workday.user.Manager_Email': `manager${i}@corp`,
          'workday.user.Manager_ID': `id${i}`,
        },
        doc_count: 1,
      }));
      const config = getWorkdayConfig();
      const pageActorValues = getPageActorValues(config, buckets);
      const limit = Number(/\| LIMIT (\d+)/.exec(config.esqlQueryOverride('default'))?.[1]);

      expect(pageActorValues).toHaveLength(COMPOSITE_PAGE_SIZE * actorFieldCount);
      expect(pageActorValues.length).toBeLessThanOrEqual(limit);
      expect(limit).toBeLessThanOrEqual(ESQL_RESULT_CAP);
    });

    it('scales the cap with every field unioned into the actor key', () => {
      // If a third manager identifier is ever unioned into managerKey, a bucket
      // can expand threefold and this cap has to grow with it.
      const query = getWorkdayConfig().esqlQueryOverride('default');
      const limit = Number(/\| LIMIT (\d+)/.exec(query)?.[1]);
      const expandedFields = ['workday.user.Manager_Email', 'workday.user.Manager_ID'].filter(
        (field) => query.includes(`MV_APPEND(${field}`) || query.includes(`, ${field})`)
      );

      expect(expandedFields).toHaveLength(actorFieldCount);
      expect(limit).toBe(COMPOSITE_PAGE_SIZE * expandedFields.length);
    });

    it('keeps the Step 1 page size at the engine default', () => {
      // Only the Step 2 cap compensates for expansion; widening Step 1 instead
      // would change how many actors the engine discovers per iteration.
      const query = buildActorDiscoveryQuery(getWorkdayConfig(), undefined) as {
        aggs: { users: { composite: { size: number } } };
      };
      expect(query.aggs.users.composite.size).toBe(COMPOSITE_PAGE_SIZE);
    });
  });

  describe('first run vs incremental', () => {
    it('scans the full inventory when there is no watermark', () => {
      const config = getWorkdayConfig();
      // `event.ingested` still appears as the latest-snapshot sort key; what must
      // be absent on a first run is a time *filter* on it.
      expect(config.esqlQueryOverride('default')).not.toContain('event.ingested >=');
      expect(JSON.stringify(config.compositeAggAdditionalFilters)).not.toContain('event.ingested');
    });

    it('narrows both steps to a 30d event.ingested window once a watermark exists', () => {
      const config = getWorkdayConfig('2026-09-01T00:00:00.000Z');
      expect(config.esqlQueryOverride('default')).toContain('event.ingested');
      expect(JSON.stringify(config.compositeAggAdditionalFilters)).toContain('event.ingested');
    });

    it('uses a fixed window rather than the watermark value, so a delayed run cannot open a gap', () => {
      const config = getWorkdayConfig('2026-09-01T00:00:00.000Z');
      expect(config.esqlQueryOverride('default')).not.toContain('2026-09-01T00:00:00.000Z');
    });

    it('resets its relationships before each run', () => {
      // Workday re-emits the full inventory every poll, so a manager change must
      // remove the previous edge. The engine cannot retract, so the config clears
      // and repopulates instead.
      expect(getWorkdayConfig().resetRelationshipsBeforeRun).toEqual({
        entitySource: 'workday',
      });
    });

    it('leaves the IDP configs additive', () => {
      // Okta and Entra read raw_identifiers off the entity index, which is already
      // current-state; they have no stale-edge problem to solve and must not be
      // cleared.
      for (const config of buildSupervisesConfigs().filter(
        (c) => !LOG_INVERTED_CONFIG_IDS.includes(c.id)
      )) {
        expect(config.resetRelationshipsBeforeRun).toBeUndefined();
      }
    });
  });
});

describe('google_workspace (log-inverted) supervises config', () => {
  const MANAGER_FIELD = 'google_workspace.users.manager_email';
  const getGoogleWorkspaceConfig = () =>
    buildSupervisesConfigs('2026-09-01T00:00:00.000Z').find(
      (c): c is OverrideRelationshipIntegrationConfig => c.id === 'google_workspace'
    )!;

  it('reads the google_workspace users log data stream, not the entity index', () => {
    expect(getGoogleWorkspaceConfig().indexPattern('default')).toBe(
      'logs-google_workspace.users-default'
    );
  });

  it('declares a user → user override config with target validation', () => {
    const config = getGoogleWorkspaceConfig();
    expect(config.kind).toBe('override');
    expect(config.relationshipKey).toBe('supervises');
    expect(config.targetEntityType).toBe('user');
    expect(config.validateTargetIds).toBe(true);
  });

  it('buckets managers, not reports, in step 1', () => {
    expect(getGoogleWorkspaceConfig().customActor?.fields).toEqual([MANAGER_FIELD]);
  });

  it('keeps the engine @timestamp lookback in both steps', () => {
    const config = getGoogleWorkspaceConfig();
    expect(config.disableLookbackWindow).toBeUndefined();

    const step1 = buildActorDiscoveryQuery(config, undefined) as {
      query: { bool: { filter: unknown[] } };
    };
    expect(step1.query.bool.filter.some((f) => JSON.stringify(f).includes('"@timestamp"'))).toBe(
      true
    );
    // The window is applied by the engine, never hand-written in the override query.
    expect(config.esqlQueryOverride('default', ['a@x'])).not.toContain('NOW()');
  });

  it('ignores the watermark: the config is stateless across runs', () => {
    const withWatermark = buildSupervisesConfigs('2026-09-01T00:00:00.000Z').find(
      (c): c is OverrideRelationshipIntegrationConfig => c.id === 'google_workspace'
    )!;
    const withoutWatermark = buildSupervisesConfigs().find(
      (c): c is OverrideRelationshipIntegrationConfig => c.id === 'google_workspace'
    )!;
    expect(withWatermark.esqlQueryOverride('default', ['a@x'])).toBe(
      withoutWatermark.esqlQueryOverride('default', ['a@x'])
    );
    expect(withWatermark.compositeAggAdditionalFilters).toEqual(
      withoutWatermark.compositeAggAdditionalFilters
    );
  });

  it('does not prepend the engine preamble (the engine adds it)', () => {
    expect(getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x'])).not.toContain(
      'unmapped_fields'
    );
  });

  it('emits the engine actor and relationship columns', () => {
    const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
    expect(query).toContain('actorUserId');
    expect(query).toContain('supervises = VALUES(targetEntityId)');
  });

  it('collapses each user to the manager of their newest snapshot before expanding', () => {
    const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
    const collapseIdx = query.indexOf(`LAST(${MANAGER_FIELD}, @timestamp) BY targetEntityId`);
    const expandIdx = query.indexOf('MV_EXPAND managerKey');
    expect(collapseIdx).toBeGreaterThanOrEqual(0);
    expect(expandIdx).toBeGreaterThan(collapseIdx);
  });

  it('MV_EXPANDs the manager BEFORE building the actor EUID (CONCAT is null on multi-valued input)', () => {
    const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
    const expandIdx = query.indexOf('MV_EXPAND managerKey');
    const concatIdx = query.indexOf('CONCAT("user:", managerKey, "@google_workspace")');
    expect(expandIdx).toBeGreaterThanOrEqual(0);
    expect(concatIdx).toBeGreaterThan(expandIdx);
  });

  it('guards against empty, namespace-only and malformed actor EUIDs', () => {
    const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
    expect(query).toContain('managerKey != ""');
    expect(query).toContain('actorUserId != "user:@google_workspace"');
    expect(query).toContain('actorUserId RLIKE ".+:.+@.+"');
  });

  it('derives the target EUID via the canonical helper, not a hand-built CONCAT', () => {
    const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
    expect(query).not.toContain('CONCAT("user:", user.');
    // Ranking is email first, then id, name@domain and name — each scoped by namespace.
    expect(query).toContain('entity.namespace');
    expect(query).toContain('user.email');
  });

  it('emits the host-scoped local branch, which Google Workspace rows must not trigger', () => {
    // Directory users carry no host.id, so the local (user.name@host.id@local)
    // ranking arm never matches and the target EUID stays email-keyed.
    const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
    expect(query).toContain('"local"');
  });

  describe('actor scoping and row cap', () => {
    it('scopes Step 2 to the page actor values via positional params', () => {
      const config = getGoogleWorkspaceConfig();
      expect(config.scopeToPageActorValues).toBe(true);
      expect(config.esqlQueryOverride('default', ['a@x', 'b@x', 'c@x'])).toContain(
        'managerKey IN (?, ?, ?)'
      );
    });

    it('caps Step 2 rows at the Step 1 page size, which one actor field cannot exceed', () => {
      const query = getGoogleWorkspaceConfig().esqlQueryOverride('default', ['a@x']);
      expect(query).toContain(`LIMIT ${COMPOSITE_PAGE_SIZE}`);
      // ES|QL silently caps any higher LIMIT at the result truncation maximum.
      expect(COMPOSITE_PAGE_SIZE).toBeLessThanOrEqual(10_000);
    });

    it("fits a saturated page's actor values under the LIMIT", () => {
      const buckets = Array.from({ length: COMPOSITE_PAGE_SIZE }, (_, i) => ({
        key: { [MANAGER_FIELD]: `manager${i}@example.com` },
        doc_count: 1,
      }));
      const config = getGoogleWorkspaceConfig();
      const values = getPageActorValues(config, buckets);
      expect(values.length).toBeLessThanOrEqual(COMPOSITE_PAGE_SIZE);
      expect(config.esqlQueryOverride('default', values)).toContain(`LIMIT ${COMPOSITE_PAGE_SIZE}`);
    });
  });

  it('resets its relationships before each run', () => {
    // The stream re-emits the full directory every poll, so a manager change must
    // remove the previous edge; the engine cannot retract, so the config clears
    // and repopulates instead.
    expect(getGoogleWorkspaceConfig().resetRelationshipsBeforeRun).toEqual({
      entitySource: 'google_workspace',
    });
  });
});
