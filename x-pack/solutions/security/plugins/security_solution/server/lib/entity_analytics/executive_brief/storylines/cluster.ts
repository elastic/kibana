/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTAINED_RESPONSE_FACTOR,
  CORROBORATION_MAX,
  CORROBORATION_STEP,
  CRITICALITY_MULTIPLIER,
  HUB_EXTREME_CRITICALITY_MIN_DEGREE,
  HUB_MIN_DEGREE,
  MAX_SEEDS_PER_KIND,
  MAX_STORYLINE_ENTITIES,
  MAX_STORYLINES,
  RECENCY_HALF_LIFE_DAYS,
  STORY_EDGE_CONFIG,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefSeverity,
  ClusterTraceStep,
  LinkStrength,
  SeedKind,
  StoryEdgeType,
  StoryResponse,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type {
  ClusterEdge,
  ClusterEntityFacts,
  ClusterInput,
  ClusterResult,
  ClusterSeed,
  ComponentsResult,
  RankedStoryline,
  StorylineComponent,
} from './types';

/**
 * Pure, deterministic storyline clustering (PLAN §3.8, investigation 10 §10.2).
 *
 * Input order never matters: seeds, edges and entities are sorted before use, unions always pick
 * the lexicographically smallest root, and every cap and tie-break ends in the golden euid.
 */

const MAX_TRACE_STEPS = 200;
const MAX_HUBS_PER_STORYLINE = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEVERITY_CRITICAL = 0.9;
const SEVERITY_HIGH = 0.7;
const SEVERITY_MEDIUM = 0.4;
const EXTREME_CRITICALITY = 'extreme_impact';
const MIN_SIGNIFICANCE = 0.1;
const CRITICALITY_SIGNIFICANCE: Record<string, number> = {
  extreme_impact: 1,
  high_impact: 0.75,
  medium_impact: 0.5,
  low_impact: 0.25,
};

const SEED_KIND_ORDER: Record<SeedKind, number> = {
  attack_discovery: 0,
  lead: 1,
  material_risk: 2,
  risk_mover: 3,
};

const EDGE_TYPE_ORDER: Record<string, number> = Object.fromEntries(
  Object.keys(STORY_EDGE_CONFIG).map((type, index) => [type, index])
);

const SYMMETRIC_EDGE_TYPES: ReadonlySet<StoryEdgeType> = new Set<StoryEdgeType>([
  'same_ad',
  'co_alert',
]);

const TYPE_ORDER: Record<string, number> = { user: 0, host: 1, service: 2, generic: 3 };

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const uniqueSorted = (values: Iterable<string>): string[] => [...new Set(values)].sort(compare);
const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

// ---------------------------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------------------------

export const normalizeSeeds = (seeds: ClusterSeed[]): ClusterSeed[] => {
  const byKey = new Map<string, ClusterSeed>();
  for (const seed of seeds) {
    const key = `${seed.kind}|${seed.refKey}`;
    const entityEuids = uniqueSorted(seed.entityEuids);
    const existing = byKey.get(key);
    byKey.set(
      key,
      existing
        ? {
            ...existing,
            entityEuids: uniqueSorted([...existing.entityEuids, ...entityEuids]),
            severity: Math.max(existing.severity, seed.severity),
            at: existing.at > seed.at ? existing.at : seed.at,
          }
        : { ...seed, entityEuids }
    );
  }
  return [...byKey.values()]
    .filter((seed) => seed.entityEuids.length > 0)
    .sort(
      (a, b) =>
        SEED_KIND_ORDER[a.kind] - SEED_KIND_ORDER[b.kind] ||
        b.severity - a.severity ||
        compare(a.refKey, b.refKey)
    );
};

const edgeWeight = (type: StoryEdgeType): number => STORY_EDGE_CONFIG[type].weight;

/**
 * Orients symmetric edges, drops self loops, de-duplicates by (type, from, to) merging their
 * evidence keys, and sorts into the fixed processing order: weight desc, type, from, to.
 */
