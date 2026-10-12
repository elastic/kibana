/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tactics } from '../../../../../common/detection_engine/mitre/mitre_tactics_techniques';
import { STORY_EDGE_CONFIG } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  EvidenceId,
  StoryEdge,
  StoryEvent,
  StorySeed,
  Storyline,
  StorylinesResult,
  TimePoint,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { SnapshotContext, SnapshotPart, SnapshotSources } from '../snapshot/context';
import { fetchRiskSeries } from '../snapshot/entities';
import { buildEntityRefs } from './alert_queries';
import { formComponents, rankComponents } from './cluster';
import {
  buildCoAlertEdges,
  buildReverseRelationshipEdges,
  fetchCoAlertPairs,
  fetchInteractionDegrees,
  fetchReverseRelationshipDocs,
} from './edges';
import type { RuleInfo } from './edges';
import { RELATIONSHIP_KINDS } from './entity_docs';
import type { RelationshipKind } from './entity_docs';
import { ResolutionIndex, buildForwardRelationshipEdges, resolveDiscoveryEntities } from './expand';
import { assessResponse, fetchCaseDetails, fetchRawResponses, registerResponse } from './response';
import type { CaseDetails, RawResponse } from './response';
import {
  buildRiskSeeds,
  discoveryToSeed,
  fetchDiscoveries,
  fetchLeads,
  leadRelatedEdges,
  leadToSeed,
} from './seeds';
import type { DiscoveryInfo, LeadInfo } from './seeds';
import { setSourceStatus, runStorySource, errorMessage } from './source';
import {
  buildDraftEvents,
  dedupeEvents,
  detectRiskJumps,
  fetchFirstAlertsPerTactic,
  fetchRelationshipFirstSeen,
  guardRelationshipFirstSeen,
  orderAndCapEvents,
  relationshipKey,
  sortTacticIds,
} from './timeline';
import type { FirstAlertRow, RelationshipFirstSeenQuery, TimelineInput } from './timeline';
import type {
  ClusterEdge,
  ClusterEntityFacts,
  ClusterSeed,
  RankedStoryline,
  StorylineComponent,
} from './types';

