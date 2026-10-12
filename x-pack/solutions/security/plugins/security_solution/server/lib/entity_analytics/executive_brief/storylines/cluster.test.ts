/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_STORYLINE_ENTITIES,
  MAX_STORYLINES,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { StoryResponse } from '../../../../../common/entity_analytics/executive_brief/types';
import {
  clusterStorylines,
  deriveResponseState,
  detectHubs,
  formComponents,
  normalizeEdges,
  rankComponents,
  severityFromScore,
} from './cluster';
import type { ClusterEdge, ClusterSeed, StorylineComponent } from './types';
import {
  EUID,
  FIXTURE_NOW,
  NOISE_HOST,
  NOISE_USER_2,
  SCENARIO_EDGES,
  SCENARIO_FACTS,
  SCENARIO_RESPONSES,
  SCENARIO_SEEDS,
  day,
  facts,
  scenarioInput,
  shuffled,
} from './__fixtures__/cluster_scenarios';

const NONE: StoryResponse = {
  state: 'unaddressed',
  cases: [],
  alerts: { open: 1, acknowledged: 0, closed: 0 },
};

const responseFromScenario = (component: StorylineComponent): StoryResponse =>
  component.entityEuids.map((euid) => SCENARIO_RESPONSES[euid]).find(Boolean) ?? NONE;

const edge = (
  type: ClusterEdge['type'],
  from: string,
  to: string,
  refKeys: string[] = []
): ClusterEdge => ({ type, from, to, refKeys });

const seed = (
  kind: ClusterSeed['kind'],
  refKey: string,
  entityEuids: string[],
  severity = 0.8,
  at = day(-1)
): ClusterSeed => ({ kind, refKey, entityEuids, severity, at });

const hostFacts = (euids: string[]) =>
  facts(euids.map((euid) => ({ euid, type: 'host' as const })));