export const normalizeEdges = (edges: ClusterEdge[]): ClusterEdge[] => {
  const byKey = new Map<string, ClusterEdge>();
  for (const edge of edges.filter((candidate) => candidate.from !== candidate.to)) {
    const swap = SYMMETRIC_EDGE_TYPES.has(edge.type) && edge.from > edge.to;
    const from = swap ? edge.to : edge.from;
    const to = swap ? edge.from : edge.to;
    const key = `${edge.type}|${from}|${to}`;
    const existing = byKey.get(key);
    byKey.set(key, {
      type: edge.type,
      from,
      to,
      refKeys: uniqueSorted([...(existing?.refKeys ?? []), ...edge.refKeys]),
    });
  }
  return [...byKey.values()].sort(
    (a, b) =>
      edgeWeight(b.type) - edgeWeight(a.type) ||
      EDGE_TYPE_ORDER[a.type] - EDGE_TYPE_ORDER[b.type] ||
      compare(a.from, b.from) ||
      compare(a.to, b.to)
  );
};

// ---------------------------------------------------------------------------------------------
// Hub guard
// ---------------------------------------------------------------------------------------------

/**
 * Linear-interpolated percentile (type 7). Nearest-rank would make the maximum its own P95 in any
 * batch under 20 entities, so a lone extreme outlier could never exceed it.
 */
const percentile = (sortedAscending: number[], fraction: number): number => {
  if (sortedAscending.length === 0) {
    return 0;
  }
  const position = fraction * (sortedAscending.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return (
    sortedAscending[lower] + (position - lower) * (sortedAscending[upper] - sortedAscending[lower])
  );
};

/** Distinct co-alert partners plus interaction in-degree, per entity. */
export const computeDegrees = (
  edges: ClusterEdge[],
  facts: Record<string, ClusterEntityFacts>,
  extraNodes: string[] = []
): Map<string, number> => {
  const partners = new Map<string, Set<string>>();
  const nodes = new Set<string>([...Object.keys(facts), ...extraNodes]);
  for (const edge of edges) {
    nodes.add(edge.from);
    nodes.add(edge.to);
  }
  for (const edge of edges.filter((candidate) => candidate.type === 'co_alert')) {
    if (!partners.has(edge.from)) partners.set(edge.from, new Set());
    if (!partners.has(edge.to)) partners.set(edge.to, new Set());
    partners.get(edge.from)?.add(edge.to);
    partners.get(edge.to)?.add(edge.from);
  }
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node, (partners.get(node)?.size ?? 0) + (facts[node]?.interactionDegree ?? 0));
  }
  return degrees;
};

export interface HubDetection {
  hubs: Set<string>;
  degrees: Map<string, number>;
  threshold: number;
}

/**
 * Hub if degree > max(HUB_MIN_DEGREE, P95 of the batch), or an extreme-criticality host with
 * degree > HUB_EXTREME_CRITICALITY_MIN_DEGREE, or a managed / shared / service identity.
 */
export const detectHubs = (
  edges: ClusterEdge[],
  facts: Record<string, ClusterEntityFacts>,
  extraNodes: string[] = []
): HubDetection => {
  const degrees = computeDegrees(edges, facts, extraNodes);
  const sorted = [...degrees.values()].sort((a, b) => a - b);
  const threshold = Math.max(HUB_MIN_DEGREE, percentile(sorted, 0.95));
  const hubs = new Set<string>();
  for (const [euid, degree] of degrees) {
    const entityFacts = facts[euid];
    const isExtremeHost =
      entityFacts?.type === 'host' &&
      entityFacts.criticality === EXTREME_CRITICALITY &&
      degree > HUB_EXTREME_CRITICALITY_MIN_DEGREE;
    if (degree > threshold || isExtremeHost || entityFacts?.isManaged === true) {
      hubs.add(euid);
    }
  }
  return { hubs, degrees, threshold };
};

