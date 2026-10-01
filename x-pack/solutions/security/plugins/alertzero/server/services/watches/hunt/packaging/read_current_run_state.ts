/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { significantSecurityEventAttachmentReadSchema } from '../../../../../common/significant_security_event_schema';
import type { ResolveHostEnrollment } from '../../../fleet/resolve_host_enrollment';
import { DEFAULT_BASELINE_TELEMETRY } from '../common/resolve_index_scope';
import { buildMatchesRequired } from '../common/matches_required';
import type { RehydrateProcessSelectors } from './rehydrate_process_selectors';
import type { CurrentRunHost, CurrentRunState } from './types';

const SSE_ATTACHMENT_TYPE = 'security.significant_security_event';

/** Baseline patterns whose telemetry carries `process.entity_id`/`pid`, so a hit there is a
 *  process-shaped finding a process selector could in principle be rehydrated from. */
const PROCESS_BEARING_BASELINE_PATTERNS = [
  'logs-endpoint.events.*',
  'logs-endpoint.alerts.*',
  'logs-crowdstrike.fdr*',
  'logs-sentinel_one_cloud_funnel.*',
  'logs-m365_defender.event-*',
];

const matchesBaseline = buildMatchesRequired([...DEFAULT_BASELINE_TELEMETRY]);
const matchesProcessBearing = buildMatchesRequired(PROCESS_BEARING_BASELINE_PATTERNS);

const currentVersionData = (attachment: VersionedAttachment): unknown => {
  const version = attachment.versions.find((v) => v.version === attachment.current_version);
  return version?.data;
};

/**
 * Reads current-run SSE attachments from a conversation and builds packaging state.
 * Returns undefined when no current-run SSE is present (run_incomplete).
 */
export const readCurrentRunState = async ({
  attachments,
  reportId,
  runId,
  resolveHostEnrollment,
  rehydrateProcessSelectors,
}: {
  attachments: VersionedAttachment[] | undefined;
  reportId: string;
  runId: string;
  resolveHostEnrollment: ResolveHostEnrollment;
  rehydrateProcessSelectors: RehydrateProcessSelectors;
}): Promise<CurrentRunState | undefined> => {
  const sseAttachments = (attachments ?? []).filter((a) => a.type === SSE_ATTACHMENT_TYPE);
  const currentRun: Array<ReturnType<typeof significantSecurityEventAttachmentReadSchema.parse>> =
    [];

  for (const attachment of sseAttachments) {
    const raw = currentVersionData(attachment);
    const parsed = significantSecurityEventAttachmentReadSchema.safeParse(raw);
    if (!parsed.success) {
      continue;
    }
    if (parsed.data.run_id !== runId) {
      continue;
    }
    if (parsed.data.report_id !== reportId) {
      continue;
    }
    currentRun.push(parsed.data);
  }

  if (currentRun.length === 0) {
    return undefined;
  }

  const hasConfirmedHit = currentRun.some((sse) => sse.hunt_result?.has_confirmed_hit === true);
  const titles = currentRun.map((sse) => sse.title);
  const evidenceLines = currentRun.flatMap((sse) => [...sse.evidence_for, ...sse.evidence_against]);

  const techniques = [
    ...new Set(
      currentRun.flatMap((sse) =>
        sse.security_knowledge_indicators
          .filter((ski) => ski.type === 'technique')
          .map((ski) => ski.technique_id ?? ski.value)
      )
    ),
  ];

  const hostNames = [
    ...new Set(
      currentRun.flatMap((sse) =>
        sse.entities
          .filter((e) => e.field === 'host.name' || e.field === 'host.hostname')
          .map((e) => e.value)
      )
    ),
  ];

  const hosts: CurrentRunHost[] = [];
  for (const name of hostNames) {
    const enrollment = await resolveHostEnrollment(name);
    if (enrollment.enrolled) {
      hosts.push({ name, enrolled: true, agentId: enrollment.agentId });
    } else {
      hosts.push({ name, enrolled: false });
    }
  }

  const alertRefs = currentRun.flatMap((sse) => sse.alerts ?? []);
  const eventRefs = currentRun.flatMap((sse) => sse.events ?? []);
  const processSelectors = await rehydrateProcessSelectors({
    alerts: alertRefs.map((a) => ({ alert_id: a.alert_id, index: a.index })),
    events: eventRefs.map((e) => ({
      event_id: e.event_id,
      source_index: e.source_index,
      ...(e.matched?.technique_id ? { matched: { technique_id: e.matched.technique_id } } : {}),
    })),
  });

  const hasNonHostEntity = currentRun.some((sse) =>
    sse.entities.some((e) => e.field !== 'host.name' && e.field !== 'host.hostname')
  );
  const hasIocIndicator = currentRun.some((sse) =>
    sse.security_knowledge_indicators.some((ski) => ski.type === 'ioc')
  );
  const allEventsWithinBaseline = eventRefs.every((e) => matchesBaseline(e.source_index));
  const hasProcessBearingEvent = eventRefs.some((e) => matchesProcessBearing(e.source_index));
  const manualRemediation = [
    ...new Set(currentRun.flatMap((sse) => sse.maps_to_proposal?.manual_remediation ?? [])),
  ];

  return {
    runId,
    reportId,
    hasConfirmedHit,
    titles,
    evidenceLines,
    techniques,
    hasNonHostEntity,
    hasIocIndicator,
    allEventsWithinBaseline,
    hasProcessBearingEvent,
    manualRemediation,
    hosts,
    processSelectors,
  };
};
