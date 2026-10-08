/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { ENTITY_METADATA, getEntitiesAlias } from '@kbn/entity-store/common';
import {
  MAX_STORYLINE_EVENTS,
  RELATIONSHIP_HISTORY_MIN_DAYS,
  STORY_EDGE_CONFIG,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefTimeRange,
  EvidenceId,
  StoryEdgeType,
  StoryEvent,
  StoryEventType,
  TimePoint,
} from '../../../../../common/entity_analytics/executive_brief/types';
import {
  RISK_LEVEL_RANGES,
  getRiskLevel,
} from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import { tacticOrder } from '../../../../../common/detection_engine/mitre/mitre_tactics_order';
import { tactics } from '../../../../../common/detection_engine/mitre/mitre_tactics_techniques';
import {
  ENTITY_HOST_FIELD,
  ENTITY_USER_FIELD,
  asBucketArray,
  buildAlertScopeFilter,
  buildEntityRuntimeMappings,
  getAlertsIndex,
} from './alert_queries';
import type { AlertEntityRefs } from './alert_queries';
import type { RelationshipKind } from './entity_docs';

export const RISK_JUMP_MIN_DELTA = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TACTIC_BUCKETS = 20;
const MAX_ENTITY_BUCKETS = 500;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const HIGH_RISK_START = RISK_LEVEL_RANGES.High.start;

const TACTIC_NAMES: Record<string, string> = Object.fromEntries(
  tactics.map((tactic) => [tactic.id, tactic.name])
);

export const getTacticName = (tacticId: string): string => TACTIC_NAMES[tacticId] ?? tacticId;

/** Kill-chain order (managed MITRE order), unknown ids last by id. */
export const sortTacticIds = (ids: string[]): string[] => {
  const position = (id: string): number => {
    const index = tacticOrder.indexOf(id);
    return index === -1 ? tacticOrder.length : index;
  };
  return [...new Set(ids)].sort((a, b) => position(a) - position(b) || compare(a, b));
};

// ---------------------------------------------------------------------------------------------
// Risk jumps (pure)
// ---------------------------------------------------------------------------------------------

const byTime = (a: TimePoint, b: TimePoint): number => compare(a.t, b.t);

/** Largest day-over-day rise in a daily-max series (0 when none). */
export const findMaxPositiveDelta = (series: TimePoint[]): number => {
  const sorted = [...series].sort(byTime);
  let max = 0;
  for (let index = 1; index < sorted.length; index++) {
    max = Math.max(max, sorted[index].v - sorted[index - 1].v);
  }
  return max;
};

export interface RiskJump {
  /** ISO timestamp of the later point of the jump. */
  at: string;
  from: number;
  to: number;
  reason: 'largest_rise' | 'crossed_high';
}

/**
 * Deterministic jumps of one entity's daily-max risk series:
 * the largest day-over-day rise if it is at least RISK_JUMP_MIN_DELTA, and the first day the score
 * crosses from below High into High or Critical. Both on the same day collapse to one jump.
 */
export const detectRiskJumps = (series: TimePoint[]): RiskJump[] => {
  const sorted = [...series].sort(byTime);
  const jumps: RiskJump[] = [];

  let bestIndex = -1;
  let bestDelta = 0;
  for (let index = 1; index < sorted.length; index++) {
    const delta = sorted[index].v - sorted[index - 1].v;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  }
  if (bestIndex > 0 && bestDelta >= RISK_JUMP_MIN_DELTA) {
    jumps.push({
      at: sorted[bestIndex].t,
      from: Math.round(sorted[bestIndex - 1].v),
      to: Math.round(sorted[bestIndex].v),
      reason: 'largest_rise',
    });
  }

  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index - 1].v < HIGH_RISK_START && sorted[index].v >= HIGH_RISK_START) {
      if (!jumps.some((jump) => jump.at === sorted[index].t)) {
        jumps.push({
          at: sorted[index].t,
          from: Math.round(sorted[index - 1].v),
          to: Math.round(sorted[index].v),
          reason: 'crossed_high',
        });
      }
      break;
    }
  }
  return jumps.sort((a, b) => compare(a.at, b.at));
};