// ---------------------------------------------------------------------------------------------
// Union-find (smallest-euid root, so the component key is stable)
// ---------------------------------------------------------------------------------------------

class UnionFind {
  private readonly parent = new Map<string, string>();

  public add(node: string): void {
    if (!this.parent.has(node)) {
      this.parent.set(node, node);
    }
  }

  public has(node: string): boolean {
    return this.parent.has(node);
  }

  public find(node: string): string {
    this.add(node);
    let root = node;
    let next = this.parent.get(root);
    while (next !== undefined && next !== root) {
      root = next;
      next = this.parent.get(root);
    }
    this.parent.set(node, root);
    return root;
  }

  /** Returns false when already in the same set. */
  public union(a: string, b: string): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) {
      return false;
    }
    if (rootA < rootB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootA, rootB);
    }
    return true;
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const significanceOf = (facts: ClusterEntityFacts | undefined): number =>
  Math.max(
    MIN_SIGNIFICANCE,
    facts?.criticality ? CRITICALITY_SIGNIFICANCE[facts.criticality] ?? 0 : 0,
    (facts?.riskScoreNorm ?? 0) / 100
  );

const criticalityMultiplier = (euids: string[], facts: Record<string, ClusterEntityFacts>) => {
  const values = euids.flatMap((euid) => {
    const criticality = facts[euid]?.criticality;
    const multiplier = criticality ? CRITICALITY_MULTIPLIER[criticality] : undefined;
    return multiplier === undefined ? [] : [multiplier];
  });
  return values.length === 0 ? 1 : Math.max(...values);
};

export const severityFromScore = (value: number): BriefSeverity => {
  if (value >= SEVERITY_CRITICAL) return 'critical';
  if (value >= SEVERITY_HIGH) return 'high';
  if (value >= SEVERITY_MEDIUM) return 'medium';
  return 'low';
};

const typeOrder = (euid: string, facts: Record<string, ClusterEntityFacts>): number =>
  TYPE_ORDER[facts[euid]?.type ?? euid.split(':')[0]] ?? TYPE_ORDER.generic;

/** Users before hosts before services, then by euid. */
const compareEntities =
  (facts: Record<string, ClusterEntityFacts>) =>
  (a: string, b: string): number =>
    typeOrder(a, facts) - typeOrder(b, facts) || compare(a, b);

const pickAnchor = (euids: string[], facts: Record<string, ClusterEntityFacts>): string =>
  [...euids].sort(compareEntities(facts))[0];

const isValidDate = (iso: string | undefined): iso is string =>
  iso !== undefined && !Number.isNaN(new Date(iso).getTime());

const computeLinkStrength = (edges: ClusterEdge[], members: Set<string>): LinkStrength => {
  const between = edges.filter((edge) => members.has(edge.from) && members.has(edge.to));
  if (between.some((edge) => edge.type === 'same_ad' || edge.type === 'co_alert')) {
    return 'strong';
  }
  if (between.some((edge) => STORY_EDGE_CONFIG[edge.type].role === 'merge')) {
    return 'moderate';
  }
  return 'weak';
};

// ---------------------------------------------------------------------------------------------
// Phase 1: components
// ---------------------------------------------------------------------------------------------

/** Builds the synthetic `same_ad` star edges: anchor (user first, then euid) to every other member. */
const buildSameAdEdges = (
  seeds: ClusterSeed[],
  hubs: Set<string>,
  facts: Record<string, ClusterEntityFacts>
): ClusterEdge[] =>
  seeds
    .filter((seed) => seed.kind === 'attack_discovery')
    .flatMap((seed) => {
      const nonHub = seed.entityEuids.filter((euid) => !hubs.has(euid));
      if (nonHub.length === 0) {
        return [];
      }
      const anchor = pickAnchor(nonHub, facts);
      return seed.entityEuids
        .filter((euid) => euid !== anchor)
        .map(
          (euid): ClusterEdge => ({
            type: 'same_ad',
            from: anchor,
            to: euid,
            refKeys: [seed.refKey],
          })
        );
    });

