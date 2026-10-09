/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { significantSecurityEventAttachmentDataSchema } from '../../../../../common/significant_security_event_schema';
import { significantSecurityEventAttachmentReadSchema } from '../../../../../common/significant_security_event_schema';
import type { ResolveHostEnrollment } from '../../../fleet/resolve_host_enrollment';
import { buildMatchesRequired } from '../common/matches_required';
import type { RehydrateProcessSelectors } from './rehydrate_process_selectors';
import type {
  CurrentRunFinding,
  CurrentRunHost,
  CurrentRunState,
  HuntEvidenceSummary,
  HuntEvidenceTechnique,
} from './types';

/** Rank order for picking the single most severe current-run SSE severity. Higher wins. */
const SEVERITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Highest-ranked severity across current-run SSEs; every SSE carries one, so this is never empty. */
const pickHighestSeverity = (severities: string[]): string | undefined =>
  severities.reduce<string | undefined>((highest, candidate) => {
    if (highest === undefined) {
      return candidate;
    }
    return (SEVERITY_RANK[candidate] ?? 0) > (SEVERITY_RANK[highest] ?? 0) ? candidate : highest;
  }, undefined);

const SSE_ATTACHMENT_TYPE = 'security.significant_security_event';

type ParsedSse = ReturnType<typeof significantSecurityEventAttachmentReadSchema.parse>;

/** The sentence the SSE mapper falls back to when no behavior supplied a hypothesis. */
const GENERIC_HYPOTHESIS_PREFIX = 'Hunt Watch evaluated report';

/** `T1078.004 (Cloud Accounts)`, the SKI value for a technique. */
const TECHNIQUE_LABEL = /^(T\d{4}(?:\.\d{3})?) \((.+)\)$/;

const toFinding = (sse: ParsedSse): CurrentRunFinding => ({
  title: sse.title,
  ...(sse.hypothesis_tested.startsWith(GENERIC_HYPOTHESIS_PREFIX)
    ? {}
    : { hypothesis: sse.hypothesis_tested }),
  severity: sse.severity,
  ...(sse.corroborated_technique_id
    ? { corroboratedTechniqueId: sse.corroborated_technique_id }
    : {}),
  eventRefs: (sse.events ?? []).map((event) => ({
    index: event.source_index,
    ...(event.matched?.technique_id ? { techniqueId: event.matched.technique_id } : {}),
  })),
  tier1Indices: (sse.hunt_result?.tier1.per_index ?? []).map((entry) => entry.index),
  behaviors: (sse.hunt_result?.tier2?.behaviors ?? []).flatMap((behavior) =>
    behavior.execution?.executed === true && behavior.validated_esql
      ? [
          {
            techniqueId: behavior.technique_id,
            ...(behavior.technique_name ? { techniqueName: behavior.technique_name } : {}),
            title: behavior.title,
            confidence: behavior.confidence,
            validatedEsql: behavior.validated_esql,
            rowCount: behavior.execution.row_count,
            hit: behavior.execution.hit,
          },
        ]
      : []
  ),
  ...(sse.hunt_result?.time_range ? { window: sse.hunt_result.time_range } : {}),
  evidenceLines: [...sse.evidence_for, ...sse.evidence_against],
  hosts: sse.entities
    .filter((e) => e.field === 'host.name' || e.field === 'host.hostname')
    .map((e) => e.value),
  users: sse.entities.filter((e) => e.field === 'user.name').map((e) => e.value),
});

const collectTechniqueNames = (currentRun: ParsedSse[]): Record<string, string> => {
  const names: Record<string, string> = {};
  for (const sse of currentRun) {
    for (const ski of sse.security_knowledge_indicators) {
      if (ski.type !== 'technique') continue;
      const match = TECHNIQUE_LABEL.exec(ski.value);
      if (match) names[match[1]] = match[2];
    }
    for (const behavior of sse.hunt_result?.tier2?.behaviors ?? []) {
      if (behavior.technique_name) names[behavior.technique_id] = behavior.technique_name;
    }
  }
  return names;
};

const currentVersionData = (attachment: VersionedAttachment): unknown => {
  const version = attachment.versions.find((v) => v.version === attachment.current_version);
  return version?.data;
};

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

  const findings = currentRun.map(toFinding);
  const techniqueNames = collectTechniqueNames(currentRun);
  const users = [...new Set(findings.flatMap((finding) => finding.users))];
  const window = findings.find((finding) => finding.window)?.window;

  const severity = pickHighestSeverity(currentRun.map((sse) => sse.severity));

  const corroboratedTechniques = [
    ...new Set(
      currentRun
        .map((sse) => sse.corroborated_technique_id)
        .filter((techniqueId): techniqueId is string => techniqueId !== undefined)
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
    sseCount: currentRun.length,
    hasConfirmedHit,
    titles,
    evidenceLines,
    techniques,
    findings,
    techniqueNames,
    users,
    ...(window ? { window } : {}),
    severity,
    corroboratedTechniques,
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