// ---------------------------------------------------------------------------------------------
// Relationship first-seen guard (pure)
// ---------------------------------------------------------------------------------------------

export interface RelationshipObservation {
  kind: RelationshipKind;
  /** Golden euids. */
  from: string;
  to: string;
  /** ISO timestamp of the earliest metadata doc across the actor group and target group. */
  firstSeenAt: string;
}

export interface GuardedObservations {
  observations: RelationshipObservation[];
  suppressed: 'none' | 'no_history' | 'history_too_short';
  /** Observations dropped because they coincide with the first (backfilling) run. */
  droppedBackfill: number;
}

/**
 * Backfill guard (investigation 10 §2.3): the first maintainer run backfills 30 days of
 * relationships, all stamped with the install time. First-seen is meaningful only when the kind's
 * history is at least RELATIONSHIP_HISTORY_MIN_DAYS long, and then only for relationships first
 * observed after the first run (history start + 1 run = 1 day).
 */
export const guardRelationshipFirstSeen = ({
  observations,
  historyStartByKind,
  now,
}: {
  observations: RelationshipObservation[];
  historyStartByKind: Partial<Record<RelationshipKind, string>>;
  now: string;
}): GuardedObservations => {
  const nowMs = new Date(now).getTime();
  const starts = Object.values(historyStartByKind).filter((value): value is string => !!value);
  if (starts.length === 0) {
    return { observations: [], suppressed: 'no_history', droppedBackfill: 0 };
  }
  const tooShort = RELATIONSHIP_HISTORY_MIN_DAYS * DAY_MS;
  if (starts.every((start) => nowMs - new Date(start).getTime() < tooShort)) {
    return { observations: [], suppressed: 'history_too_short', droppedBackfill: 0 };
  }

  const kept = observations.filter((observation) => {
    const start = historyStartByKind[observation.kind];
    return (
      start !== undefined &&
      nowMs - new Date(start).getTime() >= tooShort &&
      new Date(observation.firstSeenAt).getTime() > new Date(start).getTime() + DAY_MS
    );
  });
  return {
    observations: kept,
    suppressed: 'none',
    droppedBackfill: observations.length - kept.length,
  };
};

// ---------------------------------------------------------------------------------------------
// Event building (pure)
// ---------------------------------------------------------------------------------------------

export interface TimelineInput {
  firstAlerts: Array<{
    tacticId: string;
    at: string;
    entityEuids: string[];
    subjectName: string;
    ruleName: string;
    ruleEvidenceId: EvidenceId;
  }>;
  discoveries: Array<{ at: string; title: string; evidenceId: EvidenceId; entityEuids: string[] }>;
  leads: Array<{ at: string; title: string; evidenceId: EvidenceId; entityEuids: string[] }>;
  riskJumps: Array<{
    at: string;
    entityEuid: string;
    entityName: string;
    from: number;
    to: number;
    evidenceId: EvidenceId;
  }>;
  relationships: Array<{
    at: string;
    kind: StoryEdgeType;
    from: string;
    to: string;
    fromName: string;
    toName: string;
  }>;
  cases: Array<{
    evidenceId: EvidenceId;
    title: string;
    status: 'open' | 'in-progress' | 'closed';
    createdAt: string;
    updatedAt?: string;
    entityEuids: string[];
  }>;
  closedAlerts?: { at: string; count: number; entityEuids: string[] };
}

export interface DraftEvent extends Omit<StoryEvent, 'evidenceId'> {
  /** Set for relationship_first_seen, so the matching edge can cite the event. */
  edge?: { type: StoryEdgeType; from: string; to: string };
}

/** Importance when a timeline has to be truncated; time order is restored afterwards. */
const EVENT_PRIORITY: Record<StoryEventType, number> = {
  ad_generated: 0,
  case_opened: 1,
  lead_created: 2,
  risk_jump: 3,
  relationship_first_seen: 4,
  alert_first: 5,
  case_status: 6,
  alerts_closed: 7,
};

/** Tie-break at equal timestamps. */
const EVENT_TIME_ORDER: Record<StoryEventType, number> = {
  relationship_first_seen: 0,
  alert_first: 1,
  risk_jump: 2,
  lead_created: 3,
  ad_generated: 4,
  case_opened: 5,
  case_status: 6,
  alerts_closed: 7,
};