describe('executive brief storyline clustering', () => {
  describe('S1-S3 plus noise', () => {
    const result = clusterStorylines(scenarioInput(), responseFromScenario);

    it('S1 is one storyline holding its four entities, ranked first', () => {
      const [first] = result.storylines;
      expect(first.rank).toBe(1);
      expect(first.entityEuids).toHaveLength(4);
      expect(new Set(first.entityEuids)).toEqual(
        new Set([EUID.rodriguez, EUID.laptopFin, EUID.jumpBox, EUID.prodHost])
      );
      expect(first.severity).toBe('critical');
      expect(first.linkStrength).toBe('strong');
      expect(first.response.state).toBe('unaddressed');
      expect(first.seeds.map((s) => s.kind)).toEqual(['lead', 'attack_discovery', 'material_risk']);
    });

    it('S2 (response in progress) is found and ranks below S1', () => {
      const s2 = result.storylines.find((s) => s.entityEuids.includes(EUID.chen));
      expect(s2).toBeDefined();
      expect(new Set(s2?.entityEuids)).toEqual(new Set([EUID.chen, EUID.laptopMkt]));
      expect(s2?.response.state).toBe('in_progress');
      expect(s2?.rank).toBeGreaterThan(1);
    });

    it('S3 is found without any Attack Discovery, with the file server attached', () => {
      const s3 = result.storylines.find((s) => s.entityEuids.includes(EUID.buildRunner));
      expect(s3).toBeDefined();
      expect(new Set(s3?.entityEuids)).toEqual(
        new Set([EUID.buildRunner, EUID.svcBuild, EUID.fileServer])
      );
      expect(s3?.seeds.map((s) => s.kind)).toEqual(['risk_mover']);
      expect(s3?.linkStrength).toBe('strong'); // merged by a co_alert edge
    });

    it('noise forms no storyline and is listed as other notable, never dropped silently', () => {
      expect(result.storylines).toHaveLength(3);
      const placed = result.storylines.flatMap((s) => [...s.entityEuids, ...s.hubEuids]);
      expect(placed).not.toContain(EUID.noiseUser);
      expect(placed).not.toContain(NOISE_HOST);
      expect(result.otherNotableEntities).toEqual([EUID.noiseUser, NOISE_USER_2]);
      expect(
        result.trace.filter((step) => step.action === 'drop_rank').map((step) => step.detail)
      ).toEqual([
        `${EUID.noiseUser} has no mergeable links; listed as other notable`,
        `${NOISE_USER_2} has no mergeable links; listed as other notable`,
      ]);
    });

    it('keeps the domain controller as a hub of S1 and S3 but never as a bridge', () => {
      const s1 = result.storylines.find((s) => s.entityEuids.includes(EUID.rodriguez));
      const s3 = result.storylines.find((s) => s.entityEuids.includes(EUID.buildRunner));
      expect(s1).not.toBe(s3);
      expect(s1?.hubEuids).toEqual([EUID.dc]);
      expect(s3?.hubEuids).toEqual([EUID.dc]);
      for (const storyline of result.storylines) {
        expect(storyline.entityEuids).not.toContain(EUID.dc);
      }
      expect(s1?.entityEuids).not.toContain(EUID.svcBuild);
      expect(s3?.entityEuids).not.toContain(EUID.rodriguez);
      expect(
        result.trace.some((step) => step.action === 'skip_hub' && step.detail.includes(EUID.dc))
      ).toBe(true);
    });

    it('only emits edges whose endpoints are both in the storyline (or its hubs)', () => {
      for (const storyline of result.storylines) {
        const visible = new Set([...storyline.entityEuids, ...storyline.hubEuids]);
        for (const e of storyline.edges) {
          expect(visible.has(e.from)).toBe(true);
          expect(visible.has(e.to)).toBe(true);
        }
      }
    });

    it('would merge S1 and S3 if the hub guard were not applied (control)', () => {
      // Same topology, but DC01 is a plain host with no degree: it is a non-hub intermediate.
      const control = clusterStorylines(
        scenarioInput({
          facts: {
            ...SCENARIO_FACTS,
            [EUID.dc]: { euid: EUID.dc, type: 'host', riskScoreNorm: 30 },
          },
        }),
        responseFromScenario
      );
      const merged = control.storylines.find((s) => s.entityEuids.includes(EUID.rodriguez));
      expect(merged?.entityEuids).toEqual(expect.arrayContaining([EUID.rodriguez, EUID.svcBuild]));
    });
  });

  describe('hub guard', () => {
    it('flags by degree above max(15, P95)', () => {
      const partners = Array.from({ length: 16 }, (_, i) => `host:p${i}`);
      const edges = partners.map((p) => edge('co_alert', 'host:big', p));
      const { hubs, threshold } = detectHubs(edges, hostFacts(['host:big', ...partners]));
      expect(threshold).toBe(15);
      expect([...hubs]).toEqual(['host:big']);
    });

    it('does not flag at exactly the threshold', () => {
      const partners = Array.from({ length: 15 }, (_, i) => `host:p${i}`);
      const edges = partners.map((p) => edge('co_alert', 'host:big', p));
      expect(detectHubs(edges, hostFacts(['host:big', ...partners])).hubs.size).toBe(0);
    });

    it('adds interaction in-degree to the co-alert partners', () => {
      const result = detectHubs(
        [edge('co_alert', 'host:a', 'host:b')],
        facts([
          { euid: 'host:a', type: 'host', interactionDegree: 15 },
          { euid: 'host:b', type: 'host', interactionDegree: 14 },
        ])
      );
      expect([...result.hubs]).toEqual(['host:a']); // 15 + 1 partner = 16 > 15; b = 15
    });

    it('uses an interpolated P95 of a large batch when it exceeds the minimum', () => {
      const nodes = Array.from({ length: 40 }, (_, i) => ({
        euid: `host:n${String(i).padStart(2, '0')}`,
        type: 'host' as const,
        interactionDegree: i < 38 ? 30 : 100,
      }));
      const { hubs, threshold } = detectHubs([], facts(nodes));
      expect(threshold).toBeCloseTo(33.5, 5); // 30 + 0.05 x (100 - 30)
      expect([...hubs].sort()).toEqual(['host:n38', 'host:n39']);
    });

    it('treats an extreme-criticality host with degree > 10 as a hub, and = 10 as not', () => {
      const dc = (interactionDegree: number) =>
        detectHubs(
          [],
          facts([
            { euid: 'host:dc', type: 'host', criticality: 'extreme_impact', interactionDegree },
          ])
        ).hubs.has('host:dc');
      expect(dc(11)).toBe(true);
      expect(dc(10)).toBe(false);
    });

    it('does not apply the extreme rule to users or to lower criticality', () => {
      expect(
        detectHubs(
          [],
          facts([
            { euid: 'user:u', type: 'user', criticality: 'extreme_impact', interactionDegree: 12 },
            { euid: 'host:h', type: 'host', criticality: 'high_impact', interactionDegree: 12 },
          ])
        ).hubs.size
      ).toBe(0);
    });

    it('treats managed identities as hubs regardless of degree', () => {
      expect(
        detectHubs([], facts([{ euid: 'user:svc', type: 'user', isManaged: true }])).hubs.has(
          'user:svc'
        )
      ).toBe(true);
    });

    it('attaches a hub that is a member of an Attack Discovery without unioning through it', () => {
      const a = 'user:a';
      const b = 'host:b';
      const c = 'user:c';
      const d = 'host:d';
      const hub = 'host:hub';
      const result = clusterStorylines(
        {
          seeds: [
            seed('attack_discovery', 'ad:1', [a, b, hub]),
            seed('attack_discovery', 'ad:2', [c, d, hub]),
          ],
          edges: [],
          facts: facts([
            { euid: a, type: 'user' },
            { euid: b, type: 'host' },
            { euid: c, type: 'user' },
            { euid: d, type: 'host' },
            { euid: hub, type: 'host', criticality: 'extreme_impact', interactionDegree: 40 },
          ]),
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(2);
      for (const storyline of result.storylines) {
        expect(storyline.hubEuids).toEqual([hub]);
        expect(storyline.entityEuids).not.toContain(hub);
      }
      expect(result.trace.some((step) => step.action === 'skip_hub')).toBe(true);
    });

    it('lists a seed made only of hubs as other notable', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('material_risk', 'ent:dc', [EUID.dc])],
          edges: [],
          facts: SCENARIO_FACTS,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toEqual([]);
      expect(result.otherNotableEntities).toEqual([EUID.dc]);
    });
  });

  describe('union-find rules', () => {
    const sevenFacts = hostFacts(['host:a', 'host:b', 'host:x', 'host:y', 'host:m', 'host:n']);

    it('bridges two seeds through exactly one non-hub intermediate (seed-X-seed)', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('risk_mover', 'ent:a', ['host:a']), seed('risk_mover', 'ent:b', ['host:b'])],
          edges: [edge('co_alert', 'host:a', 'host:x'), edge('co_alert', 'host:x', 'host:b')],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(1);
      expect(new Set(result.storylines[0].entityEuids)).toEqual(
        new Set(['host:a', 'host:b', 'host:x'])
      );
    });

    it('does not bridge through two intermediates (seed-X-Y-seed)', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('risk_mover', 'ent:a', ['host:a']), seed('risk_mover', 'ent:b', ['host:b'])],
          edges: [
            edge('co_alert', 'host:a', 'host:x'),
            edge('co_alert', 'host:x', 'host:y'),
            edge('co_alert', 'host:y', 'host:b'),
          ],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      // Two storylines (a+x and b+y), neither contains the other seed.
      expect(result.storylines).toHaveLength(2);
      const sets = result.storylines.map((s) => new Set(s.entityEuids));
      expect(sets).toContainEqual(new Set(['host:a', 'host:x']));
      expect(sets).toContainEqual(new Set(['host:b', 'host:y']));
    });

    it('merges seeds that share a golden entity', () => {
      const result = clusterStorylines(
        {
          seeds: [
            seed('attack_discovery', 'ad:1', ['host:a', 'host:b']),
            seed('lead', 'lead:1', ['host:b']),
            seed('attack_discovery', 'ad:2', ['host:b', 'host:x']),
          ],
          edges: [],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(1);
      expect(result.storylines[0].entityEuids).toHaveLength(3);
      expect(result.storylines[0].seeds).toHaveLength(3);
    });

    it('never merges on attach-only edges (accesses_frequently, communicates_with, lead_related)', () => {
      const result = clusterStorylines(
        {
          seeds: [
            seed('attack_discovery', 'ad:1', ['host:a']),
            seed('attack_discovery', 'ad:2', ['host:b']),
          ],
          edges: [
            edge('accesses_frequently', 'host:a', 'host:b'),
            edge('communicates_with', 'host:a', 'host:b'),
            edge('lead_related', 'host:a', 'host:b'),
          ],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(2);
      expect(result.storylines.every((s) => s.linkStrength === 'weak')).toBe(true);
    });

    it('never merges on context edges and does not attach by them', () => {
      const result = clusterStorylines(
        {
          seeds: [
            seed('attack_discovery', 'ad:1', ['host:a']),
            seed('attack_discovery', 'ad:2', ['host:b']),
          ],
          edges: [edge('supervises', 'host:a', 'host:b'), edge('supervises', 'host:a', 'host:m')],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(2);
      expect(result.storylines.flatMap((s) => s.entityEuids)).not.toContain('host:m');
    });

    it('attaches an outside entity to the strongest component, ties to the smaller key', () => {
      const attached = (edges: ClusterEdge[]) =>
        clusterStorylines(
          {
            seeds: [
              seed('attack_discovery', 'ad:1', ['host:a']),
              seed('attack_discovery', 'ad:2', ['host:b']),
            ],
            edges,
            facts: sevenFacts,
            now: FIXTURE_NOW,
          },
          () => NONE
        ).storylines.find((s) => s.entityEuids.includes('host:m'))?.entityEuids;

      expect(
        attached([
          edge('communicates_with', 'host:a', 'host:m'),
          edge('lead_related', 'host:b', 'host:m'),
        ])
      ).toContain('host:b'); // lead_related 0.4 beats communicates_with 0.3
      expect(
        attached([
          edge('communicates_with', 'host:b', 'host:m'),
          edge('communicates_with', 'host:a', 'host:m'),
        ])
      ).toContain('host:a'); // equal weight: smaller component key
    });

    it('does not turn a lone seed into a storyline because of attach-only neighbours (noise)', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('material_risk', 'ent:a', ['host:a'], 0.7)],
          edges: [
            edge('accesses_frequently', 'host:a', 'host:m'),
            edge('communicates_with', 'host:a', 'host:n'),
          ],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toEqual([]);
      expect(result.otherNotableEntities).toEqual(['host:a']);
    });

    it('a lone Attack Discovery entity is still a (weak, explicit) storyline', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('attack_discovery', 'ad:1', ['host:a'])],
          edges: [],
          facts: sevenFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(1);
      expect(result.storylines[0].linkStrength).toBe('weak');
    });

    it('pulls a non-seed neighbour in through a merge edge and marks relationship links moderate', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('risk_mover', 'ent:a', ['user:a'])],
          edges: [edge('owns', 'user:a', 'host:x')],
          facts: facts([
            { euid: 'user:a', type: 'user' },
            { euid: 'host:x', type: 'host' },
          ]),
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(1);
      expect(result.storylines[0].entityEuids).toEqual(['user:a', 'host:x']);
      expect(result.storylines[0].linkStrength).toBe('moderate');
    });
  });

  describe('Defend-only topology (host-scoped local users, no IdP, no resolution)', () => {
    const localA = 'user:alice@host-a@local';
    const localB = 'user:alice@host-b@local';
    const defendFacts = facts([
      { euid: localA, type: 'user' },
      { euid: localB, type: 'user' },
      { euid: 'host:host-a', type: 'host' },
      { euid: 'host:host-b', type: 'host' },
    ]);
    const selfEdges = [
      edge('accesses_frequently', localA, 'host:host-a'),
      edge('accesses_frequently', localB, 'host:host-b'),
    ];

    it('produces a thin but valid storyline from a discovery alone', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('attack_discovery', 'ad:1', [localA, 'host:host-a', 'host:host-b'])],
          edges: selfEdges,
          facts: defendFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toHaveLength(1);
      const [storyline] = result.storylines;
      expect(storyline.linkStrength).toBe('strong');
      expect(storyline.edges.map((e) => e.type)).toEqual(
        expect.arrayContaining(['same_ad', 'accesses_frequently'])
      );
      expect(storyline.edges.every((e) => e.type !== 'owns')).toBe(true);
    });

    it('does not link two hosts through per-host local users that are not resolved', () => {
      const result = clusterStorylines(
        {
          seeds: [
            seed('material_risk', 'ent:a', ['host:host-a']),
            seed('material_risk', 'ent:b', ['host:host-b']),
          ],
          edges: selfEdges,
          facts: defendFacts,
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toEqual([]);
      expect(result.otherNotableEntities).toEqual(['host:host-a', 'host:host-b']);
    });
  });

  describe('empty and degenerate input', () => {
    it('returns nothing without seeds, even with edges', () => {
      const result = clusterStorylines(
        { seeds: [], edges: SCENARIO_EDGES, facts: SCENARIO_FACTS, now: FIXTURE_NOW },
        () => NONE
      );
      expect(result).toEqual({ storylines: [], otherNotableEntities: [], trace: [] });
    });

    it('ignores seeds with no entities and self-referencing edges', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('lead', 'lead:empty', [])],
          edges: [edge('co_alert', 'host:a', 'host:a')],
          facts: {},
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines).toEqual([]);
      expect(result.otherNotableEntities).toEqual([]);
    });

    it('handles entities with no facts', () => {
      const result = clusterStorylines(
        {
          seeds: [seed('attack_discovery', 'ad:1', ['user:a', 'host:b'])],
          edges: [],
          facts: {},
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(result.storylines[0].entityEuids).toEqual(['user:a', 'host:b']); // users first
    });
  });

  describe('caps', () => {
    it('keeps at most MAX_STORYLINE_ENTITIES, seeds first, and lists dropped seed entities', () => {
      const members = Array.from({ length: 12 }, (_, i) => `host:m${String(i).padStart(2, '0')}`);
      const result = clusterStorylines(
        {
          seeds: [seed('attack_discovery', 'ad:1', members)],
          edges: [],
          facts: hostFacts(members),
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      const [storyline] = result.storylines;
      expect(storyline.entityEuids).toHaveLength(MAX_STORYLINE_ENTITIES);
      expect(result.otherNotableEntities).toHaveLength(12 - MAX_STORYLINE_ENTITIES);
      expect(result.trace.some((step) => step.action === 'cap_entities')).toBe(true);
      expect(new Set([...storyline.entityEuids, ...result.otherNotableEntities])).toEqual(
        new Set(members)
      );
    });

    it('prefers seed entities over attached ones when capping, then edge weight x significance', () => {
      const attached = Array.from({ length: 8 }, (_, i) => `host:t${i}`);
      const result = clusterStorylines(
        {
          seeds: [seed('attack_discovery', 'ad:1', ['user:a', 'host:s1'])],
          edges: attached.map((t, i) =>
            edge(i < 4 ? 'lead_related' : 'communicates_with', 'user:a', t)
          ),
          facts: facts([
            { euid: 'user:a', type: 'user' },
            { euid: 'host:s1', type: 'host' },
            ...attached.map((t) => ({ euid: t, type: 'host' as const })),
          ]),
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      const { entityEuids } = result.storylines[0];
      expect(entityEuids.slice(0, 2)).toEqual(['user:a', 'host:s1']); // users first on ties
      // 6 attached slots: the four 0.4-weight lead_related ones come first.
      expect(entityEuids.slice(2, 6).sort()).toEqual(['host:t0', 'host:t1', 'host:t2', 'host:t3']);
      expect(entityEuids).toHaveLength(8);
    });

    it('keeps the top MAX_STORYLINES and reports the rest as other notable, with a trace', () => {
      const seeds = Array.from({ length: 5 }, (_, i) =>
        seed('attack_discovery', `ad:${i}`, [`user:u${i}`, `host:h${i}`], 0.5 + i * 0.1)
      );
      const result = clusterStorylines(
        { seeds, edges: [], facts: {}, now: FIXTURE_NOW },
        () => NONE
      );
      expect(result.storylines).toHaveLength(MAX_STORYLINES);
      expect(result.storylines.map((s) => s.rank)).toEqual([1, 2, 3]);
      expect(result.storylines[0].entityEuids).toContain('user:u4');
      expect(result.otherNotableEntities.sort()).toEqual([
        'host:h0',
        'host:h1',
        'user:u0',
        'user:u1',
      ]);
      expect(result.trace.filter((s) => s.detail.includes('beyond the top 3'))).toHaveLength(2);
    });
  });

  describe('ranking', () => {
    const two = (aAt: string, bAt: string, responseB: StoryResponse = NONE) =>
      clusterStorylines(
        {
          seeds: [
            seed('attack_discovery', 'ad:a', ['user:a', 'host:a'], 0.8, aAt),
            seed('attack_discovery', 'ad:b', ['user:b', 'host:b'], 0.8, bAt),
          ],
          edges: [],
          facts: {},
          now: FIXTURE_NOW,
        },
        (component) => (component.entityEuids.includes('user:b') ? responseB : NONE)
      );

    it('prefers the more recent storyline when everything else is equal', () => {
      const result = two(day(-5), day(-1));
      expect(result.storylines[0].entityEuids).toContain('user:b');
    });

    it('halves the score of a contained storyline', () => {
      const contained: StoryResponse = {
        state: 'contained',
        cases: [],
        alerts: { open: 0, acknowledged: 0, closed: 4 },
      };
      const open = two(day(-1), day(-1));
      const handled = two(day(-1), day(-1), contained);
      const scoreB = (r: typeof open) =>
        r.storylines.find((s) => s.entityEuids.includes('user:b'))?.score;
      expect(scoreB(handled)).toBeCloseTo((scoreB(open) ?? 0) / 2, 2);
      expect(handled.storylines[0].entityEuids).toContain('user:a');
    });

    it('does not discount an in-progress storyline', () => {
      const inProgress: StoryResponse = {
        state: 'in_progress',
        cases: [],
        alerts: { open: 0, acknowledged: 3, closed: 0 },
      };
      const base = two(day(-1), day(-1));
      const handled = two(day(-1), day(-1), inProgress);
      expect(handled.storylines.map((s) => s.score)).toEqual(base.storylines.map((s) => s.score));
    });

    it('multiplies criticality, corroboration (capped) and uses e^(-age/7) recency', () => {
      const result = clusterStorylines(
        {
          seeds: [
            seed('attack_discovery', 'ad:1', ['user:a', 'host:a'], 1, FIXTURE_NOW),
            seed('lead', 'lead:1', ['user:a'], 1, FIXTURE_NOW),
            seed('material_risk', 'ent:a', ['host:a'], 1, FIXTURE_NOW),
            seed('risk_mover', 'ent:b', ['user:a'], 1, FIXTURE_NOW),
          ],
          edges: [],
          facts: facts([
            { euid: 'user:a', type: 'user' },
            { euid: 'host:a', type: 'host', criticality: 'extreme_impact' },
          ]),
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      // severity 1 x 1.5 x e^0 x (1 + min(0.3, 0.1 x 3)) = 1.95
      expect(result.storylines[0].score).toBe(1.95);

      const aged = clusterStorylines(
        {
          seeds: [seed('attack_discovery', 'ad:1', ['user:a', 'host:a'], 1, day(-7, 12))],
          edges: [],
          facts: {},
          now: FIXTURE_NOW,
        },
        () => NONE
      );
      expect(aged.storylines[0].score).toBeCloseTo(Math.exp(-1), 3);
    });

    it.each([
      [0.95, 'critical'],
      [0.9, 'critical'],
      [0.89, 'high'],
      [0.7, 'high'],
      [0.69, 'medium'],
      [0.4, 'medium'],
      [0.39, 'low'],
    ])('maps severity %s to %s', (value, expected) => {
      expect(severityFromScore(value)).toBe(expected);
    });

    it('lifts storyline severity with the criticality of its members', () => {
      const run = (criticality: string) =>
        clusterStorylines(
          {
            seeds: [seed('attack_discovery', 'ad:1', ['user:a', 'host:a'], 0.5)],
            edges: [],
            facts: facts([
              { euid: 'user:a', type: 'user' },
              { euid: 'host:a', type: 'host', criticality },
            ]),
            now: FIXTURE_NOW,
          },
          () => NONE
        ).storylines[0].severity;
      expect(run('medium_impact')).toBe('medium');
      expect(run('extreme_impact')).toBe('high'); // 0.5 x 1.5 = 0.75
    });
  });

  describe('determinism', () => {
    it('produces identical output for shuffled seeds, edges and facts', () => {
      const baseline = clusterStorylines(scenarioInput(), responseFromScenario);
      for (let attempt = 1; attempt <= 25; attempt++) {
        const shuffledFacts = Object.fromEntries(shuffled(Object.entries(SCENARIO_FACTS), attempt));
        const result = clusterStorylines(
          scenarioInput({
            seeds: shuffled(SCENARIO_SEEDS, attempt).map((s) => ({
              ...s,
              entityEuids: shuffled(s.entityEuids, attempt + 100),
            })),
            edges: shuffled(SCENARIO_EDGES, attempt + 200).map((e) =>
              // Flip symmetric edges: orientation must be normalised.
              e.type === 'co_alert' && attempt % 2 === 0 ? { ...e, from: e.to, to: e.from } : e
            ),
            facts: shuffledFacts,
          }),
          responseFromScenario
        );
        expect(result).toEqual(baseline);
      }
    });

    it('is stable across repeated runs', () => {
      expect(clusterStorylines(scenarioInput(), responseFromScenario)).toEqual(
        clusterStorylines(scenarioInput(), responseFromScenario)
      );
    });

    it('breaks equal scores by component key', () => {
      const seeds = [
        seed('attack_discovery', 'ad:z', ['user:z', 'host:z']),
        seed('attack_discovery', 'ad:a', ['user:a', 'host:a']),
      ];
      const result = clusterStorylines(
        { seeds, edges: [], facts: {}, now: FIXTURE_NOW },
        () => NONE
      );
      expect(result.storylines.map((s) => s.key)).toEqual(['host:a', 'host:z']);
    });
  });

  describe('edge normalisation', () => {
    it('orients symmetric edges, drops self loops, merges evidence and sorts', () => {
      const normalized = normalizeEdges([
        edge('co_alert', 'host:b', 'host:a', ['rule:2']),
        edge('co_alert', 'host:a', 'host:b', ['rule:1']),
        edge('co_alert', 'host:a', 'host:a', ['rule:x']),
        edge('owns', 'user:u', 'host:a'),
        edge('owns', 'host:a', 'user:u'),
      ]);
      expect(normalized).toEqual([
        { type: 'co_alert', from: 'host:a', to: 'host:b', refKeys: ['rule:1', 'rule:2'] },
        { type: 'owns', from: 'host:a', to: 'user:u', refKeys: [] },
        { type: 'owns', from: 'user:u', to: 'host:a', refKeys: [] },
      ]);
    });
  });

  describe('response state derivation', () => {
    const c = (status: 'open' | 'in-progress' | 'closed') => ({
      evidenceId: 'CASE-1' as const,
      caseId: 'c',
      title: 't',
      status,
    });
    it.each([
      [{ open: 3, acknowledged: 0, closed: 0 }, [], 'unaddressed'],
      [{ open: 0, acknowledged: 0, closed: 0 }, [], 'unaddressed'],
      [{ open: 3, acknowledged: 2, closed: 0 }, [], 'in_progress'],
      [{ open: 3, acknowledged: 0, closed: 0 }, [c('open')], 'in_progress'],
      [{ open: 3, acknowledged: 0, closed: 0 }, [c('in-progress')], 'in_progress'],
      [{ open: 0, acknowledged: 0, closed: 5 }, [], 'contained'],
      [{ open: 0, acknowledged: 0, closed: 5 }, [c('closed')], 'contained'],
      [{ open: 0, acknowledged: 0, closed: 5 }, [c('open')], 'in_progress'],
      [{ open: 1, acknowledged: 0, closed: 4 }, [c('closed')], 'unaddressed'],
    ] as const)('alerts %j cases %j -> %s', (alerts, cases, expected) => {
      expect(deriveResponseState({ ...alerts }, [...cases])).toBe(expected);
    });
  });

  describe('two-phase API', () => {
    it('defaults a missing response to unaddressed with zero counts', () => {
      const formed = formComponents(scenarioInput());
      const ranked = rankComponents(formed, {}, FIXTURE_NOW);
      expect(ranked.storylines.every((s) => s.response.state === 'unaddressed')).toBe(true);
      expect(ranked.storylines[0].response.alerts).toEqual({ open: 0, acknowledged: 0, closed: 0 });
    });
  });
});
