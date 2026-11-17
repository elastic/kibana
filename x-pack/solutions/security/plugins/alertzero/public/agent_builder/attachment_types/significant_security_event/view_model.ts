/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ActionButton, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildAlertsLookupEsql, buildEventsLookupEsql } from '../navigation';
import { buildDiscoverActionButton, joinSubtitle } from '../shared/attachment_definition_helpers';
import { significantSecurityEventAttachmentReadSchema } from '../../../../common/significant_security_event_schema';
import type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';
import {
  buildSummary,
  classifyBasis,
  deriveDetections,
  groupEventsByDetection,
  iocOfDetection,
  reconcileIocDetectionFields,
  type SseBasis,
  type SseDetection,
  type SseEventGroup,
} from '../../../../common/sse_view';

export const OPEN_EVENTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openEventsInDiscover',
  { defaultMessage: 'Open cited events' }
);

export const OPEN_ALERTS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.sse.openAlertsInDiscover',
  { defaultMessage: 'Open alerts in Discover' }
);

export type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';

export type SignificantSecurityEventAttachment = Attachment<
  string,
  SignificantSecurityEventAttachmentData
>;

/** Convenience view-model aliases for the renderer, all inferred from the zod schema. */
export type SecurityKnowledgeIndicator =
  SignificantSecurityEventAttachmentData['security_knowledge_indicators'][number];
export type SignificantSecurityEventRef = NonNullable<
  SignificantSecurityEventAttachmentData['events']
>[number];
export type SignificantSecurityAlertRef = NonNullable<
  SignificantSecurityEventAttachmentData['alerts']
>[number];
export type HuntResult = NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>;
export type HuntResultBehavior = NonNullable<HuntResult['tier2']>['behaviors'][number];
export type HuntResultBehaviorExecution = NonNullable<HuntResultBehavior['execution']>;
export type SseEntityRef = SignificantSecurityEventAttachmentData['entities'][number];

/**
 * Validates the raw attachment payload against the zod schema. The server already
 * validates on write with the identical schema, so a payload that fails here is one
 * the server would have rejected; the renderer falls back to its empty state.
 */
export const parseSignificantSecurityEventData = (
  candidate: unknown
): SignificantSecurityEventAttachmentData | undefined => {
  const result = significantSecurityEventAttachmentReadSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
};

const FROM_REPORT_LABEL = (reportId: string) =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.subtitleFromReport', {
    defaultMessage: 'From {reportId}',
    values: { reportId },
  });

const BASIS_BADGE_LABELS: Record<SseBasis, string> = {
  ioc_strong: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.basisIocStrong', {
    defaultMessage: 'Strong IOC',
  }),
  ioc_weak: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.basisIocWeak', {
    defaultMessage: 'Weak IOC',
  }),
  behavior_only: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.basisBehaviorOnly', {
    defaultMessage: 'Behavior only',
  }),
  ioc_and_behavior: i18n.translate(
    'xpack.alertzero.agentBuilder.attachments.sse.basisIocAndBehavior',
    { defaultMessage: 'IOC and behavior' }
  ),
};

/** Hollow header badge for a graded SSE basis (chrome + inline fallback). */
export const basisHeaderBadge = (basis: SseBasis): HeaderBadge => ({
  label: BASIS_BADGE_LABELS[basis],
  color: 'hollow',
});

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
 */
export const toSseViewModel = (parsed: SignificantSecurityEventAttachmentData): SseViewModel => {
  const events = parsed.events ?? [];
  const huntResult = parsed.hunt_result;
  const rawDetections =
    parsed.detections && parsed.detections.length > 0
      ? parsed.detections
      : deriveDetections(huntResult, events, {
          techniqueId: parsed.corroborated_technique_id,
        });
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

/**
 * Chrome title / subtitle / basis badge for an SSE attachment. Severity, status,
 * and confidence stay in the card body; the chrome header only carries basis.
 */
export const buildSignificantSecurityEventHeadline = (
  parsed: SignificantSecurityEventAttachmentData | undefined,
  data: { source_watch?: string; capability?: string } | undefined
): { title: string; subtitle?: string; basisBadge?: HeaderBadge } => {
  const viewModel = parsed ? toSseViewModel(parsed) : undefined;
  const title = viewModel?.summary ?? '';

  const subtitle = parsed?.report_id
    ? joinSubtitle(FROM_REPORT_LABEL(parsed.report_id), parsed.capability)
    : joinSubtitle(data?.source_watch, data?.capability);

  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(viewModel?.basis ? { basisBadge: basisHeaderBadge(viewModel.basis) } : {}),
  };
};

/**
 * The single Discover exit the SSE header offers: all of its referenced events at once, or
 * its alerts when it carries no events. Shared with inline content, which renders the
 * headline fields itself when this yields no button (Agent Builder then omits the chrome
 * header entirely, so title/severity/status/confidence would otherwise be invisible).
 */
export const buildSignificantSecurityEventActionButtons = ({
  parsed,
  navigation,
}: {
  parsed: SignificantSecurityEventAttachmentData | undefined;
  navigation: AttachmentNavigationDeps;
}): ActionButton[] => {
  if (!parsed) {
    return [];
  }

  const events = parsed.events ?? [];
  const alerts = parsed.alerts ?? [];
  const exit =
    events.length > 0
      ? { esql: buildEventsLookupEsql({ events }), label: OPEN_EVENTS_LABEL }
      : {
          esql: buildAlertsLookupEsql({ alerts, spaceId: navigation.spaceId }),
          label: OPEN_ALERTS_LABEL,
        };

  return buildDiscoverActionButton({
    share: navigation.share,
    esql: exit.esql,
    label: exit.label,
  });
};