const caseStatusLabel = (status: 'open' | 'in-progress' | 'closed'): string =>
  status === 'in-progress' ? 'in progress' : status;

export const buildDraftEvents = (input: TimelineInput): DraftEvent[] => {
  const events: DraftEvent[] = [];

  for (const alert of input.firstAlerts) {
    events.push({
      type: 'alert_first',
      at: alert.at,
      entityEuids: alert.entityEuids,
      tacticId: alert.tacticId,
      summary: `First ${getTacticName(alert.tacticId)} alert: "${alert.ruleName}" on ${
        alert.subjectName
      }`,
      sourceEvidenceIds: [alert.ruleEvidenceId],
    });
  }
  for (const discovery of input.discoveries) {
    events.push({
      type: 'ad_generated',
      at: discovery.at,
      entityEuids: discovery.entityEuids,
      summary: `Attack Discovery: "${discovery.title}"`,
      sourceEvidenceIds: [discovery.evidenceId],
    });
  }
  for (const lead of input.leads) {
    events.push({
      type: 'lead_created',
      at: lead.at,
      entityEuids: lead.entityEuids,
      summary: `Hunting lead created: "${lead.title}"`,
      sourceEvidenceIds: [lead.evidenceId],
    });
  }
  for (const jump of input.riskJumps) {
    events.push({
      type: 'risk_jump',
      at: jump.at,
      entityEuids: [jump.entityEuid],
      summary: `${jump.entityName} risk ${jump.from} → ${jump.to} (${getRiskLevel(jump.to)})`,
      sourceEvidenceIds: [jump.evidenceId],
    });
  }
  for (const relationship of input.relationships) {
    events.push({
      type: 'relationship_first_seen',
      at: relationship.at,
      entityEuids: [relationship.from, relationship.to],
      summary: `New relationship: ${relationship.fromName} ${
        STORY_EDGE_CONFIG[relationship.kind].verb
      } ${relationship.toName} (first observed on or around ${relationship.at.slice(0, 10)})`,
      sourceEvidenceIds: [],
      edge: { type: relationship.kind, from: relationship.from, to: relationship.to },
    });
  }
  for (const entry of input.cases) {
    events.push({
      type: 'case_opened',
      at: entry.createdAt,
      entityEuids: entry.entityEuids,
      summary: `Case opened: "${entry.title}"`,
      sourceEvidenceIds: [entry.evidenceId],
    });
    if (entry.status !== 'open' && entry.updatedAt) {
      events.push({
        type: 'case_status',
        at: entry.updatedAt,
        entityEuids: entry.entityEuids,
        summary: `Case "${entry.title}" is ${caseStatusLabel(entry.status)}`,
        sourceEvidenceIds: [entry.evidenceId],
      });
    }
  }
  if (input.closedAlerts && input.closedAlerts.count > 0) {
    events.push({
      type: 'alerts_closed',
      at: input.closedAlerts.at,
      entityEuids: input.closedAlerts.entityEuids,
      summary: `${input.closedAlerts.count} alert${
        input.closedAlerts.count === 1 ? '' : 's'
      } closed`,
      sourceEvidenceIds: [],
    });
  }
  return events;
};

const draftKey = (event: DraftEvent): string =>
  [event.at, EVENT_TIME_ORDER[event.type], event.tacticId ?? '', event.summary].join('|');

/**
 * Time-orders the events (ties by type order, then summary) and keeps at most `max`, dropping the
 * least important types first and, within a type, the latest. Returns the drop count.
 */
export const orderAndCapEvents = (
  drafts: DraftEvent[],
  max: number = MAX_STORYLINE_EVENTS
): { events: DraftEvent[]; truncated: number } => {
  const deduped = [...new Map(drafts.map((event) => [draftKey(event), event])).values()];
  const kept =
    deduped.length <= max
      ? deduped
      : [...deduped]
          .sort(
            (a, b) =>
              EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type] ||
              compare(a.at, b.at) ||
              compare(draftKey(a), draftKey(b))
          )
          .slice(0, max);
  const events = kept.sort((a, b) => compare(draftKey(a), draftKey(b)));
  return { events, truncated: deduped.length - events.length };
};

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