export const formComponents = (input: ClusterInput): ComponentsResult => {
  const trace: ClusterTraceStep[] = [];
  const addTrace = (step: ClusterTraceStep) => {
    if (trace.length < MAX_TRACE_STEPS) {
      trace.push(step);
    }
  };

  const { facts } = input;
  const seeds = normalizeSeeds(input.seeds);
  const seedNodes = uniqueSorted(seeds.flatMap((seed) => seed.entityEuids));

  const seedSeverity: Record<string, number> = {};
  for (const seed of seeds) {
    for (const euid of seed.entityEuids) {
      seedSeverity[euid] = Math.max(seedSeverity[euid] ?? 0, seed.severity);
    }
  }

  // Hubs are detected on the typed edges the caller supplied (same_ad is not a degree source).
  const providedEdges = normalizeEdges(input.edges);
  const { hubs, degrees } = detectHubs(providedEdges, facts, seedNodes);
  const edges = normalizeEdges([...providedEdges, ...buildSameAdEdges(seeds, hubs, facts)]);

  const uf = new UnionFind();
  const union = (a: string, b: string, reason: string) => {
    const rootA = uf.find(a);
    const rootB = uf.find(b);
    if (uf.union(a, b)) {
      const [first, second] = rootA < rootB ? [rootA, rootB] : [rootB, rootA];
      addTrace({ action: 'union', detail: `${first} ∪ ${second} ${reason}` });
    }
  };

  // 1. Seed membership: entities of one seed (or one golden entity in two seeds) are one node set.
  const seedEntities = new Set<string>();
  for (const seed of seeds) {
    const members = seed.entityEuids.filter((euid) => !hubs.has(euid));
    members.forEach((euid) => {
      uf.add(euid);
      seedEntities.add(euid);
    });
    for (let index = 1; index < members.length; index++) {
      union(members[0], members[index], `via seed ${seed.refKey}`);
    }
  }

  // 2. Merge edges: direct seed-seed, or seed-X for a non-hub X (X then bridges every seed it
  //    touches, which is exactly the "≤ 1 non-hub intermediate" rule).
  const neighbours = new Set<string>();
  const mergeEdges = edges.filter(
    (edge) =>
      STORY_EDGE_CONFIG[edge.type].role === 'merge' && !hubs.has(edge.from) && !hubs.has(edge.to)
  );
  for (const edge of mergeEdges) {
    const fromIsSeed = seedEntities.has(edge.from);
    const toIsSeed = seedEntities.has(edge.to);
    if (fromIsSeed && toIsSeed) {
      union(edge.from, edge.to, `via ${edge.type} edge`);
    } else if (fromIsSeed !== toIsSeed) {
      const neighbour = fromIsSeed ? edge.to : edge.from;
      const seedNode = fromIsSeed ? edge.from : edge.to;
      neighbours.add(neighbour);
      uf.add(neighbour);
      union(seedNode, neighbour, `via ${edge.type} edge to ${neighbour}`);
    }
  }
  const coreNodes = new Set<string>([...seedEntities, ...neighbours]);

  // 3. Attach-only edges: each outside entity joins the single best component, never bridges.
  const attachCandidates = new Map<string, { root: string; weight: number; type: StoryEdgeType }>();
  for (const edge of edges.filter((e) => STORY_EDGE_CONFIG[e.type].role === 'attach')) {
    const pairs: Array<[string, string]> = [
      [edge.from, edge.to],
      [edge.to, edge.from],
    ];
    const attachable = pairs.filter(
      ([coreNode, outside]) =>
        coreNodes.has(coreNode) && !coreNodes.has(outside) && !hubs.has(outside)
    );
    for (const [coreNode, outside] of attachable) {
      const root = uf.find(coreNode);
      const weight = edgeWeight(edge.type);
      const existing = attachCandidates.get(outside);
      if (
        !existing ||
        weight > existing.weight ||
        (weight === existing.weight && root < existing.root)
      ) {
        attachCandidates.set(outside, { root, weight, type: edge.type });
      }
    }
  }
  const attachedByRoot = new Map<string, string[]>();
  for (const [euid, candidate] of [...attachCandidates].sort(([a], [b]) => compare(a, b))) {
    attachedByRoot.set(candidate.root, [...(attachedByRoot.get(candidate.root) ?? []), euid]);
  }

  // 4. Hubs: attach to every component they touch, never union.
  const hubTouches = new Map<string, Set<string>>();
  const touch = (hub: string, node: string) => {
    if (!hubs.has(hub) || hubs.has(node) || !coreNodes.has(node)) return;
    const set = hubTouches.get(hub) ?? new Set<string>();
    set.add(uf.find(node));
    hubTouches.set(hub, set);
  };
  for (const edge of edges) {
    touch(edge.from, edge.to);
    touch(edge.to, edge.from);
  }
  for (const seed of seeds) {
    const nonHubMember = seed.entityEuids.find((euid) => !hubs.has(euid));
    if (nonHubMember !== undefined) {
      seed.entityEuids.filter((euid) => hubs.has(euid)).forEach((hub) => touch(hub, nonHubMember));
    }
  }
  // 5. Assemble components.
  const coreByRoot = new Map<string, string[]>();
  for (const node of [...coreNodes].sort(compare)) {
    const root = uf.find(node);
    coreByRoot.set(root, [...(coreByRoot.get(root) ?? []), node]);
  }

  // A component is a storyline candidate with two or more core entities (seed entities and
  // merge-linked neighbours), or with an explicit Attack Discovery. Attach-only neighbours never
  // count, so a lone high-risk entity with daily logons is not a storyline.
  const candidates = [...coreByRoot.keys()]
    .sort(compare)
    .map((root) => ({
      root,
      core: coreByRoot.get(root) ?? [],
      attached: attachedByRoot.get(root) ?? [],
      componentSeeds: seeds.filter((seed) => {
        const member = seed.entityEuids.find((euid) => !hubs.has(euid));
        return member !== undefined && uf.find(member) === root;
      }),
    }))
    .filter(
      ({ core, componentSeeds }) =>
        core.length >= 2 || componentSeeds.some((s) => s.kind === 'attack_discovery')
    );

  const components: StorylineComponent[] = [];
  for (const { root, core, attached, componentSeeds } of candidates) {
    const byEntity = compareEntities(facts);
    const members = new Set<string>([...core, ...attached]);
    const memberSeverity = (euid: string): number => seedSeverity[euid] ?? -1;
    const edgeScore = (euid: string): number => {
      const weights = edges
        .filter(
          (edge) =>
            (edge.from === euid && members.has(edge.to)) ||
            (edge.to === euid && members.has(edge.from))
        )
        .map((edge) => edgeWeight(edge.type));
      return (weights.length === 0 ? 0 : Math.max(...weights)) * significanceOf(facts[euid]);
    };

    const ordered = [
      ...core
        .filter((euid) => seedEntities.has(euid))
        .sort((a, b) => memberSeverity(b) - memberSeverity(a) || byEntity(a, b)),
      ...[...core.filter((euid) => !seedEntities.has(euid)), ...attached].sort(
        (a, b) => edgeScore(b) - edgeScore(a) || byEntity(a, b)
      ),
    ];
    const kept = ordered.slice(0, MAX_STORYLINE_ENTITIES);
    const dropped = ordered.slice(MAX_STORYLINE_ENTITIES);
    if (dropped.length > 0) {
      addTrace({
        action: 'cap_entities',
        detail: `${root}: kept ${kept.length} of ${ordered.length} entities; dropped ${dropped.join(
          ', '
        )}`,
      });
    }
    const keptSet = new Set(kept);

    const hubCandidates = [...hubTouches.entries()]
      .filter(([, roots]) => roots.has(root))
      .map(([hub]) => hub)
      .filter(
        (hub) =>
          edges.some(
            (edge) =>
              (edge.from === hub && keptSet.has(edge.to)) ||
              (edge.to === hub && keptSet.has(edge.from))
          ) ||
          componentSeeds.some(
            (seed) =>
              seed.entityEuids.includes(hub) && seed.entityEuids.some((euid) => keptSet.has(euid))
          )
      )
      .sort((a, b) => (degrees.get(b) ?? 0) - (degrees.get(a) ?? 0) || compare(a, b));
    const hubEuids = hubCandidates.slice(0, MAX_HUBS_PER_STORYLINE).sort(compare);
    const visible = new Set([...kept, ...hubEuids]);

    const componentEdges = edges.filter(
      (edge) =>
        visible.has(edge.from) &&
        visible.has(edge.to) &&
        !(hubs.has(edge.from) && hubs.has(edge.to))
    );
    const outputSeeds = componentSeeds
      .map((seed) => ({
        ...seed,
        entityEuids: seed.entityEuids.filter((euid) => visible.has(euid)),
      }))
      .filter((seed) => seed.entityEuids.length > 0)
      .sort(
        (a, b) =>
          b.severity - a.severity ||
          SEED_KIND_ORDER[a.kind] - SEED_KIND_ORDER[b.kind] ||
          compare(a.refKey, b.refKey)
      );

    const maxSeedSeverity = outputSeeds.reduce((max, seed) => Math.max(max, seed.severity), 0);
    const critMult = criticalityMultiplier(kept, facts);
    const activity = [
      ...outputSeeds.map((seed) => seed.at),
      ...kept.map((euid) => facts[euid]?.lastActivityAt),
    ].filter(isValidDate);
    const latestAt = activity.length
      ? activity.reduce((latest, at) => (new Date(at) > new Date(latest) ? at : latest))
      : input.now;

    components.push({
      key: root,
      entityEuids: kept,
      hubEuids,
      seeds: outputSeeds,
      edges: componentEdges,
      severity: severityFromScore(Math.min(1, maxSeedSeverity * critMult)),
      maxSeedSeverity,
      critMult,
      latestAt,
      linkStrength: computeLinkStrength(componentEdges, new Set(kept)),
    });
  }

  // 6. Trace the attach and hub decisions of the storylines that qualified, in a fixed order.
  const qualifiedRoots = new Set(components.map((component) => component.key));
  for (const [euid, candidate] of [...attachCandidates].sort(([a], [b]) => compare(a, b))) {
    if (qualifiedRoots.has(candidate.root)) {
      addTrace({
        action: 'attach',
        detail: `${euid} attached to ${candidate.root} via ${candidate.type} (attach-only)`,
      });
    }
  }
  const touchedHubs = [...hubTouches]
    .sort(([a], [b]) => compare(a, b))
    .map(([hub, touched]) => ({
      hub,
      roots: [...touched].filter((root) => qualifiedRoots.has(root)),
    }))
    .filter(({ roots }) => roots.length > 0);
  for (const { hub, roots } of touchedHubs) {
    const description = `${hub} (${facts[hub]?.criticality ?? 'no criticality'}, degree ${
      degrees.get(hub) ?? 0
    })`;
    addTrace(
      roots.length > 1
        ? {
            action: 'skip_hub',
            detail: `${description} touches ${roots.length} storylines: attached to each, not bridging`,
          }
        : { action: 'attach', detail: `${description} attached as shared infrastructure` }
    );
  }

  return { components, seedSeverity, trace, hubs: [...hubs].sort(compare) };
};

