/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityRow, FilterSnapshot } from './types';
import { WATCHLIST_ANY, WATCHLIST_NONE } from './types';
import {
  activeColumns,
  builtinSavedGroups,
  compareRows,
  CRIT_RANK,
  DAY_MS,
  DEFAULT_ORDER,
  defaultVisible,
  emptySnapshot,
  isFirstHighIn,
  isNewAlertedIn,
  isNewIn,
  levelOf,
  parseColumnPrefs,
  parseSavedGroups,
  reorderColumns,
  savedGroupCount,
  searchMatches,
  selectVisibleRows,
  serializeColumnPrefs,
  serializeSavedGroups,
  snapshotIsActive,
  snapshotMatches,
  snapshotsEqual,
  sortValue,
  tileMatches,
  tilePopulation,
  uncasedOf,
  WINDOW_MS,
} from './entities_logic';

const NOW = new Date('2026-07-17T14:45:00Z').getTime();

const makeRow = (overrides: Partial<EntityRow> = {}): EntityRow => ({
  base: {
    id: overrides.identifierValue ?? 'user:test',
    name: overrides.identifierValue ?? 'test.user',
    type: EntityType.user,
    identifierValue: overrides.identifierValue ?? 'test.user',
    riskScoreNorm: 50,
    riskLevel: 'Moderate',
    criticality: undefined,
    source: undefined,
    lastSeen: undefined,
  },
  identifierValue: 'test.user',
  type: EntityType.user,
  isService: false,
  risk: 50,
  level: 'Moderate',
  criticality: undefined,
  alerts: 0,
  uncased: 0,
  ruleNames: [],
  newRules: [],
  anoms: 0,
  attacks: 0,
  cases: 0,
  watchlists: [],
  identities: [],
  firstSeen: undefined,
  lastSeen: undefined,
  lastAlert: undefined,
  firstHighAt: undefined,
  deltas: {
    w1: { alerts: 0, risk: 0, anoms: 0 },
    w7: { alerts: 0, risk: 0, anoms: 0 },
    w30: { alerts: 0, risk: 0, anoms: 0 },
  },
  caseIds: [],
  attackIds: [],
  ...overrides,
});