export interface FirstAlertRow {
  entityEuid: string;
  tacticId: string;
  at: string;
  alertCount: number;
  rule: {
    uuid: string;
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    tacticIds: string[];
    techniqueIds: string[];
  };
}

const RULE_FIELDS = [
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.rule.threat.tactic.id',
  'kibana.alert.rule.threat.technique.id',
];

interface RuleBucket {
  key: string;
  doc_count: number;
  min_ts?: { value_as_string?: string; value?: number };
  details?: { hits?: { hits?: Array<{ fields?: Record<string, unknown> }> } };
}
interface TacticBucket {
  key: string;
  first_rule?: { buckets?: RuleBucket[] };
}
interface EntityBucket {
  key: string;
  tactics?: { buckets?: TacticBucket[] };
}

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const severityOf = (value: unknown): FirstAlertRow['rule']['severity'] => {
  const text = Array.isArray(value) ? value[0] : value;
  return text === 'critical' || text === 'high' || text === 'low' ? text : 'medium';
};

/**
 * First alert per (entity, tactic) for the given entities, in one size:0 search: runtime EUIDs of
 * both types, tactic sub-buckets, and the earliest rule per bucket. The seed prefilter keeps the
 * Painless evaluation to candidate alerts only.
 */
export const fetchFirstAlertsPerTactic = async ({
  esClient,
  spaceId,
  timeRange,
  refs,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  timeRange: BriefTimeRange;
  refs: AlertEntityRefs;
  signal?: AbortSignal;
}): Promise<FirstAlertRow[]> => {
  if (refs.euids.length === 0) {
    return [];
  }
  const perEntity = (field: string): estypes.AggregationsAggregationContainer => ({
    terms: { field, include: refs.euids, size: Math.min(MAX_ENTITY_BUCKETS, refs.euids.length) },
    aggs: {
      tactics: {
        terms: { field: 'kibana.alert.rule.threat.tactic.id', size: MAX_TACTIC_BUCKETS },
        aggs: {
          first_rule: {
            terms: {
              field: 'kibana.alert.rule.uuid',
              size: 1,
              order: { min_ts: 'asc' },
            },
            aggs: {
              min_ts: { min: { field: '@timestamp' } },
              details: {
                top_hits: {
                  size: 1,
                  _source: false,
                  fields: RULE_FIELDS,
                  sort: [{ '@timestamp': { order: 'asc' } }],
                },
              },
            },
          },
        },
      },
    },
  });

  const response = await esClient.search<unknown>(
    {
      index: getAlertsIndex(spaceId),
      size: 0,
      allow_partial_search_results: false,
      query: buildAlertScopeFilter(timeRange, refs),
      runtime_mappings: buildEntityRuntimeMappings(),
      aggs: {
        by_user: perEntity(ENTITY_USER_FIELD),
        by_host: perEntity(ENTITY_HOST_FIELD),
      },
    },
    { signal }
  );

  const rows: FirstAlertRow[] = [];
  const aggregations = (response.aggregations ?? {}) as Record<string, unknown>;
  for (const entityBucket of [
    ...asBucketArray<EntityBucket>(aggregations.by_user),
    ...asBucketArray<EntityBucket>(aggregations.by_host),
  ]) {
    for (const tacticBucket of entityBucket.tactics?.buckets ?? []) {
      const ruleBucket = tacticBucket.first_rule?.buckets?.[0];
      const at = ruleBucket?.min_ts?.value_as_string;
      const fields = ruleBucket?.details?.hits?.hits?.[0]?.fields ?? {};
      const ruleName = stringList(fields['kibana.alert.rule.name'])[0];
      if (ruleBucket && at && ruleName) {
        rows.push({
          entityEuid: String(entityBucket.key),
          tacticId: String(tacticBucket.key),
          at,
          alertCount: ruleBucket.doc_count,
          rule: {
            uuid: String(ruleBucket.key),
            name: ruleName,
            severity: severityOf(fields['kibana.alert.severity']),
            tacticIds: stringList(fields['kibana.alert.rule.threat.tactic.id']).sort(compare),
            techniqueIds: stringList(fields['kibana.alert.rule.threat.technique.id']).sort(compare),
          },
        });
      }
    }
  }
  return rows.sort(
    (a, b) =>
      compare(a.at, b.at) || compare(a.tacticId, b.tacticId) || compare(a.entityEuid, b.entityEuid)
  );
};

