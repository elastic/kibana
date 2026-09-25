/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps the hunt coordinator's raw Tier 1 / Tier 2 output into the
 * `security.significant_security_event` attachment data shape.
 *
 * `buildSseData` returns one SSE entry per confirmed technique (a single
 * report-scoped entry when Tier 2 produced none), each carrying its own
 * computed `attachment_id`. The caller attaches every entry to the
 * Investigation with `ai.attachment.add`. The payload is schema-complete
 * (title, severity, evidence, …) so attach validates without a second fill
 * step; `maps_to_proposal` stays unset until packaging mints.
 */

import { createHash } from 'crypto';
import type { SignificantSecurityEventAttachmentData } from '../../../../../common/significant_security_event_schema';
import type { SeverityLevel } from '../../../../../common/attachment_enums';
import type { HuntCoordinatorCoreResult } from '../hunt_coordinator';

/**
 * Full SSE attachment payload produced by this mapper. Derived from the
 * schema so a required-field change fails here at compile time.
 * `maps_to_proposal` is intentionally omitted: packaging fills it after mint.
 */
export type SseAttachmentData = Omit<SignificantSecurityEventAttachmentData, 'maps_to_proposal'>;

type SseEntityRef = SseAttachmentData['entities'][number];
type SseSecurityKnowledgeIndicator = SseAttachmentData['security_knowledge_indicators'][number];
type SseEventRef = NonNullable<SseAttachmentData['events']>[number];
type SseAlertRef = NonNullable<SseAttachmentData['alerts']>[number];
type SseHuntResult = NonNullable<SseAttachmentData['hunt_result']>;
type SseHitSource = SseHuntResult['hit_sources'][number];
type SseBehavior = NonNullable<SseHuntResult['tier2']>['behaviors'][number];
type CoordinatorBehavior = NonNullable<HuntCoordinatorCoreResult['tier2']>['behaviors'][number];

/** One SSE attachment, ready to be written with `ai.attachment.add`. */
export interface SseEntry {
  attachment_id: string;
  data: SseAttachmentData;
}

const SOURCE_WATCH_MANAGED_ID = 'system-security-hunt-continuous-threat-hunt';
const CAPABILITY_ID = 'continuous_threat_hunt';
const MAX_ENTITIES = 50;
const MAX_HIT_REFS = 50;
const MAX_EVIDENCE = 50;
const MAX_TIMELINE = 50;

/**
 * Subject-stable SSE attachment id: `sse-{sha256(space|reportId[|technique])}`.
 * Omitting `technique` gives the report-scoped fallback id used when Tier 2
 * produced no behaviors.
 */
export const buildSseAttachmentId = ({
  spaceId,
  reportId,
  techniqueId,
}: {
  spaceId: string;
  reportId: string;
  techniqueId?: string;
}): string => {
  const subject = techniqueId ? `${spaceId}|${reportId}|${techniqueId}` : `${spaceId}|${reportId}`;
  const hash = createHash('sha256').update(subject).digest('hex');
  return `sse-${hash}`;
};

/** Options the caller supplies beyond the coordinator result. */
export interface SseMapperOptions {
  spaceId: string;
}

/**
 * Builds `security_knowledge_indicators`. When `onlyTechniqueId` is set, the
 * output is scoped to that one technique. Each SSE is 1:1 with a Proposal, so
 * a two-technique hit run must not put both techniques' behaviors/rule names on
 * either SSE.
 */
const buildSecurityKnowledgeIndicators = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): SseSecurityKnowledgeIndicator[] => {
  const { tier1, tier2 } = result;
  const indicators: SseSecurityKnowledgeIndicator[] = [
    ...result.technologies.map(
      (technology): SseSecurityKnowledgeIndicator => ({ type: 'technology', value: technology })
    ),
    ...tier1.resolved_iocs.map(
      (ioc): SseSecurityKnowledgeIndicator => ({
        type: 'ioc',
        value: ioc.value,
        ioc: { type: ioc.type, value: ioc.value },
      })
    ),
  ];

  if (tier2) {
    for (const behavior of tier2.behaviors) {
      if (onlyTechniqueId && behavior.technique_id !== onlyTechniqueId) continue;
      indicators.push({
        type: 'technique',
        value: `${behavior.technique_id} (${behavior.technique_name})`,
        confidence: behavior.confidence,
        technique_id: behavior.technique_id,
      });
    }
  }

  return indicators;
};