// ---------------------------------------------------------------------------------------------
// Response derivation (pure; the queries live in response.ts)
// ---------------------------------------------------------------------------------------------

/**
 * Unaddressed / in progress / contained, exactly as investigation 10 §8:
 * contained = every alert closed and every case closed (and something to contain);
 * in progress = a case open or in progress, or any alert acknowledged.
 */
export const deriveResponseState = (
  alerts: StoryResponse['alerts'],
  cases: StoryResponse['cases']
): StoryResponse['state'] => {
  const totalAlerts = alerts.open + alerts.acknowledged + alerts.closed;
  const allAlertsClosed = totalAlerts > 0 && alerts.open === 0 && alerts.acknowledged === 0;
  const allCasesClosed = cases.every((entry) => entry.status === 'closed');
  if (allAlertsClosed && allCasesClosed) {
    return 'contained';
  }
  if (cases.some((entry) => entry.status !== 'closed') || alerts.acknowledged > 0) {
    return 'in_progress';
  }
  return 'unaddressed';
};

// ---------------------------------------------------------------------------------------------
// Phase 2: rank and cap
// ---------------------------------------------------------------------------------------------

export const scoreComponent = (
  component: StorylineComponent,
  response: StoryResponse,
  now: string
): number => {
  const ageDays = Math.max(
    0,
    (new Date(now).getTime() - new Date(component.latestAt).getTime()) / DAY_MS
  );
  const recency = Math.exp(-ageDays / RECENCY_HALF_LIFE_DAYS);
  const distinctKinds = new Set(component.seeds.map((seed) => seed.kind)).size;
  const corroboration = Math.min(
    CORROBORATION_MAX,
    CORROBORATION_STEP * Math.max(0, distinctKinds - 1)
  );
  const responseFactor = response.state === 'contained' ? CONTAINED_RESPONSE_FACTOR : 1;
  return (
    component.maxSeedSeverity * component.critMult * recency * (1 + corroboration) * responseFactor
  );
};

