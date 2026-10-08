/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvidenceRegistry } from '../snapshot/evidence_registry';
import {
  buildGapB1,
  buildGapB10,
  buildGapB11,
  buildGapB12,
  buildGapB13,
  buildGapB16,
  buildGapB17,
  buildGapB2,
  buildGapB4,
  buildGapB5,
  buildGapB6,
  buildGapB8,
  buildGapB9,
  sortGaps,
} from './gap_signals';
import type { EntityDocSummary, StorylineEntityContext } from './gap_signals';

const NOW = '2026-10-08T00:00:00.000Z';
const daysAgo = (days: number): string =>
  new Date(Date.parse(NOW) - days * 86_400_000).toISOString();

const doc = (euid: string, extra: Partial<EntityDocSummary> = {}): EntityDocSummary => ({
  euid,
  hasRelationships: false,
  ...extra,
});

const entityContext = (
  overrides: Partial<StorylineEntityContext> & { docs?: EntityDocSummary[] }
): StorylineEntityContext => ({
  storylineEuids: [],
  materialRiskEuids: [],
  entities: { indexExists: true, docs: overrides.docs ?? [] },
  ...overrides,
});

describe('gap signals', () => {
  let registry: EvidenceRegistry;
  beforeEach(() => {
    registry = new EvidenceRegistry();
  });

  describe('B1 relationship sources', () => {
    it('fires when there is no IdP inventory', () => {
      const gap = buildGapB1(registry, new Set(['endpoint', 'system_auth']));
      expect(gap).toMatchObject({
        evidenceId: 'GAP-B1',
        signal: 'B1',
        group: 'data_not_collected',
        severity: 'warning',
        title: 'Relationships unavailable: no IdP inventory (Okta/Entra/AD)',
        fixHref: '/app/integrations/detail/entityanalytics_okta/overview',
      });
      expect(registry.has('GAP-B1')).toBe(true);
    });

    it('fires when there is no logon data and points at the System integration', () => {
      const gap = buildGapB1(registry, new Set(['okta']));
      expect(gap?.title).toBe(
        'Relationships unavailable: no logon data (Elastic Defend or System)'
      );
      expect(gap?.fixHref).toBe('/app/integrations/detail/system/overview');
    });

    it('stays quiet when both an IdP and logon data exist', () => {
      expect(buildGapB1(registry, new Set(['entra_id', 'endpoint']))).toBeUndefined();
    });
  });

  describe('B4 storyline entities without relationships', () => {
    it('counts a golden entity with relationships on one of its aliases as covered', () => {
      const gap = buildGapB4(
        registry,
        entityContext({
          storylineEuids: ['user:golden', 'host:lonely'],
          docs: [
            doc('user:golden'),
            doc('user:alias@h@local', { resolvedTo: 'user:golden', hasRelationships: true }),
            doc('host:lonely'),
          ],
        })
      );
      expect(gap).toMatchObject({
        signal: 'B4',
        group: 'attribution_gap',
        severity: 'info',
        title: '1 storyline entity has no known relationships',
        value: 1,
        entityEuids: ['host:lonely'],
      });
    });

    it('does nothing without storyline entities or an entity index', () => {
      expect(buildGapB4(registry, entityContext({}))).toBeUndefined();
      expect(
        buildGapB4(registry, {
          storylineEuids: ['host:a'],
          materialRiskEuids: [],
          entities: { indexExists: false, docs: [] },
        })
      ).toBeUndefined();
    });
  });

  describe('B5 unresolved identities', () => {
    it('matches the fixture wording', () => {
      expect(buildGapB5(registry, { total: 14, storylineEuids: [] })).toEqual({
        evidenceId: 'GAP-B5',
        signal: 'B5',
        group: 'context_missing',
        severity: 'info',
        title: '14 local user accounts are not resolved to an identity',
        value: 14,
        fixHref: '/app/security/entity_analytics_entity_store',
        fixLabel: 'Review resolution',
      });
    });

    it('includes storyline entities when there are any', () => {
      expect(
        buildGapB5(registry, { total: 1, storylineEuids: ['user:x@h@local'] })?.entityEuids
      ).toEqual(['user:x@h@local']);
      expect(buildGapB5(registry, { total: 0, storylineEuids: [] })).toBeUndefined();
    });
  });

  describe('B6 no asset criticality', () => {
    it('fires for a material-risk entity without criticality (and one that is missing)', () => {
      const gap = buildGapB6(
        registry,
        entityContext({
          materialRiskEuids: ['host:laptop', 'host:prod', 'host:ghost'],
          docs: [doc('host:laptop'), doc('host:prod', { criticality: 'extreme_impact' })],
        })
      );
      expect(gap).toMatchObject({
        evidenceId: 'GAP-B6',
        group: 'context_missing',
        severity: 'warning',
        title: 'No asset criticality on 2 material-risk entities',
        value: 2,
        fixHref: '/app/security/entity_analytics_asset_criticality',
        fixLabel: 'Assign criticality',
        entityEuids: ['host:laptop', 'host:ghost'],
      });
    });

    it('uses the singular form and stays quiet when everything has criticality', () => {
      expect(
        buildGapB6(
          registry,
          entityContext({ materialRiskEuids: ['host:a'], docs: [doc('host:a')] })
        )?.title
      ).toBe('No asset criticality on 1 material-risk entity');
      expect(
        buildGapB6(
          registry,
          entityContext({
            materialRiskEuids: ['host:a'],
            docs: [doc('host:a', { criticality: 'low_impact' })],
          })
        )
      ).toBeUndefined();
    });
  });

  describe('B8 alerts without an entity', () => {
    it('fires above the share threshold', () => {
      expect(buildGapB8(registry, { total: 100, unattributed: 25 })).toMatchObject({
        signal: 'B8',
        group: 'attribution_gap',
        severity: 'warning',
        title: '25% of alerts cannot be attributed to an entity',
        value: 25,
      });
    });

    it('stays quiet below the threshold or with no alerts', () => {
      expect(buildGapB8(registry, { total: 100, unattributed: 5 })).toBeUndefined();
      expect(buildGapB8(registry, { total: 0, unattributed: 0 })).toBeUndefined();
    });
  });

  describe('B9 entity types not monitored', () => {
    it('is info when only the service engine is missing', () => {
      expect(
        buildGapB9(registry, { indexExists: true, types: new Set(['user', 'host']) })
      ).toMatchObject({
        signal: 'B9',
        severity: 'info',
        title: 'Entity types not monitored: service',
      });
    });

    it('is a warning when users or hosts are missing, and handles an empty store', () => {
      expect(
        buildGapB9(registry, { indexExists: true, types: new Set(['service']) })?.severity
      ).toBe('warning');
      expect(buildGapB9(registry, { indexExists: false, types: new Set() })?.title).toBe(
        'The Entity Store has no entities'
      );
      expect(
        buildGapB9(registry, { indexExists: true, types: new Set(['user', 'host', 'service']) })
      ).toBeUndefined();
    });
  });

  describe('B10 Attack Discovery', () => {
    it('fires when it has never run', () => {
      expect(buildGapB10(registry, { enabledSchedules: 0 }, NOW)).toMatchObject({
        signal: 'B10',
        group: 'analytics_not_running',
        title: 'Attack Discovery has never run',
        fixHref: '/app/security/attack_discovery',
      });
    });

    it('distinguishes scheduled-but-empty', () => {
      expect(buildGapB10(registry, { enabledSchedules: 1 }, NOW)?.title).toBe(
        'Attack Discovery is scheduled but has not produced results yet'
      );
    });

    it('fires when stale and unscheduled, but not when scheduled or fresh', () => {
      expect(
        buildGapB10(registry, { lastTimestamp: daysAgo(10), enabledSchedules: 0 }, NOW)?.title
      ).toBe('Attack Discovery last ran 10 days ago and is not scheduled');
      expect(
        buildGapB10(registry, { lastTimestamp: daysAgo(10), enabledSchedules: 1 }, NOW)
      ).toBeUndefined();
      expect(
        buildGapB10(registry, { lastTimestamp: daysAgo(1), enabledSchedules: 0 }, NOW)
      ).toBeUndefined();
    });
  });

  describe('B11 hunting leads', () => {
    it('fires with no index or no leads, and when stale', () => {
      expect(buildGapB11(registry, { indexExists: false, total: 0 }, NOW)?.title).toBe(
        'No hunting leads have been generated'
      );
      expect(buildGapB11(registry, { indexExists: true, total: 0 }, NOW)?.signal).toBe('B11');
      expect(
        buildGapB11(registry, { indexExists: true, total: 5, lastRun: daysAgo(9) }, NOW)?.title
      ).toBe('Hunting leads were last generated 9 days ago');
    });

    it('stays quiet for fresh leads', () => {
      expect(
        buildGapB11(registry, { indexExists: true, total: 5, lastRun: daysAgo(1) }, NOW)
      ).toBeUndefined();
    });
  });

  describe('B12 ML', () => {
    it('matches the fixture when ML is unavailable', () => {
      expect(
        buildGapB12(registry, { mlAvailable: false, jobsInstalled: 0, jobsOpened: 0 })
      ).toEqual({
        evidenceId: 'GAP-B12',
        signal: 'B12',
        group: 'analytics_not_running',
        severity: 'info',
        title: 'No security ML jobs are running',
        fixHref: '/app/ml/jobs',
        fixLabel: 'Set up ML',
      });
    });

    it('explains installed-but-stopped jobs and stays quiet when any job runs', () => {
      expect(
        buildGapB12(registry, { mlAvailable: true, jobsInstalled: 4, jobsOpened: 0 })?.detail
      ).toBe('4 security ML jobs are installed but none is started');
      expect(
        buildGapB12(registry, { mlAvailable: true, jobsInstalled: 4, jobsOpened: 1 })
      ).toBeUndefined();
    });
  });

  describe('B13 risk engine', () => {
    it('fires when not started or never succeeded', () => {
      expect(buildGapB13(registry, undefined, NOW)?.title).toBe('Risk scoring is not running');
      expect(buildGapB13(registry, { taskStatus: 'stopped' }, NOW)?.severity).toBe('warning');
      expect(
        buildGapB13(registry, { taskStatus: 'started', lastSuccessTimestamp: null }, NOW)?.title
      ).toBe('Risk scoring has not completed a run');
    });

    it('fires when stale and stays quiet when fresh', () => {
      const old = new Date(Date.parse(NOW) - 30 * 3_600_000).toISOString();
      const fresh = new Date(Date.parse(NOW) - 2 * 3_600_000).toISOString();
      expect(
        buildGapB13(registry, { taskStatus: 'started', lastSuccessTimestamp: old }, NOW)?.title
      ).toBe('Risk scores were last updated 30 hours ago');
      expect(
        buildGapB13(registry, { taskStatus: 'started', lastSuccessTimestamp: fresh }, NOW)
      ).toBeUndefined();
    });
  });

  describe('B16 unmapped alerts', () => {
    it('matches the fixture wording', () => {
      expect(
        buildGapB16(registry, { alerts: 9, share: 0.18, topRuleEvidenceIds: ['RULE-10'] })
      ).toEqual({
        evidenceId: 'GAP-B16',
        signal: 'B16',
        group: 'detection_coverage',
        severity: 'warning',
        title: '18% of alerts have no MITRE ATT&CK mapping',
        value: 18,
        fixHref: '/app/security/rules_coverage_overview',
        fixLabel: 'Review coverage',
      });
    });

    it('stays quiet when the share is small or zero', () => {
      expect(
        buildGapB16(registry, { alerts: 1, share: 0.02, topRuleEvidenceIds: [] })
      ).toBeUndefined();
      expect(
        buildGapB16(registry, { alerts: 0, share: 0, topRuleEvidenceIds: [] })
      ).toBeUndefined();
    });
  });

  describe('B17 response gap', () => {
    it('maps alias hits back to golden entities and escalates on critical alerts', () => {
      const gap = buildGapB17(
        registry,
        { total: 3, critical: 1, entityIds: ['user:alias@h@local'] },
        ['user:golden', 'host:other'],
        [doc('user:golden'), doc('user:alias@h@local', { resolvedTo: 'user:golden' })]
      );
      expect(gap).toMatchObject({
        signal: 'B17',
        group: 'response_gap',
        severity: 'danger',
        title: '3 open High/Critical alerts in storylines have no case',
        value: 3,
        entityEuids: ['user:golden'],
      });
    });

    it('is a warning without critical alerts and quiet with none', () => {
      expect(
        buildGapB17(registry, { total: 1, critical: 0, entityIds: [] }, ['host:a'], [])?.severity
      ).toBe('warning');
      expect(
        buildGapB17(registry, { total: 0, critical: 0, entityIds: [] }, ['host:a'], [])
      ).toBeUndefined();
    });
  });

  it('keeps the stubbed signals as no-ops', () => {
    expect(buildGapB2()).toBeUndefined();
  });

  it('sorts by severity then signal number', () => {
    const sorted = sortGaps(
      [
        buildGapB12(registry, { mlAvailable: false, jobsInstalled: 0, jobsOpened: 0 }),
        buildGapB6(registry, entityContext({ materialRiskEuids: ['h'], docs: [] })),
        buildGapB5(registry, { total: 2, storylineEuids: [] }),
        buildGapB17(registry, { total: 1, critical: 1, entityIds: [] }, [], []),
      ].flatMap((gap) => (gap ? [gap] : []))
    );
    expect(sorted.map(({ signal }) => signal)).toEqual(['B17', 'B6', 'B5', 'B12']);
  });
});