const pushUniqueEntity = (
  entities: SseEntityRef[],
  seen: Set<string>,
  field: SseEntityRef['field'],
  value: string
): void => {
  if (entities.length >= MAX_ENTITIES) return;
  const key = `${field}|${value}`;
  if (seen.has(key)) return;
  seen.add(key);
  entities.push({ field, value });
};

/**
 * Union Tier 1 affected assets with Tier 2 execute hosts/users (technique-scoped
 * when `onlyTechniqueId` is set). Cap 50 with a truncation marker on the entry.
 */
const buildEntities = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): { entities: SseEntityRef[]; truncated: boolean; originalCount: number } => {
  const entities: SseEntityRef[] = [];
  const seen = new Set<string>();
  let originalCount = 0;

  const countAndPush = (field: SseEntityRef['field'], value: string) => {
    originalCount += 1;
    pushUniqueEntity(entities, seen, field, value);
  };

  for (const host of result.tier1.affected_assets.hosts) {
    countAndPush('host.name', host.name);
  }
  for (const user of result.tier1.affected_assets.users) {
    countAndPush('user.name', user.name);
  }
  // Assumed-role / service-principal identities stay out of user.name.
  for (const service of result.tier1.affected_assets.services) {
    countAndPush('service.name', service.name);
  }

  const behaviors = (result.tier2?.behaviors ?? []).filter(
    (behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId
  );
  for (const behavior of behaviors) {
    for (const host of behavior.affected_hosts ?? []) {
      countAndPush('host.name', host);
    }
    for (const user of behavior.affected_users ?? []) {
      countAndPush('user.name', user);
    }
  }

  return {
    entities,
    truncated: originalCount > entities.length,
    originalCount,
  };
};

const DATA_STREAM_BACKING_PREFIX = '.ds-';

/**
 * Alerts indices are hidden (`.alerts-security.alerts-*` and their
 * `.internal.alerts-*` backing indices), and the attachment schema rejects a
 * hidden index as an event source. Strip a data stream backing prefix first so
 * `.ds-logs-aws...` is not mistaken for a hidden index.
 */
const isAlertsIndex = (index: string): boolean => {
  const bare = index.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? index.slice(DATA_STREAM_BACKING_PREFIX.length)
    : index;
  return bare.startsWith('.');
};

const hitTimestamp = (
  hit: HuntCoordinatorCoreResult['tier1']['hits'][number]
): string | undefined => {
  return typeof hit.timestamp === 'string' ? hit.timestamp : undefined;
};

const toEventMatched = (
  matched: HuntCoordinatorCoreResult['tier1']['hits'][number]['matched']
): SseEventRef['matched'] | undefined => {
  if (!matched) return undefined;
  // Schema requires `field` whenever `matched` is present.
  if (!matched.field) return undefined;
  return {
    field: matched.field,
    ...(matched.ioc?.type && matched.ioc?.value
      ? { ioc: { type: matched.ioc.type, value: matched.ioc.value } }
      : {}),
    ...(matched.technique_id ? { technique_id: matched.technique_id } : {}),
  };
};

/**
 * Tier 1 hits become event/alert refs. When `onlyTechniqueId` is set:
 * - include hits with `matched.technique_id === onlyTechniqueId`
 * - include IOC-only / unscoped hits (no technique_id) as shared context
 * - exclude hits attributed to a different technique
 */
const splitHits = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): { events: SseEventRef[]; alerts: SseAlertRef[] } => {
  const events: SseEventRef[] = [];
  const alerts: SseAlertRef[] = [];
  for (const hit of result.tier1.hits) {
    const attributedTechnique = hit.matched?.technique_id?.toUpperCase();
    if (
      onlyTechniqueId &&
      attributedTechnique &&
      attributedTechnique !== onlyTechniqueId.toUpperCase()
    ) {
      continue;
    }
    const timestamp = hitTimestamp(hit);
    const matched = toEventMatched(hit.matched);
    if (isAlertsIndex(hit.index)) {
      alerts.push({
        alert_id: hit.id,
        index: hit.index,
        ...(timestamp ? { timestamp } : {}),
      });
    } else {
      events.push({
        event_id: hit.id,
        source_index: hit.index,
        ...(timestamp ? { timestamp } : {}),
        ...(matched ? { matched } : {}),
      });
    }
  }
  return { events, alerts };
};