export const rankComponents = (
  formed: ComponentsResult,
  responses: Record<string, StoryResponse>,
  now: string
): ClusterResult => {
  const trace = [...formed.trace];
  const unaddressed: StoryResponse = {
    state: 'unaddressed',
    cases: [],
    alerts: { open: 0, acknowledged: 0, closed: 0 },
  };

  const scored = formed.components
    .map((component) => {
      const response = responses[component.key] ?? unaddressed;
      return { component, response, score: scoreComponent(component, response, now) };
    })
    .sort((a, b) => b.score - a.score || compare(a.component.key, b.component.key));

  const storylines: RankedStoryline[] = scored.slice(0, MAX_STORYLINES).map((entry, index) => ({
    ...entry.component,
    rank: index + 1,
    score: round(entry.score, 3),
    response: entry.response,
  }));

  const droppedComponents = new Map<string, number>();
  scored.slice(MAX_STORYLINES).forEach((entry, index) => {
    for (const euid of entry.component.entityEuids) {
      droppedComponents.set(euid, MAX_STORYLINES + index + 1);
    }
    trace.push({
      action: 'drop_rank',
      detail: `component ${entry.component.key} ranked ${MAX_STORYLINES + index + 1} of ${
        scored.length
      }; beyond the top ${MAX_STORYLINES}`,
    });
  });

  const placed = new Set(storylines.flatMap((s) => [...s.entityEuids, ...s.hubEuids]));
  const others = Object.keys(formed.seedSeverity)
    .filter((euid) => !placed.has(euid))
    .sort((a, b) => formed.seedSeverity[b] - formed.seedSeverity[a] || compare(a, b))
    .slice(0, MAX_SEEDS_PER_KIND);
  for (const euid of others) {
    const rank = droppedComponents.get(euid);
    trace.push({
      action: 'drop_rank',
      detail:
        rank === undefined
          ? `${euid} has no mergeable links; listed as other notable`
          : `${euid} is in a storyline ranked ${rank}; listed as other notable`,
    });
  }

  return { storylines, otherNotableEntities: others, trace };
};

/** Convenience for callers that already hold per-component responses (tests, fixtures). */
export const clusterStorylines = (
  input: ClusterInput,
  responseFor: (component: StorylineComponent) => StoryResponse
): ClusterResult => {
  const formed = formComponents(input);
  const responses = Object.fromEntries(
    formed.components.map((component) => [component.key, responseFor(component)])
  );
  return rankComponents(formed, responses, input.now);
};