describe('entities_logic', () => {
  describe('levelOf', () => {
    it.each([
      [95, 'Critical'],
      [90, 'Critical'],
      [89, 'High'],
      [70, 'High'],
      [69, 'Moderate'],
      [40, 'Moderate'],
      [39, 'Low'],
      [20, 'Low'],
      [19, 'Unknown'],
      [0, 'Unknown'],
    ])('maps score %i to %s', (score, level) => {
      expect(levelOf(score)).toBe(level);
    });
  });

  describe('window constants', () => {
    it('maps windows to day spans', () => {
      expect(WINDOW_MS.w1).toBe(DAY_MS);
      expect(WINDOW_MS.w7).toBe(7 * DAY_MS);
      expect(WINDOW_MS.w30).toBe(30 * DAY_MS);
    });
  });

  describe('uncasedOf', () => {
    it('returns the explicit uncased count when present', () => {
      expect(uncasedOf(makeRow({ alerts: 10, uncased: 3 }))).toBe(3);
    });
    it('preserves unavailable associations', () => {
      const row = makeRow({ alerts: 10, uncased: undefined });
      expect(uncasedOf(row)).toBeUndefined();
    });
  });

  describe('window membership predicates', () => {
    it('isNewIn respects the window span', () => {
      const row = makeRow({ firstSeen: NOW - 2 * DAY_MS });
      expect(isNewIn(row, 'w1', NOW)).toBe(false);
      expect(isNewIn(row, 'w7', NOW)).toBe(true);
      expect(isNewIn(makeRow({ firstSeen: undefined }), 'w30', NOW)).toBe(false);
    });
    it('isNewAlertedIn requires alerts', () => {
      expect(isNewAlertedIn(makeRow({ firstSeen: NOW - 1000, alerts: 0 }), 'w1', NOW)).toBe(false);
      expect(isNewAlertedIn(makeRow({ firstSeen: NOW - 1000, alerts: 4 }), 'w1', NOW)).toBe(true);
    });
    it('isFirstHighIn requires High score and recent firstHighAt', () => {
      expect(isFirstHighIn(makeRow({ risk: 75, firstHighAt: NOW - 2 * DAY_MS }), 'w1', NOW)).toBe(
        false
      );
      expect(isFirstHighIn(makeRow({ risk: 75, firstHighAt: NOW - 2 * DAY_MS }), 'w7', NOW)).toBe(
        true
      );
      expect(isFirstHighIn(makeRow({ risk: 60, firstHighAt: NOW }), 'w1', NOW)).toBe(false);
    });
  });

  describe('tileMatches / tilePopulation', () => {
    const rows = [
      makeRow({ identifierValue: 'a', risk: 95, cases: 0, watchlists: ['x'] }),
      makeRow({ identifierValue: 'b', risk: 72, cases: 2 }),
      makeRow({ identifierValue: 'c', risk: 30, newRules: ['R1'] }),
      makeRow({ identifierValue: 'd', risk: 75, firstHighAt: NOW - 1000, cases: 0 }),
      makeRow({ identifierValue: 'e', risk: 10, firstSeen: NOW - 1000, alerts: 3 }),
    ];
    it('highrisk = risk >= 70', () => {
      expect(tilePopulation('highrisk', rows, 'w1', NOW)).toBe(3);
    });
    it('untriaged = High/Critical with no case', () => {
      expect(tilePopulation('untriaged', rows, 'w1', NOW)).toBe(2);
    });
    it('firsthigh = first-ever High in window', () => {
      expect(tilePopulation('firsthigh', rows, 'w1', NOW)).toBe(1);
    });
    it('newrule = has a new rule in window', () => {
      expect(tilePopulation('newrule', rows, 'w1', NOW)).toBe(1);
    });
    it('newalerted = new entity already alerting', () => {
      expect(tilePopulation('newalerted', rows, 'w1', NOW)).toBe(1);
    });
    it('watchlisted = on any watchlist', () => {
      expect(tilePopulation('watchlisted', rows, 'w1', NOW)).toBe(1);
    });
    it('tileMatches returns false for unknown key', () => {
      expect(tileMatches('bogus' as never, rows[0], 'w1', NOW)).toBe(false);
    });
  });

  describe('unavailable evidence', () => {
    it.each(['unavailable', 'ambiguous', 'partial'] as const)(
      'does not classify %s cases as untriaged',
      (status) => {
        const row = makeRow({ risk: 90, cases: 0, evidence: { cases: status } });
        expect(tileMatches('untriaged', row, 'w1', NOW)).toBe(false);
      }
    );

    it('does not treat an unavailable watchlist as confirmed nonmembership', () => {
      const row = makeRow({ evidence: { watchlists: 'unavailable' } });
      expect(snapshotMatches(row, emptySnapshot({ watchlists: [WATCHLIST_NONE] }), 'w1', NOW)).toBe(
        false
      );
    });

    it('does not expose stale signals as current alerting or risk movement', () => {
      const row = makeRow({
        firstSeen: NOW - 1000,
        alerts: 10,
        evidence: { alerts: 'unavailable', riskHistory: 'unavailable' },
        deltas: { ...makeRow().deltas, w1: { alerts: 10, risk: 5, anoms: 0 } },
      });
      expect(isNewAlertedIn(row, 'w1', NOW)).toBe(false);
      expect(snapshotMatches(row, emptySnapshot({ trend: 'up' }), 'w1', NOW)).toBe(false);
    });

    it('sorts unknown counts last in either direction', () => {
      const missing = makeRow({ uncased: undefined });
      const known = makeRow({ uncased: 0 });
      expect(compareRows(missing, known, { col: 'uncased', dir: 1 }, 'w1')).toBe(1);
      expect(compareRows(missing, known, { col: 'uncased', dir: -1 }, 'w1')).toBe(1);
    });
  });

  describe('snapshotMatches', () => {
    const svc = makeRow({ identifierValue: 'svc', isService: true, type: EntityType.service });
    const host = makeRow({ identifierValue: 'h', type: EntityType.host });
    const user = makeRow({ identifierValue: 'u', type: EntityType.user });

    it('filters application services by their entity store type', () => {
      expect(snapshotMatches(svc, emptySnapshot({ type: 'service' }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(user, emptySnapshot({ type: 'service' }), 'w1', NOW)).toBe(false);
      expect(snapshotMatches(svc, emptySnapshot({ type: 'user' }), 'w1', NOW)).toBe(false);
      expect(snapshotMatches(user, emptySnapshot({ type: 'user' }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(host, emptySnapshot({ type: 'host' }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(host, emptySnapshot({ type: 'user' }), 'w1', NOW)).toBe(false);
    });
    it('filters by risk level', () => {
      const row = makeRow({ level: 'High' });
      expect(snapshotMatches(row, emptySnapshot({ levels: ['High'] }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(row, emptySnapshot({ levels: ['Low'] }), 'w1', NOW)).toBe(false);
    });
    it('filters by criticality', () => {
      const row = makeRow({ criticality: 'high_impact' });
      expect(snapshotMatches(row, emptySnapshot({ crits: ['high_impact'] }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(row, emptySnapshot({ crits: ['low_impact'] }), 'w1', NOW)).toBe(false);
      const none = makeRow({ criticality: undefined });
      expect(snapshotMatches(none, emptySnapshot({ crits: ['low_impact'] }), 'w1', NOW)).toBe(
        false
      );
    });
    it('filters by risk trend', () => {
      const rising = makeRow({
        deltas: { ...makeRow().deltas, w1: { alerts: 0, risk: 5, anoms: 0 } },
      });
      const falling = makeRow({
        deltas: { ...makeRow().deltas, w1: { alerts: 0, risk: -5, anoms: 0 } },
      });
      expect(snapshotMatches(rising, emptySnapshot({ trend: 'up' }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(rising, emptySnapshot({ trend: 'down' }), 'w1', NOW)).toBe(false);
      expect(snapshotMatches(falling, emptySnapshot({ trend: 'down' }), 'w1', NOW)).toBe(true);
    });
    it('filters by rule', () => {
      const row = makeRow({ ruleNames: ['Malware Detection Alert'] });
      expect(
        snapshotMatches(row, emptySnapshot({ rule: 'Malware Detection Alert' }), 'w1', NOW)
      ).toBe(true);
      expect(snapshotMatches(row, emptySnapshot({ rule: 'Other' }), 'w1', NOW)).toBe(false);
    });
    it('filters by case id', () => {
      const row = makeRow({ caseIds: ['case-1'] });
      expect(snapshotMatches(row, emptySnapshot({ caseId: 'case-1' }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(row, emptySnapshot({ caseId: 'case-2' }), 'w1', NOW)).toBe(false);
    });
    it('filters by attack id', () => {
      const row = makeRow({ attackIds: ['atk-1'] });
      expect(snapshotMatches(row, emptySnapshot({ attackId: 'atk-1' }), 'w1', NOW)).toBe(true);
      expect(snapshotMatches(row, emptySnapshot({ attackId: 'atk-2' }), 'w1', NOW)).toBe(false);
    });
    it('filters by watchlist selection / any / none', () => {
      const onList = makeRow({ watchlists: ['Privileged Users'] });
      const noList = makeRow({ watchlists: [] });
      expect(
        snapshotMatches(onList, emptySnapshot({ watchlists: ['Privileged Users'] }), 'w1', NOW)
      ).toBe(true);
      expect(
        snapshotMatches(onList, emptySnapshot({ watchlists: [WATCHLIST_ANY] }), 'w1', NOW)
      ).toBe(true);
      expect(
        snapshotMatches(noList, emptySnapshot({ watchlists: [WATCHLIST_ANY] }), 'w1', NOW)
      ).toBe(false);
      expect(
        snapshotMatches(noList, emptySnapshot({ watchlists: [WATCHLIST_NONE] }), 'w1', NOW)
      ).toBe(true);
    });
  });

  describe('searchMatches', () => {
    const row = makeRow({
      identifierValue: 'alex.chen',
      identities: [{ source: 'crowdstrike', value: 'ACME\\achen' }],
    });
    row.base.name = 'alex.chen@LAPTOP';
    it('matches on name', () => {
      expect(searchMatches(row, 'laptop')).toBe(true);
    });
    it('matches on a resolution identity value', () => {
      expect(searchMatches(row, 'achen')).toBe(true);
    });
    it('empty query matches everything', () => {
      expect(searchMatches(row, '  ')).toBe(true);
    });
    it('non-matching query is excluded', () => {
      expect(searchMatches(row, 'zzz')).toBe(false);
    });
  });

  describe('sortValue + compareRows', () => {
    it('ranks criticality by impact', () => {
      expect(CRIT_RANK.extreme_impact).toBeGreaterThan(CRIT_RANK.high_impact);
      expect(sortValue(makeRow({ criticality: 'extreme_impact' }), 'criticality', 'w1')).toBe(4);
      expect(sortValue(makeRow({ criticality: undefined }), 'criticality', 'w1')).toBe(0);
    });
    it('sorts rows descending by risk', () => {
      const rows = [makeRow({ risk: 10 }), makeRow({ risk: 90 }), makeRow({ risk: 50 })];
      const sorted = [...rows].sort((a, b) => compareRows(a, b, { col: 'risk', dir: -1 }, 'w1'));
      expect(sorted.map((r) => r.risk)).toEqual([90, 50, 10]);
    });
    it('sorts by name ascending', () => {
      const rows = [makeRow(), makeRow(), makeRow()];
      rows[0].base.name = 'charlie';
      rows[1].base.name = 'alpha';
      rows[2].base.name = 'bravo';
      const sorted = [...rows].sort((a, b) => compareRows(a, b, { col: 'name', dir: 1 }, 'w1'));
      expect(sorted.map((r) => r.base.name)).toEqual(['alpha', 'bravo', 'charlie']);
    });
  });

  describe('selectVisibleRows', () => {
    it('filters + sorts in one pass', () => {
      const rows = [
        makeRow({ identifierValue: 'a', risk: 95, level: 'Critical' }),
        makeRow({ identifierValue: 'b', risk: 30, level: 'Low' }),
        makeRow({ identifierValue: 'c', risk: 80, level: 'High' }),
      ];
      const out = selectVisibleRows(
        rows,
        emptySnapshot({ tileFilter: 'highrisk' }),
        '',
        { col: 'risk', dir: -1 },
        'w1',
        NOW
      );
      expect(out.map((r) => r.risk)).toEqual([95, 80]);
    });
  });

  describe('snapshot equality / active', () => {
    it('detects equal snapshots regardless of set order', () => {
      const a: FilterSnapshot = emptySnapshot({ levels: ['High', 'Low'], crits: ['high_impact'] });
      const b: FilterSnapshot = emptySnapshot({ crits: ['high_impact'], levels: ['Low', 'High'] });
      expect(snapshotsEqual(a, b)).toBe(true);
    });
    it('detects difference', () => {
      expect(snapshotsEqual(emptySnapshot({ type: 'host' }), emptySnapshot())).toBe(false);
    });
    it('snapshotIsActive is false for empty', () => {
      expect(snapshotIsActive(emptySnapshot())).toBe(false);
      expect(snapshotIsActive(emptySnapshot({ rule: 'x' }))).toBe(true);
    });
  });

  describe('column preferences', () => {
    it('loads defaults when nothing persisted', () => {
      const prefs = parseColumnPrefs(null);
      expect(prefs.order).toEqual(DEFAULT_ORDER);
      expect(prefs.vis).toEqual(defaultVisible());
    });
    it('rejects stale order length', () => {
      const prefs = parseColumnPrefs(JSON.stringify({ order: ['risk'], vis: ['risk'] }));
      expect(prefs.order).toEqual(DEFAULT_ORDER);
    });
    it('round-trips valid prefs', () => {
      const original = {
        order: [...DEFAULT_ORDER].reverse(),
        vis: ['risk' as const, 'alerts' as const],
      };
      const prefs = parseColumnPrefs(serializeColumnPrefs(original));
      expect(prefs.order).toEqual(original.order);
      expect(prefs.vis).toEqual(['risk', 'alerts']);
    });
    it('handles malformed JSON', () => {
      expect(parseColumnPrefs('{not json')).toEqual({
        order: DEFAULT_ORDER,
        vis: defaultVisible(),
      });
    });
    it('activeColumns pins Name first', () => {
      const cols = activeColumns({ order: [...DEFAULT_ORDER], vis: ['risk', 'alerts'] });
      expect(cols[0].id).toBe('name');
      expect(cols.map((c) => c.id)).toEqual(['name', 'risk', 'alerts']);
    });
    it('reorderColumns moves before/after target', () => {
      const order = ['risk', 'alerts', 'cases'] as const;
      expect(reorderColumns([...order], 'cases', 'risk', true)).toEqual([
        'cases',
        'risk',
        'alerts',
      ]);
      expect(reorderColumns([...order], 'risk', 'cases', false)).toEqual([
        'alerts',
        'cases',
        'risk',
      ]);
      expect(reorderColumns([...order], 'risk', 'risk', true)).toEqual(['risk', 'alerts', 'cases']);
    });
  });

  describe('saved filter groups', () => {
    it('provides builtin groups', () => {
      const groups = builtinSavedGroups();
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.every((g) => g.builtin)).toBe(true);
    });
    it('parses persisted user groups and marks them non-builtin', () => {
      const raw = JSON.stringify([
        { id: 'x', name: 'Mine', builtin: true, snap: { type: 'host' } },
      ]);
      const groups = parseSavedGroups(raw);
      expect(groups).toHaveLength(1);
      expect(groups[0].builtin).toBe(false);
      expect(groups[0].snap.type).toBe('host');
    });
    it('ignores malformed persisted groups', () => {
      expect(parseSavedGroups('not json')).toEqual([]);
      expect(parseSavedGroups(JSON.stringify([{ nope: true }]))).toEqual([]);
    });
    it('serializeSavedGroups drops builtins', () => {
      const groups = [
        ...builtinSavedGroups(),
        { id: 'mine', name: 'Mine', builtin: false, snap: emptySnapshot({ type: 'host' }) },
      ];
      const parsed = JSON.parse(serializeSavedGroups(groups));
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('mine');
    });
    it('savedGroupCount counts matching rows', () => {
      const rows = [makeRow({ type: EntityType.host }), makeRow({ type: EntityType.user })];
      const group = {
        id: 'g',
        name: 'Hosts',
        builtin: false,
        snap: emptySnapshot({ type: 'host' }),
      };
      expect(savedGroupCount(group, rows, 'w1', NOW)).toBe(1);
    });
  });
});