const mergeTierHitRefs = ({
  events: tier1Events,
  alerts: tier1Alerts,
  result,
  onlyTechniqueId,
}: {
  events: SseEventRef[];
  alerts: SseAlertRef[];
  result: HuntCoordinatorCoreResult;
  onlyTechniqueId?: string;
}): { events: SseEventRef[]; alerts: SseAlertRef[]; tier1RefCount: number } => {
  const events = [...tier1Events];
  const alerts = [...tier1Alerts];
  const tier1RefCount = events.length + alerts.length;
  const seen = new Set([
    ...events.map((e) => `${e.source_index}|${e.event_id}`),
    ...alerts.map((a) => `${a.index}|${a.alert_id}`),
  ]);

  const behaviors = (result.tier2?.behaviors ?? []).filter(
    (behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId
  );

  for (const behavior of behaviors) {
    for (const ref of behavior.hits ?? []) {
      const key = `${ref.index}|${ref.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (isAlertsIndex(ref.index)) {
        if (alerts.length >= MAX_HIT_REFS) continue;
        alerts.push({
          alert_id: ref.id,
          index: ref.index,
          ...(ref.timestamp ? { timestamp: ref.timestamp } : {}),
        });
      } else {
        if (events.length >= MAX_HIT_REFS) continue;
        events.push({
          event_id: ref.id,
          source_index: ref.index,
          ...(ref.timestamp ? { timestamp: ref.timestamp } : {}),
          matched: {
            technique_id: behavior.technique_id,
            field: '_id',
          },
        });
      }
    }
  }

  return {
    events: events.slice(0, MAX_HIT_REFS),
    alerts: alerts.slice(0, MAX_HIT_REFS),
    tier1RefCount,
  };
};

const mapBehavior = (behavior: CoordinatorBehavior): SseBehavior => ({
  technique_id: behavior.technique_id,
  ...(behavior.technique_name ? { technique_name: behavior.technique_name } : {}),
  tactic_ids: behavior.tactic_ids,
  confidence: behavior.confidence,
  rule_name: behavior.rule_name,
  ...(behavior.proposed_esql_rule
    ? { proposed_esql_rule: behavior.proposed_esql_rule.slice(0, 32_000) }
    : {}),
  ...(behavior.execution
    ? {
        execution: {
          executed: behavior.execution.executed,
          row_count: behavior.execution.row_count,
          hit: behavior.execution.hit,
        },
      }
    : {}),
  ...(behavior.affected_hosts && behavior.affected_hosts.length > 0
    ? { affected_hosts: behavior.affected_hosts.slice(0, 20) }
    : {}),
  ...(behavior.affected_users && behavior.affected_users.length > 0
    ? { affected_users: behavior.affected_users.slice(0, 20) }
    : {}),
  ...(behavior.affected_hosts_truncated ? { affected_hosts_truncated: true } : {}),
  ...(behavior.affected_users_truncated ? { affected_users_truncated: true } : {}),
});

const resolveHitSources = ({
  result,
  onlyTechniqueId,
  tier1RefCount,
}: {
  result: HuntCoordinatorCoreResult;
  onlyTechniqueId?: string;
  tier1RefCount: number;
}): { has_confirmed_hit: boolean; hit_sources: SseHitSource[] } => {
  const sources: SseHitSource[] = [];

  const tier1Source =
    result.tier1.has_confirmed_hit &&
    // Report-scoped: any Tier 1 confirmed hit counts.
    // Technique-scoped: only when this entry still carries Tier 1 refs
    // (technique-attributed or shared IOC-only).
    (!onlyTechniqueId || tier1RefCount > 0);
  if (tier1Source) {
    sources.push('tier1');
  }

  const behaviors = (result.tier2?.behaviors ?? []).filter(
    (behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId
  );
  const tier2Source = behaviors.some((behavior) => behavior.execution?.hit === true);
  if (tier2Source) {
    sources.push('tier2');
  }

  return {
    has_confirmed_hit: sources.length > 0,
    hit_sources: sources,
  };
};

const buildHuntResult = (
  result: HuntCoordinatorCoreResult,
  {
    onlyTechniqueId,
    tier1RefCount,
  }: {
    onlyTechniqueId?: string;
    tier1RefCount: number;
  }
): SseHuntResult => {
  const { tier1, tier2 } = result;
  const { has_confirmed_hit, hit_sources } = resolveHitSources({
    result,
    onlyTechniqueId,
    tier1RefCount,
  });

  return {
    has_confirmed_hit,
    hit_sources,
    time_range: tier1.time_range,
    tier1: {
      status: tier1.status,
      counts: {
        total_hits: tier1.counts.total_hits,
        returned_hits: tier1.counts.returned_hits,
        affected_hosts: tier1.counts.affected_hosts,
        affected_users: tier1.counts.affected_users,
      },
      per_index: tier1.per_index.map((entry) => ({
        index: entry.index,
        hit_count: entry.hit_count,
        required: entry.required,
      })),
      resolved_iocs: tier1.resolved_iocs.map((ioc) => ({ type: ioc.type, value: ioc.value })),
    },
    tier2: tier2
      ? {
          status: tier2.status,
          behaviors: tier2.behaviors
            .filter((behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId)
            .map(mapBehavior),
        }
      : undefined,
  };
};

const severityFromConfidence = (confidence: number): SeverityLevel => {
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
};

const buildChrome = ({
  reportId,
  runId,
  huntResult,
  behavior,
  events,
  alerts,
}: {
  reportId: string;
  runId: string;
  huntResult: SseHuntResult;
  behavior?: CoordinatorBehavior;
  events: SseEventRef[];
  alerts: SseAlertRef[];
}): Pick<
  SseAttachmentData,
  | 'title'
  | 'severity'
  | 'confidence'
  | 'status'
  | 'timeline'
  | 'hypothesis_tested'
  | 'evidence_for'
  | 'evidence_against'
  | 'evaluation_record_ref'
> => {
  const title = behavior?.rule_name
    ? behavior.rule_name.slice(0, 512)
    : huntResult.has_confirmed_hit
    ? `Hunt confirmed for ${reportId}`.slice(0, 512)
    : `Hunt complete for ${reportId}`.slice(0, 512);

  const confidence = behavior?.confidence ?? (huntResult.has_confirmed_hit ? 0.7 : 0.3);
  const severity: SeverityLevel = behavior?.severity
    ? behavior.severity
    : severityFromConfidence(confidence);

  const hypothesis_tested = (
    behavior?.evidence_quote ||
    behavior?.rule_name ||
    `Hunt Watch evaluated report ${reportId} against the environment.`
  ).slice(0, 4000);

  const evidence_for: string[] = [];
  if (huntResult.hit_sources.includes('tier1')) {
    evidence_for.push(
      `Tier 1 confirmed ${huntResult.tier1.counts.total_hits} hit(s) in the hunt window (see hunt_result.tier1.per_index).`
    );
  }
  if (huntResult.hit_sources.includes('tier2') && behavior?.execution?.hit) {
    evidence_for.push(
      `Tier 2 executed ${behavior.technique_id} with ${behavior.execution.row_count} required-index row(s).`
    );
  }
  if (behavior?.proposed_esql_rule) {
    evidence_for.push(`Proposed lasting rule: ${behavior.rule_name}.`);
  }
  if (evidence_for.length === 0 && huntResult.has_confirmed_hit) {
    evidence_for.push('Environment hit confirmed; see hunt_result for structured detail.');
  }

  const timeline: SseAttachmentData['timeline'] = [];
  for (const event of events) {
    if (timeline.length >= MAX_TIMELINE) break;
    if (!event.timestamp) continue;
    timeline.push({
      at: event.timestamp,
      what: `Event ${event.event_id} in ${event.source_index}`.slice(0, 2000),
    });
  }
  for (const alert of alerts) {
    if (timeline.length >= MAX_TIMELINE) break;
    if (!alert.timestamp) continue;
    timeline.push({
      at: alert.timestamp,
      what: `Alert ${alert.alert_id} in ${alert.index}`.slice(0, 2000),
    });
  }

  const evalRef = `eval:hunt:${reportId}:${runId}`.slice(0, 512);

  return {
    title,
    severity,
    confidence,
    status: 'open',
    timeline,
    hypothesis_tested,
    evidence_for: evidence_for.slice(0, MAX_EVIDENCE),
    evidence_against: [],
    evaluation_record_ref: evalRef,
  };
};

const buildEntry = ({
  result,
  reportId,
  spaceId,
  techniqueId,
}: {
  result: HuntCoordinatorCoreResult;
  reportId: string;
  spaceId: string;
  techniqueId?: string;
}): SseEntry => {
  const { events, alerts, tier1RefCount } = mergeTierHitRefs({
    ...splitHits(result, techniqueId),
    result,
    onlyTechniqueId: techniqueId,
  });
  const { entities, truncated, originalCount } = buildEntities(result, techniqueId);
  const hunt_result = buildHuntResult(result, {
    onlyTechniqueId: techniqueId,
    tier1RefCount,
  });
  const behavior = techniqueId
    ? result.tier2?.behaviors.find((b) => b.technique_id === techniqueId)
    : undefined;
  const chrome = buildChrome({
    reportId,
    runId: result.run_id,
    huntResult: hunt_result,
    behavior,
    events,
    alerts,
  });

  return {
    attachment_id: buildSseAttachmentId({ spaceId, reportId, techniqueId }),
    data: {
      ...chrome,
      source_watch: SOURCE_WATCH_MANAGED_ID,
      capability: CAPABILITY_ID,
      run_id: result.run_id,
      report_id: reportId,
      security_knowledge_indicators: buildSecurityKnowledgeIndicators(result, techniqueId),
      entities,
      alerts,
      events,
      hunt_result,
      ...(truncated ? { truncated: true, truncated_original_count: originalCount } : {}),
    },
  };
};

/**
 * Pure function: coordinator output in, one SSE entry per confirmed
 * technique out (report-scoped single entry when Tier 2 produced none). No
 * I/O, no ES calls. The hunt child workflow's step calls this after
 * `hunt_coordinator` returns and fans out over the result with
 * `ai.attachment.add`, one call per entry.
 *
 * Each technique-scoped entry's `security_knowledge_indicators`,
 * `hunt_result.tier2.behaviors`, Tier 2 `hits`, and Tier 2 entities are
 * filtered to that technique. Tier 1 events attributed to another technique
 * are excluded; IOC-only / unscoped Tier 1 hits stay shared.
 */
export const buildSseData = (
  result: HuntCoordinatorCoreResult,
  reportId: string,
  options: SseMapperOptions
): SseEntry[] => {
  const techniqueIds = result.tier2?.behaviors.map((behavior) => behavior.technique_id) ?? [];

  if (techniqueIds.length === 0) {
    return [buildEntry({ result, reportId, spaceId: options.spaceId })];
  }

  return techniqueIds.map((techniqueId) =>
    buildEntry({ result, reportId, spaceId: options.spaceId, techniqueId })
  );
};
