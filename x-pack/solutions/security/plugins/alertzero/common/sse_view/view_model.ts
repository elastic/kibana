/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantSecurityEventAttachmentData } from '../significant_security_event_schema';
import { buildSummary } from './build_summary';
import { classifyBasis, type SseBasis } from './classify_basis';
import {
  deriveDetections,
  iocOfDetection,
  reconcileIocDetectionFields,
  type SseDetection,
} from './derive_detections';
import { groupEventsByDetection, type SseEventGroup } from './group_events_by_detection';

type HuntResult = NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>;
type SseEntityRef = SignificantSecurityEventAttachmentData['entities'][number];

/** Entity-line chips ordered host → user → service. */
const ENTITY_FIELD_ORDER = ['host.name', 'user.name', 'service.name'] as const;

const entityFieldRank = (field: string): number => {
  const index = (ENTITY_FIELD_ORDER as readonly string[]).indexOf(field);
  return index === -1 ? ENTITY_FIELD_ORDER.length : index;
};

export interface SseEntityLine {
  /** Entities ordered host.name, user.name, then service.name for chip rendering. */
  entities: SseEntityRef[];
  /** max(unique host names in entities, tier1.counts.affected_hosts). */
  hostCount: number;
  /** max(unique user names in entities, tier1.counts.affected_users). */
  userCount: number;
}

/**
 * Hit-centric fields the renderer reads after parse. Old payloads without
 * `summary` / `basis` / `detections` are derived here via `alertzero/common/sse_view/`
 * never from `resolved_iocs` or knowledge indicators.
 */
export interface SseViewModel {
  summary: string;
  basis?: SseBasis;
  detections: SseDetection[];
  eventGroups: SseEventGroup[];
  /** Display string for the Hypothesis section. */
  hypothesisDisplay: string;
  entityLine: SseEntityLine;
}

const uniqueNamesForField = (entities: readonly SseEntityRef[], field: string): number =>
  new Set(entities.filter((entity) => entity.field === field).map((entity) => entity.value)).size;

/**
 * Entity line under the headline: chips from the stored `entities` array
 * (already the cross-tier union), ordered host → user → service, with host/user
 * counts as the larger of the unique names in that array and Tier 1's wide counts.
 * No second rollup from `detections[]`.
 */
const buildEntityLine = (
  entities: readonly SseEntityRef[],
  tier1Counts: HuntResult['tier1']['counts'] | undefined
): SseEntityLine => {
  const ordered = [...entities].sort((a, b) => entityFieldRank(a.field) - entityFieldRank(b.field));

  const hostNames = uniqueNamesForField(entities, 'host.name');
  const userNames = uniqueNamesForField(entities, 'user.name');

  return {
    entities: ordered,
    hostCount: Math.max(hostNames, tier1Counts?.affected_hosts ?? 0),
    userCount: Math.max(userNames, tier1Counts?.affected_users ?? 0),
  };
};

/**
 * Grades an old payload that has no stored `basis`. Prefers IOC
 * values on the cited events; only when no IOC event exists does it fall back
 * to `hit_sources` for `behavior_only` / `ioc_and_behavior`.
 */
/**
 * Grades an old payload (no stored `basis`) the way the mapper grades a new one: from the
 * derived detections' IOCs plus whether a Tier 2 behavior hit. Without any IOC detection
 * the IOC strength is unknown: a behavior hit still grades (`hit_sources` says whether
 * Tier 1 hit too), but a Tier 1 hit alone gets no badge rather than a misleading "weak" one.
 */
const classifyBasisFromDetections = (
  detections: readonly SseDetection[],
  huntResult: HuntResult | undefined
): SseBasis | undefined => {
  if (!huntResult) {
    return undefined;
  }
  const iocs = detections
    .map(iocOfDetection)
    .filter((ioc): ioc is NonNullable<typeof ioc> => ioc !== undefined);
  const hasBehaviorHit =
    huntResult.hit_sources.includes('tier2') ||
    (huntResult.tier2?.behaviors ?? []).some((behavior) => behavior.execution?.hit === true);
  if (iocs.length > 0) {
    return classifyBasis(iocs, hasBehaviorHit);
  }
  if (hasBehaviorHit) {
    return huntResult.hit_sources.includes('tier1') ? 'ioc_and_behavior' : 'behavior_only';
  }
  return undefined;
};

/**
 * Builds the hit-centric view model after parse. New payloads keep their stored
 * `summary` / `basis` / `detections`; old ones derive them via the shared helpers
 * so the card renders the same shape either way.
 *
 * A stored `detections` array is authoritative even when empty: a technique-scoped
 * entry confirmed by an attributed alert alone has nothing that matched, and the
 * mapper writes `[]` to say so. Only an absent array (a payload written before the
 * field existed) is derived, because `hunt_result.tier1.per_ioc` is report-wide and
 * deriving from it would show IOCs that another technique matched under this one.
 * For that reason a technique-scoped payload without the field derives from its cited
 * `events[]` alone, which the mapper already scoped to the technique, and not from
 * `per_ioc`, the same way the mapper derives a technique-scoped entry.
 */
export const toSseViewModel = (parsed: SignificantSecurityEventAttachmentData): SseViewModel => {
  const events = parsed.events ?? [];
  const huntResult = parsed.hunt_result;
  const techniqueId = parsed.corroborated_technique_id;
  const derivationSource =
    huntResult && techniqueId
      ? { ...huntResult, tier1: { ...huntResult.tier1, per_ioc: undefined } }
      : huntResult;
  const rawDetections =
    parsed.detections ?? deriveDetections(derivationSource, events, { techniqueId });
  // Stored `per_ioc.field` can name the first searched slot rather than the field that
  // actually hit; reconcile against cited events so What matched + Discover pivots agree.
  const detections = reconcileIocDetectionFields(rawDetections, events);

  const summary =
    parsed.summary ?? buildSummary(detections, { techniqueId: parsed.corroborated_technique_id });

  const basis = parsed.basis ?? classifyBasisFromDetections(detections, huntResult);

  const eventGroups = groupEventsByDetection(events, detections, huntResult);

  return {
    summary: summary || parsed.title,
    ...(basis ? { basis } : {}),
    detections,
    eventGroups,
    hypothesisDisplay: parsed.hypothesis_tested,
    entityLine: buildEntityLine(parsed.entities, huntResult?.tier1.counts),
  };
};