export interface RelationshipFirstSeenQuery {
  kind: RelationshipKind;
  /** Actor group (golden + aliases). */
  actorEuids: string[];
  /** Target group (golden + aliases). */
  targetEuids: string[];
}

interface TargetBucket {
  key: string;
  first?: { value_as_string?: string };
}
interface ActorBucket {
  key: string;
  targets?: { buckets?: TargetBucket[] };
}

/**
 * First-observed timestamps of relationships (`relationship_observed` metadata docs) for the
 * requested (actor group, kind, target group) triples, plus each kind's history start, in one
 * size:0 search over `entities-metadata-<space>`.
 */
export const fetchRelationshipFirstSeen = async ({
  esClient,
  spaceId,
  requests,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  requests: RelationshipFirstSeenQuery[];
  signal?: AbortSignal;
}): Promise<{
  firstSeen: Map<string, string>;
  historyStartByKind: Partial<Record<RelationshipKind, string>>;
}> => {
  const kinds = [...new Set(requests.map((request) => request.kind))].sort(
    compare
  ) as RelationshipKind[];
  if (kinds.length === 0) {
    return { firstSeen: new Map(), historyStartByKind: {} };
  }
  const actorIds = [...new Set(requests.flatMap((request) => request.actorEuids))].sort(compare);
  const targetIds = [...new Set(requests.flatMap((request) => request.targetEuids))].sort(compare);
  const targetField = (kind: RelationshipKind): string => `entity.relationships.${kind}.target`;

  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const kind of kinds) {
    aggs[`history_${kind}`] = {
      filter: { exists: { field: targetField(kind) } },
      aggs: { start: { min: { field: '@timestamp' } } },
    };
    aggs[`scoped_${kind}`] = {
      filter: {
        bool: {
          filter: [{ terms: { 'entity.id': actorIds } }, { exists: { field: targetField(kind) } }],
        },
      },
      aggs: {
        actors: {
          terms: { field: 'entity.id', include: actorIds, size: actorIds.length },
          aggs: {
            targets: {
              terms: { field: targetField(kind), include: targetIds, size: targetIds.length },
              aggs: { first: { min: { field: '@timestamp' } } },
            },
          },
        },
      },
    };
  }

  const response = await esClient.search<unknown>(
    {
      index: getEntitiesAlias(ENTITY_METADATA, spaceId),
      size: 0,
      query: { term: { 'event.action': 'relationship_observed' } },
      aggs,
    },
    { signal }
  );

  const aggregations = (response.aggregations ?? {}) as Record<string, unknown>;
  const historyStartByKind: Partial<Record<RelationshipKind, string>> = {};
  const firstSeen = new Map<string, string>();
  for (const kind of kinds) {
    const start = (aggregations[`history_${kind}`] as { start?: { value_as_string?: string } })
      ?.start?.value_as_string;
    if (start) {
      historyStartByKind[kind] = start;
    }
    const actors = asBucketArray<ActorBucket>(
      (aggregations[`scoped_${kind}`] as { actors?: unknown })?.actors
    );
    for (const actor of actors) {
      const targets = (actor.targets?.buckets ?? []).flatMap((target) =>
        target.first?.value_as_string
          ? [{ id: String(target.key), at: target.first.value_as_string }]
          : []
      );
      for (const { id, at } of targets) {
        const matching = requests.filter(
          (request) =>
            request.kind === kind &&
            request.actorEuids.includes(String(actor.key)) &&
            request.targetEuids.includes(id)
        );
        for (const request of matching) {
          const key = relationshipKey(request);
          const existing = firstSeen.get(key);
          if (!existing || at < existing) {
            firstSeen.set(key, at);
          }
        }
      }
    }
  }
  return { firstSeen, historyStartByKind };
};

export const relationshipKey = (request: RelationshipFirstSeenQuery): string =>
  `${request.kind}|${request.actorEuids[0]}|${request.targetEuids[0]}`;