export interface BuildStorylinesInput {
  /** Material-risk entity euids (golden or alias; resolved view). */
  materialRiskEuids: string[];
  /** Risk-mover entity euids. */
  riskMoverEuids: string[];
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const unique = (values: string[]): string[] => [...new Set(values)].sort(compare);
const CRITICALITY_RANK: Record<string, number> = {
  low_impact: 1,
  medium_impact: 2,
  high_impact: 3,
  extreme_impact: 4,
};

const TACTIC_IDS_BY_NAME: Record<string, string> = Object.fromEntries(
  tactics.map((tactic) => [tactic.name.toLowerCase(), tactic.id])
);

const tacticIdsFromNames = (names: string[]): string[] =>
  unique(names.flatMap((name) => TACTIC_IDS_BY_NAME[name.toLowerCase()] ?? []));

interface Lookups {
  discoveries: Map<string, DiscoveryInfo>;
  leads: Map<string, LeadInfo>;
  rules: Map<string, RuleInfo>;
}

const RELATIONSHIP_KIND_SET: ReadonlySet<string> = new Set<string>(RELATIONSHIP_KINDS);

/** Resolves an opaque seed / edge evidence key to a registered evidence id. */
const resolveRef = (
  refKey: string,
  ctx: SnapshotContext,
  lookups: Lookups
): EvidenceId | undefined => {
  const [prefix, ...rest] = refKey.split(':');
  const id = rest.join(':');
  if (prefix === 'ad') {
    const ad = lookups.discoveries.get(id);
    return ad
      ? ctx.registry.attackDiscovery({
          kind: 'attack_discovery',
          id: ad.id,
          title: ad.title,
          riskScore: ad.riskScore,
          workflowStatus: ad.workflowStatus,
          alertCount: ad.alertIds.length,
          tacticIds: tacticIdsFromNames(ad.tacticNames),
        })
      : undefined;
  }
  if (prefix === 'lead') {
    const lead = lookups.leads.get(id);
    return lead
      ? ctx.registry.lead({
          kind: 'lead',
          id: lead.id,
          title: lead.title,
          priority: lead.priority,
          status: lead.status,
        })
      : undefined;
  }
  if (prefix === 'rule') {
    const rule = lookups.rules.get(id);
    return rule
      ? ctx.registry.rule({
          kind: 'rule',
          ruleId: rule.uuid,
          name: rule.name,
          severity: rule.severity,
          alertCount: rule.alertCount,
          tacticIds: rule.tacticIds,
          techniqueIds: rule.techniqueIds,
        })
      : undefined;
  }
  if (prefix === 'ent') {
    return ctx.registry.entity(id);
  }
  return undefined;
};

/**
 * The deterministic storyline builder (PLAN §3.8): seeds -> resolution -> typed edges -> hub guard
 * -> union-find -> response -> rank -> timelines. Every source is wrapped, so a failure becomes a
 * source status (and thinner storylines), never a thrown error or a silent fallback.
 */
export const buildStorylines = async (
  ctx: SnapshotContext,
  input: BuildStorylinesInput
): Promise<SnapshotPart<StorylinesResult>> => {
  const sources: SnapshotSources = {};
  const { esClient, spaceId, timeRange, abortSignal: signal } = ctx;
  const now = timeRange.to;
  const index = new ResolutionIndex(esClient, spaceId, signal);

  // ---- Stage A: seeds -----------------------------------------------------------------------
  const [discoveryResult, leads] = await Promise.all([
    runStorySource(
      'storylines.attackDiscoveries',
      sources,
      () => fetchDiscoveries({ esClient, spaceId, timeRange, signal }),
      { discoveries: [] as DiscoveryInfo[], ownVisibility: true }
    ),
    runStorySource(
      'storylines.leads',
      sources,
      () => fetchLeads({ esClient, logger: ctx.logger, spaceId }),
      [] as LeadInfo[]
    ),
  ]);
  if (!discoveryResult.ownVisibility && sources['storylines.attackDiscoveries']?.status === 'ok') {
    sources['storylines.attackDiscoveries'] = {
      ...sources['storylines.attackDiscoveries'],
      message: 'Current user could not be resolved: only shared discoveries were considered',
    };
  }
  const { discoveries } = discoveryResult;

  // Discovery alert ids -> entities (one getAlertEntities per discovery).
  const discoveryEntities = new Map<string, string[]>();
  {
    const start = Date.now();
    const settled = await Promise.allSettled(
      discoveries.map((discovery) =>
        resolveDiscoveryEntities({
          esClient,
          spaceId,
          alertIds: discovery.alertIds,
          abortSignal: signal,
        })
      )
    );
    const failures: string[] = [];
    settled.forEach((result, position) => {
      if (result.status === 'fulfilled') {
        discoveryEntities.set(
          discoveries[position].id,
          unique(result.value.map((entity) => entity.id))
        );
      } else {
        failures.push(errorMessage(result.reason));
      }
    });
    if (discoveries.length > 0) {
      sources['storylines.discoveryEntities'] =
        failures.length === 0
          ? { status: 'ok', tookMs: Date.now() - start }
          : {
              status: 'error',
              tookMs: Date.now() - start,
              message: `${failures.length} of ${discoveries.length} discoveries could not be resolved: ${failures[0]}`,
            };
    }
  }

  const materialEuids = unique(input.materialRiskEuids);
  const moverEuids = unique(input.riskMoverEuids);
  const allEuids = unique([
    ...[...discoveryEntities.values()].flat(),
    ...leads.flatMap((lead) => [lead.entityEuid, ...lead.related.map((related) => related.id)]),
    ...materialEuids,
    ...moverEuids,
  ]);

  // ---- Stage B: identity resolution ---------------------------------------------------------
  await runStorySource(
    'storylines.entityResolution',
    sources,
    () => index.ensure(allEuids),
    undefined
  );
  const golden = (euid: string): string => index.golden(euid);

  const riskSeriesCache = new Map<string, TimePoint[]>();
  const loadedRiskSeries = new Set<string>();
  const ensureRiskSeries = async (euids: string[]): Promise<void> => {
    const missing = unique(euids).filter((euid) => !loadedRiskSeries.has(euid));
    if (missing.length === 0) return;
    const series = await fetchRiskSeries({ esClient, spaceId, timeRange, euids: missing, signal });
    missing.forEach((euid) => loadedRiskSeries.add(euid));
    series.forEach((points, euid) => riskSeriesCache.set(euid, points));
  };

  const goldenMaterial = unique(materialEuids.map(golden));
  const goldenMovers = unique(moverEuids.map(golden));
  await runStorySource(
    'storylines.riskHistory',
    sources,
    () => ensureRiskSeries([...goldenMaterial, ...goldenMovers]),
    undefined
  );

  const seeds: ClusterSeed[] = [];
  for (const discovery of discoveries) {
    const entityEuids = unique((discoveryEntities.get(discovery.id) ?? []).map(golden));
    if (entityEuids.length > 0) {
      seeds.push(discoveryToSeed(discovery, entityEuids));
    }
  }
  for (const lead of leads) {
    seeds.push(leadToSeed(lead, golden(lead.entityEuid)));
  }
  const riskCandidates = (euids: string[]) =>
    euids.map((euid) => ({
      euid,
      scoreNorm: index.riskScoreNorm(euid),
      series: riskSeriesCache.get(euid),
    }));
  for (const [kind, euids] of [
    ['material_risk', goldenMaterial],
    ['risk_mover', goldenMovers],
  ] as const) {
    const { seeds: riskSeeds, skipped } = buildRiskSeeds({
      kind,
      candidates: riskCandidates(euids),
      fallbackAt: now,
    });
    seeds.push(...riskSeeds);
    if (skipped.length > 0) {
      setSourceStatus(
        sources,
        `storylines.${kind}Seeds`,
        'ok',
        `${skipped.length} entities without a risk score were not seeded`
      );
    }
  }

  const seedGoldens = new Set(seeds.flatMap((seed) => seed.entityEuids));
  const seedGroups = [...seedGoldens].sort(compare);
  const seedMembers = unique(seedGroups.flatMap((g) => index.groupOf(g)));
  const seedRefs = buildEntityRefs(seedMembers.map((euid) => ({ euid, name: index.name(euid) })));

  // ---- Stage C: edges -----------------------------------------------------------------------
  const rules = new Map<string, RuleInfo>();
  const edgeSets = await Promise.all([
    runStorySource(
      'storylines.relationships',
      sources,
      async (): Promise<ClusterEdge[]> => {
        await index.ensure(index.rawRelationshipTargets(seedGroups));
        const forward = buildForwardRelationshipEdges(index, seedGroups);
        const reverseDocs = await fetchReverseRelationshipDocs({
          esClient,
          spaceId,
          targetEuids: seedMembers,
          signal,
        });
        await index.ensure(
          reverseDocs.flatMap((doc) => [
            doc.euid,
            ...RELATIONSHIP_KINDS.flatMap((k) => doc.relationships[k] ?? []),
          ])
        );
        const targetGoldenOf = new Map(seedMembers.map((member) => [member, golden(member)]));
        const reverse = buildReverseRelationshipEdges({
          docs: reverseDocs,
          targetGoldenOf,
          golden,
        });
        return [...forward, ...reverse];
      },
      []
    ),
    runStorySource(
      'storylines.coAlerts',
      sources,
      async (): Promise<ClusterEdge[]> => {
        const pairs = await fetchCoAlertPairs({
          esClient,
          spaceId,
          timeRange,
          refs: seedRefs,
          signal,
        });
        await index.ensure(pairs.flatMap((pair) => [pair.user, pair.host]));
        const result = buildCoAlertEdges({ pairs, golden, seedGoldens });
        result.rules.forEach((rule, uuid) => rules.set(uuid, rule));
        return result.edges;
      },
      []
    ),
  ]);
  const leadEdges = leads.flatMap((lead) => leadRelatedEdges(lead, golden));
  const edges = [...edgeSets.flat(), ...leadEdges];

  const nodeGoldens = unique([...seedGroups, ...edges.flatMap((edge) => [edge.from, edge.to])]);
  const nodeMembers = unique(nodeGoldens.flatMap((g) => index.groupOf(g)));
  const degrees = await runStorySource(
    'storylines.hubDegree',
    sources,
    () => fetchInteractionDegrees({ esClient, spaceId, euids: nodeMembers, signal }),
    new Map<string, number>()
  );

  const facts: Record<string, ClusterEntityFacts> = {};
  for (const node of nodeGoldens) {
    const group = index.groupOf(node);
    const criticality = group
      .flatMap((member) => {
        const value = index.doc(member)?.criticality;
        return value ? [value] : [];
      })
      .sort((a, b) => (CRITICALITY_RANK[b] ?? 0) - (CRITICALITY_RANK[a] ?? 0) || compare(a, b))[0];
    facts[node] = {
      euid: node,
      type: index.type(node),
      criticality,
      riskScoreNorm: index.riskScoreNorm(node),
      interactionDegree: Math.max(0, ...group.map((member) => degrees.get(member) ?? 0)),
      isManaged: index.doc(node)?.managed === true,
    };
  }

  // ---- Stage D: cluster, response, rank -------------------------------------------------------
  const formed = formComponents({ seeds, edges, facts, now });
  const groupsOf = (component: StorylineComponent): string[] =>
    unique(component.entityEuids.flatMap((euid) => index.groupOf(euid)));

  const rawResponses = await runStorySource(
    'storylines.response',
    sources,
    () =>
      fetchRawResponses({
        esClient,
        spaceId,
        timeRange,
        groups: formed.components.map((component) => ({
          key: component.key,
          euids: groupsOf(component),
        })),
        nameOf: (euid) => index.name(euid),
        signal,
      }),
    {} as Record<string, RawResponse>
  );

  const caseIds = unique(Object.values(rawResponses).flatMap((raw) => raw.caseIds));
  let caseDetails = new Map<string, CaseDetails>();
  if (caseIds.length > 0) {
    if (ctx.services.casesClient) {
      const casesClient = ctx.services.casesClient;
      caseDetails = await runStorySource(
        'storylines.cases',
        sources,
        () => fetchCaseDetails({ casesClient, caseIds }),
        new Map<string, CaseDetails>()
      );
    } else {
      setSourceStatus(
        sources,
        'storylines.cases',
        'disabled',
        'Cases client unavailable: response state rests on alert statuses only'
      );
    }
  }

  const preRank = Object.fromEntries(
    formed.components.map((component) => [
      component.key,
      assessResponse(rawResponses[component.key], caseDetails),
    ])
  );
  const ranked = rankComponents(formed, preRank, now);

  // ---- Stage E: timelines for the surviving storylines ---------------------------------------
  const lookups: Lookups = {
    discoveries: new Map(discoveries.map((discovery) => [discovery.id, discovery])),
    leads: new Map(leads.map((lead) => [lead.id, lead])),
    rules,
  };
  const keptGroups = unique(ranked.storylines.flatMap(groupsOf));
  const firstAlertRows = await runStorySource(
    'storylines.firstAlerts',
    sources,
    () =>
      fetchFirstAlertsPerTactic({
        esClient,
        spaceId,
        timeRange,
        refs: buildEntityRefs(keptGroups.map((euid) => ({ euid, name: index.name(euid) }))),
        signal,
      }),
    [] as FirstAlertRow[]
  );
  await runStorySource(
    'storylines.riskTrend',
    sources,
    () => ensureRiskSeries(unique(ranked.storylines.flatMap((s) => s.entityEuids))),
    undefined
  );

  // Relationship first-seen requests for every relationship edge among kept storylines.
  const relationshipRequests = new Map<string, RelationshipFirstSeenQuery>();
  for (const storyline of ranked.storylines) {
    for (const edge of storyline.edges.filter((candidate) =>
      RELATIONSHIP_KIND_SET.has(candidate.type)
    )) {
      const request: RelationshipFirstSeenQuery = {
        kind: edge.type as RelationshipKind,
        actorEuids: index.groupOf(edge.from),
        targetEuids: index.groupOf(edge.to),
      };
      relationshipRequests.set(relationshipKey(request), request);
    }
  }
  const relationshipData = await runStorySource(
    'storylines.relationshipHistory',
    sources,
    () =>
      fetchRelationshipFirstSeen({
        esClient,
        spaceId,
        requests: [...relationshipRequests.values()],
        signal,
      }),
    {
      firstSeen: new Map<string, string>(),
      historyStartByKind: {} as Partial<Record<RelationshipKind, string>>,
    }
  );
  const observations = [...relationshipRequests.values()].flatMap((request) => {
    const firstSeenAt = relationshipData.firstSeen.get(relationshipKey(request));
    return firstSeenAt
      ? [
          {
            kind: request.kind,
            from: request.actorEuids[0],
            to: request.targetEuids[0],
            firstSeenAt,
          },
        ]
      : [];
  });
  const guarded = guardRelationshipFirstSeen({
    observations,
    historyStartByKind: relationshipData.historyStartByKind,
    now,
  });
  if (guarded.suppressed !== 'none' && relationshipRequests.size > 0) {
    setSourceStatus(
      sources,
      'storylines.relationshipHistory',
      'disabled',
      guarded.suppressed === 'no_history'
        ? 'No relationship history found: "new relationship" events are not shown'
        : 'Relationship history is too short: "new relationship" events are suppressed'
    );
  }

  // ---- Finalise: register evidence in rank order and assemble --------------------------------
  const storylines: Storyline[] = ranked.storylines.map((storyline) =>
    finalizeStoryline({
      storyline,
      ctx,
      lookups,
      index,
      firstAlertRows,
      riskSeriesCache,
      guarded: guarded.observations,
      rawResponse: rawResponses[storyline.key],
      caseDetails,
      groupEuids: groupsOf(storyline),
    })
  );

  return {
    value: {
      storylines,
      otherNotableEntities: ranked.otherNotableEntities,
      trace: ranked.trace,
    },
    sources,
  };
};

const finalizeStoryline = ({
  storyline,
  ctx,
  lookups,
  index,
  firstAlertRows,
  riskSeriesCache,
  guarded,
  rawResponse,
  caseDetails,
  groupEuids,
}: {
  storyline: RankedStoryline;
  ctx: SnapshotContext;
  lookups: Lookups;
  index: ResolutionIndex;
  firstAlertRows: FirstAlertRow[];
  riskSeriesCache: Map<string, TimePoint[]>;
  guarded: Array<{ kind: RelationshipKind; from: string; to: string; firstSeenAt: string }>;
  rawResponse: RawResponse | undefined;
  caseDetails: Map<string, CaseDetails>;
  groupEuids: string[];
}): Storyline => {
  const { registry } = ctx;
  const evidenceId = registry.story(storyline.rank);
  const members = new Set(storyline.entityEuids);
  const memberGoldenOf = new Map<string, string>();
  for (const euid of storyline.entityEuids) {
    index.groupOf(euid).forEach((member) => memberGoldenOf.set(member, euid));
  }

  // Seeds.
  const seeds: StorySeed[] = storyline.seeds.flatMap((seed) => {
    const seedEvidence = resolveRef(seed.refKey, ctx, lookups);
    return seedEvidence
      ? [
          {
            kind: seed.kind,
            evidenceId: seedEvidence,
            entityEuids: seed.entityEuids,
            severity: Math.round(seed.severity * 100) / 100,
            at: seed.at,
          },
        ]
      : [];
  });

  // First alert per tactic (earliest across the storyline's entity group).
  const rows = firstAlertRows.filter((row) => memberGoldenOf.has(row.entityEuid));
  const byTactic = new Map<string, FirstAlertRow[]>();
  for (const row of rows) {
    byTactic.set(row.tacticId, [...(byTactic.get(row.tacticId) ?? []), row]);
  }
  const firstAlerts: TimelineInput['firstAlerts'] = [...byTactic.keys()]
    .sort(compare)
    .flatMap((tacticId) => {
      const candidates = (byTactic.get(tacticId) ?? []).sort(
        (a, b) => compare(a.at, b.at) || compare(a.entityEuid, b.entityEuid)
      );
      const earliest = candidates[0];
      const sameMoment = candidates.filter(
        (row) => row.at === earliest.at && row.rule.uuid === earliest.rule.uuid
      );
      const subject = memberGoldenOf.get(earliest.entityEuid) ?? earliest.entityEuid;
      const ruleEvidenceId = registry.rule({
        kind: 'rule',
        ruleId: earliest.rule.uuid,
        name: earliest.rule.name,
        severity: earliest.rule.severity,
        alertCount: earliest.alertCount,
        tacticIds: earliest.rule.tacticIds,
        techniqueIds: earliest.rule.techniqueIds,
      });
      return [
        {
          tacticId,
          at: earliest.at,
          entityEuids: unique(
            sameMoment.map((row) => memberGoldenOf.get(row.entityEuid) ?? row.entityEuid)
          ),
          subjectName: index.name(subject),
          ruleName: earliest.rule.name,
          ruleEvidenceId,
        },
      ];
    });

  // Discoveries, leads, risk jumps, relationships, cases, closing.
  const discoveries: TimelineInput['discoveries'] = storyline.seeds.flatMap((seed) => {
    const discovery = seed.refKey.startsWith('ad:')
      ? lookups.discoveries.get(seed.refKey.slice(3))
      : undefined;
    const id = discovery ? resolveRef(seed.refKey, ctx, lookups) : undefined;
    return discovery && id
      ? [
          {
            at: discovery.at,
            title: discovery.title,
            evidenceId: id,
            entityEuids: seed.entityEuids,
          },
        ]
      : [];
  });
  const leadEvents: TimelineInput['leads'] = storyline.seeds.flatMap((seed) => {
    const lead = seed.refKey.startsWith('lead:')
      ? lookups.leads.get(seed.refKey.slice(5))
      : undefined;
    const id = lead ? resolveRef(seed.refKey, ctx, lookups) : undefined;
    return lead && id
      ? [{ at: lead.createdAt, title: lead.title, evidenceId: id, entityEuids: seed.entityEuids }]
      : [];
  });
  const riskJumps: TimelineInput['riskJumps'] = [...members].sort(compare).flatMap((euid) =>
    detectRiskJumps(riskSeriesCache.get(euid) ?? []).map((jump) => ({
      at: jump.at,
      entityEuid: euid,
      entityName: index.name(euid),
      from: jump.from,
      to: jump.to,
      evidenceId: registry.entity(euid),
    }))
  );
  const relationships: TimelineInput['relationships'] = guarded
    .filter((observation) => members.has(observation.from) && members.has(observation.to))
    .filter((observation) =>
      storyline.edges.some(
        (edge) =>
          edge.type === observation.kind &&
          edge.from === observation.from &&
          edge.to === observation.to
      )
    )
    .map((observation) => ({
      at: observation.firstSeenAt,
      kind: observation.kind,
      from: observation.from,
      to: observation.to,
      fromName: index.name(observation.from),
      toName: index.name(observation.to),
    }));
  const response = registerResponse(rawResponse, caseDetails, registry);
  const cases: TimelineInput['cases'] = response.cases.flatMap((entry) => {
    const detail = caseDetails.get(entry.caseId);
    return detail
      ? [
          {
            evidenceId: entry.evidenceId,
            title: entry.title,
            status: entry.status,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
            entityEuids: storyline.entityEuids,
          },
        ]
      : [];
  });

  const drafts = buildDraftEvents({
    firstAlerts,
    discoveries,
    leads: leadEvents,
    riskJumps,
    relationships,
    cases,
    closedAlerts:
      rawResponse?.closedAt && response.alerts.closed > 0
        ? {
            at: rawResponse.closedAt,
            count: response.alerts.closed,
            entityEuids: storyline.entityEuids,
          }
        : undefined,
  });
  const deduped = dedupeEvents(drafts);
  const { events: ordered, truncated } = orderAndCapEvents(deduped);

  const events: StoryEvent[] = ordered.map(({ edge: _edge, ...draft }, position) => ({
    ...draft,
    evidenceId: registry.event(storyline.rank, position + 1),
  }));

  // Relationship edges cite their "first seen" event.
  const edges: StoryEdge[] = storyline.edges.map((edge) => {
    const refIds = edge.refKeys.flatMap((key) => {
      const resolved = resolveRef(key, ctx, lookups);
      return resolved ? [resolved] : [];
    });
    const eventIds = ordered.flatMap((draft, position) =>
      draft.edge?.type === edge.type && draft.edge.from === edge.from && draft.edge.to === edge.to
        ? [events[position].evidenceId]
        : []
    );
    return {
      type: edge.type,
      from: edge.from,
      to: edge.to,
      weight: STORY_EDGE_CONFIG[edge.type].weight,
      evidenceIds: [...refIds, ...eventIds],
    };
  });

  return {
    evidenceId,
    rank: storyline.rank,
    score: storyline.score,
    severity: storyline.severity,
    entityEuids: storyline.entityEuids,
    hubEuids: storyline.hubEuids,
    seeds,
    edges,
    events,
    eventsTruncated: truncated,
    tacticIds: sortTacticIds(rows.map((row) => row.tacticId)),
    linkStrength: storyline.linkStrength,
    response,
  };
};
