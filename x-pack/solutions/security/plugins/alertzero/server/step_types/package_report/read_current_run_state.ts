/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { significantSecurityEventAttachmentDataSchema } from '../../../common/significant_security_event_schema';
import { buildMatchesRequired } from '../../services/watches/hunt/common/matches_required';
import type {
  CurrentRunHost,
  CurrentRunState,
  HuntEvidenceSummary,
  HuntEvidenceTechnique,
  ProcessSelector,
} from './types';

const SSE_ATTACHMENT_TYPE = 'security.significant_security_event';

const currentVersionData = (attachment: VersionedAttachment): unknown => {
  const version = attachment.versions.find((v) => v.version === attachment.current_version);
  return version?.data;
};

export type HostEnrollment = { enrolled: true; agentId: string } | { enrolled: false };

export type ResolveHostEnrollment = (hostName: string) => Promise<HostEnrollment>;

/**
 * Structured Tier 1 / Tier 2 evidence for the current run, extracted once from
 * `hunt_result` rather than quoting each SSE's `evidence_for`/`evidence_against` verbatim
 * (which repeats the same sentence once per SSE).
 */
const extractEvidenceSummary = (
  currentRun: Array<ReturnType<typeof significantSecurityEventAttachmentDataSchema.parse>>
): HuntEvidenceSummary => {
  let tier1HitCount: number | undefined;
  const tier2ByTechnique = new Map<string, HuntEvidenceTechnique>();

  for (const sse of currentRun) {
    const totalHits = sse.hunt_result?.tier1.counts.total_hits;
    if (totalHits !== undefined) {
      tier1HitCount = tier1HitCount === undefined ? totalHits : Math.max(tier1HitCount, totalHits);
    }
    for (const behavior of sse.hunt_result?.tier2?.behaviors ?? []) {
      if (behavior.execution?.hit !== true) {
        continue;
      }
      const existing = tier2ByTechnique.get(behavior.technique_id);
      const rowCount = behavior.execution.row_count;
      if (!existing || rowCount > existing.rowCount) {
        tier2ByTechnique.set(behavior.technique_id, {
          techniqueId: behavior.technique_id,
          techniqueName: behavior.technique_name,
          rowCount,
        });
      }
    }
  }

  return {
    tier1HitCount,
    tier2Confirmed: [...tier2ByTechnique.values()],
  };
};

export type RehydrateProcessSelectors = (args: {
  alerts: Array<{ alert_id: string; index: string }>;
  events: Array<{
    event_id: string;
    source_index: string;
    /** Present when the SSE attributed this event to a technique; preferred over a plain sample ref during dedupe. */
    matched?: { technique_id?: string };
  }>;
}) => Promise<ProcessSelector[]>;

/** A minimal, hitless state for a run the hunt child itself reported as clean. */
const buildCleanState = (runId: string, reportId: string): CurrentRunState => ({
  runId,
  reportId,
  hasConfirmedHit: false,
  titles: [],
  evidenceLines: [],
  techniques: [],
  hosts: [],
  processSelectors: [],
  hasNonHostEntity: false,
  hasIocIndicator: false,
  allEventsActionable: true,
  hasProcessBearingEvent: false,
  manualRemediation: [],
  evidence: { tier2Confirmed: [] },
});

/**
 * Reads current-run SSE attachments from a conversation and builds packaging state.
 *
 * The hunt child only writes an SSE attachment on a confirmed hit (hunt_coordinator
 * only returns `sse` when `has_confirmed_hit`), so a genuinely clean run leaves zero
 * current-run attachments — identical, from attachments alone, to a run packaging
 * never got to evaluate. `huntStatus`/`huntConfirmedHit` (the hunt child's own
 * verdict, threaded through as workflow inputs) disambiguate the two: a clean run
 * synthesizes a minimal hitless state (so `decidePackageReport` dismisses it and
 * `deriveCoverageSubjects` still records the sweep); anything else returns
 * undefined (run_incomplete).
 */
export const readCurrentRunState = async ({
  attachments,
  reportId,
  runId,
  huntStatus,
  huntConfirmedHit,
  resolveHostEnrollment,
  rehydrateProcessSelectors,
}: {
  attachments: VersionedAttachment[] | undefined;
  reportId: string;
  runId: string;
  /** The hunt child's own `status` output for this run (success/partial/failed). */
  huntStatus?: string;
  /** The hunt child's own `hit` output for this run. */
  huntConfirmedHit?: boolean;
  resolveHostEnrollment: ResolveHostEnrollment;
  rehydrateProcessSelectors: RehydrateProcessSelectors;
}): Promise<CurrentRunState | undefined> => {
  const sseAttachments = (attachments ?? []).filter((a) => a.type === SSE_ATTACHMENT_TYPE);
  const currentRun: Array<ReturnType<typeof significantSecurityEventAttachmentDataSchema.parse>> =
    [];

  for (const attachment of sseAttachments) {
    const raw = currentVersionData(attachment);
    const parsed = significantSecurityEventAttachmentDataSchema.safeParse(raw);
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
    if (huntStatus === 'success' && huntConfirmedHit === false) {
      return buildCleanState(runId, reportId);
    }
    return undefined;
  }

  const hasConfirmedHit = currentRun.some((sse) => sse.hunt_result?.has_confirmed_hit === true);
  const titles = [...new Set(currentRun.map((sse) => sse.title))];
  const evidenceLines = [
    ...new Set(currentRun.flatMap((sse) => [...sse.evidence_for, ...sse.evidence_against])),
  ];
  const evidence = extractEvidenceSummary(currentRun);

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
  // The hunt names where a hit can become a response action (`actionable_indices`: mappings
  // that carry `process.entity_id` or `process.pid`) on each SSE, so packaging reads the
  // evidence against what the customer's mappings say rather than a seed list. An empty
  // list means nothing in this run is host-scoped, which is the right reading when the
  // customer has no process telemetry.
  const matchesActionable = buildMatchesRequired([
    ...new Set(currentRun.flatMap((sse) => sse.hunt_result?.actionable_indices ?? [])),
  ]);
  const allEventsActionable = eventRefs.every((e) => matchesActionable(e.source_index));
  const hasProcessBearingEvent = eventRefs.some((e) => matchesActionable(e.source_index));
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
    allEventsActionable,
    hasProcessBearingEvent,
    manualRemediation,
    hosts,
    processSelectors,
    evidence,
  };
};
