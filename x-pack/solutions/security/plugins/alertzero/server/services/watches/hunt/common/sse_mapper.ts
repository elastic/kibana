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
 * Investigation with `ai.attachment.add`.
 */

import { createHash } from 'crypto';
import type { SignificantSecurityEventAttachmentData } from '../../../../../common/significant_security_event_schema';
import type { HuntCoordinatorResult } from '../hunt_coordinator';

/**
 * The slice of the `security.significant_security_event` payload this mapper
 * populates, derived from the attachment schema so a schema change fails here
 * at compile time. Fields the coordinator has no opinion on (title, status,
 * evaluation_record_ref, etc.) are left to the caller to fill in before writing
 * the attachment.
 */
export type SseAttachmentData = Pick<
  SignificantSecurityEventAttachmentData,
  | 'source_watch'
  | 'capability'
  | 'run_id'
  | 'report_id'
  | 'security_knowledge_indicators'
  | 'entities'
  | 'alerts'
  | 'events'
> &
  // Optional on the wire, always populated by this mapper.
  Required<Pick<SignificantSecurityEventAttachmentData, 'hunt_result'>>;

type SseEntityRef = SseAttachmentData['entities'][number];
type SseSecurityKnowledgeIndicator = SseAttachmentData['security_knowledge_indicators'][number];
type SseEventRef = NonNullable<SseAttachmentData['events']>[number];
type SseAlertRef = NonNullable<SseAttachmentData['alerts']>[number];
type SseHuntResult = NonNullable<SseAttachmentData['hunt_result']>;

/** One SSE attachment, ready to be written with `ai.attachment.add`. */
export interface SseEntry {
  attachment_id: string;
  data: SseAttachmentData;
}

const SOURCE_WATCH_MANAGED_ID = 'system-security-hunt-continuous-threat-hunt';
const CAPABILITY_ID = 'continuous_threat_hunt';

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
  result: HuntCoordinatorResult,
  onlyTechniqueId?: string
): SseSecurityKnowledgeIndicator[] => {
  const { tier1, tier2 } = result;
  // No `{ type: 'threat', value: reportId }` entry here: `report_id` is
  // already its own top-level field on the payload, and the inline content
  // renders it as a linked "Source report" line, so duplicating it into the
  // indicator list was redundant and unlinked.
  const indicators: SseSecurityKnowledgeIndicator[] = [
    // The technologies whose indices this hunt actually ran against.
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

const buildEntities = (result: HuntCoordinatorResult): SseEntityRef[] => [
  ...result.tier1.affected_assets.hosts.map(
    (host): SseEntityRef => ({ field: 'host.name', value: host.name })
  ),
  ...result.tier1.affected_assets.users.map(
    (user): SseEntityRef => ({ field: 'user.name', value: user.name })
  ),
  // Assumed-role / service-principal identities (e.g. an AWS IAM role
  // reached via sts:AssumeRole) are not people, so they're kept out of
  // `user.name` and rendered as `service.name` instead (tier1's
  // `classifyIdentityType`, `hunt_for_threat.ts`).
  ...result.tier1.affected_assets.services.map(
    (service): SseEntityRef => ({ field: 'service.name', value: service.name })
  ),
];

const DATA_STREAM_BACKING_PREFIX = '.ds-';
/** Matches the attachment schema's `.max(50)` on `events` and `alerts`. */
const MAX_HIT_REFS = 50;

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

const hitTimestamp = (hit: HuntCoordinatorResult['tier1']['hits'][number]): string | undefined => {
  const timestamp = (hit as Record<string, unknown>)['@timestamp'];
  return typeof timestamp === 'string' ? timestamp : undefined;
};

const toEventMatched = (
  matched: HuntCoordinatorResult['tier1']['hits'][number]['matched']
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
  result: HuntCoordinatorResult,
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
  result: HuntCoordinatorResult;
  onlyTechniqueId?: string;
}): { events: SseEventRef[]; alerts: SseAlertRef[] } => {
  const events = [...tier1Events];
  const alerts = [...tier1Alerts];
  const seen = new Set([
    ...events.map((e) => `${e.source_index}|${e.event_id}`),
    ...alerts.map((a) => `${a.index}|${a.alert_id}`),
  ]);

  const behaviors = (result.tier2?.behaviors ?? []).filter(
    (behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId
  );

  for (const behavior of behaviors) {
    for (const ref of behavior.hit_refs ?? []) {
      const key = `${ref.source_index}|${ref.event_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (isAlertsIndex(ref.source_index)) {
        if (alerts.length >= MAX_HIT_REFS) continue;
        alerts.push({
          alert_id: ref.event_id,
          index: ref.source_index,
          ...(ref.timestamp ? { timestamp: ref.timestamp } : {}),
        });
      } else {
        if (events.length >= MAX_HIT_REFS) continue;
        events.push({
          event_id: ref.event_id,
          source_index: ref.source_index,
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
  };
};

/**
 * When `onlyTechniqueId` is set, `tier2.behaviors` is filtered to that one
 * technique: the SSE is 1:1 with a Proposal, so a technique-scoped entry
 * must not carry a sibling technique's behavior/rule name.
 */
const buildHuntResult = (
  result: HuntCoordinatorResult,
  onlyTechniqueId?: string
): SseHuntResult => {
  const { tier1, tier2 } = result;
  return {
    has_confirmed_hit: tier1.has_confirmed_hit,
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
            .map((behavior) => ({
              technique_id: behavior.technique_id,
              tactic_ids: behavior.tactic_ids,
              confidence: behavior.confidence,
              rule_name: behavior.rule_name,
            })),
        }
      : undefined,
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
 * `hunt_result.tier2.behaviors`, and Tier 2 `hit_refs` are filtered to that
 * technique. Tier 1 events attributed to another technique are excluded;
 * IOC-only / unscoped Tier 1 hits stay shared.
 */
export const buildSseData = (
  result: HuntCoordinatorResult,
  reportId: string,
  options: SseMapperOptions
): SseEntry[] => {
  const entities = buildEntities(result);

  const techniqueIds = result.tier2?.behaviors.map((behavior) => behavior.technique_id) ?? [];

  if (techniqueIds.length === 0) {
    const { events, alerts } = mergeTierHitRefs({
      ...splitHits(result),
      result,
    });
    return [
      {
        attachment_id: buildSseAttachmentId({ spaceId: options.spaceId, reportId }),
        data: {
          source_watch: SOURCE_WATCH_MANAGED_ID,
          capability: CAPABILITY_ID,
          run_id: result.run_id,
          report_id: reportId,
          security_knowledge_indicators: buildSecurityKnowledgeIndicators(result),
          entities,
          alerts,
          events,
          hunt_result: buildHuntResult(result),
        },
      },
    ];
  }

  return techniqueIds.map((techniqueId) => {
    const { events, alerts } = mergeTierHitRefs({
      ...splitHits(result, techniqueId),
      result,
      onlyTechniqueId: techniqueId,
    });
    return {
      attachment_id: buildSseAttachmentId({ spaceId: options.spaceId, reportId, techniqueId }),
      data: {
        source_watch: SOURCE_WATCH_MANAGED_ID,
        capability: CAPABILITY_ID,
        run_id: result.run_id,
        report_id: reportId,
        security_knowledge_indicators: buildSecurityKnowledgeIndicators(result, techniqueId),
        entities,
        alerts,
        events,
        hunt_result: buildHuntResult(result, techniqueId),
      },
    };
  });
};
