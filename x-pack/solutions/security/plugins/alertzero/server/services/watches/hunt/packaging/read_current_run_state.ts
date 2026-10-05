/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { significantSecurityEventAttachmentDataSchema } from '../../../../../common/significant_security_event_schema';
import { significantSecurityEventAttachmentReadSchema } from '../../../../../common/significant_security_event_schema';
import type {
  CurrentRunHost,
  CurrentRunState,
  HuntEvidenceSummary,
  HuntEvidenceTechnique,
} from './types';

const SSE_ATTACHMENT_TYPE = 'security.significant_security_event';

type CurrentRunSse = ReturnType<typeof significantSecurityEventAttachmentDataSchema.parse>;

const currentVersionData = (attachment: VersionedAttachment): unknown => {
  const version = attachment.versions.find((v) => v.version === attachment.current_version);
  return version?.data;
};

/**
 * Structured Tier 1 / Tier 2 evidence for the current run, extracted once from
 * `hunt_result` rather than quoting each SSE's `evidence_for`/`evidence_against` verbatim
 * (which repeats the same sentence once per SSE).
 */
const extractEvidenceSummary = (currentRun: CurrentRunSse[]): HuntEvidenceSummary => {
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
 * The union of every SSE's hunt window. Each SSE of one run was searched in the same
 * window, so this is normally that window verbatim; the min/max is only defensive.
 */
const extractHuntWindow = (currentRun: CurrentRunSse[]): CurrentRunState['huntWindow'] => {
  let from: string | undefined;
  let to: string | undefined;
  for (const sse of currentRun) {
    const range = sse.hunt_result?.time_range;
    if (!range) continue;
    if (from === undefined || range.from < from) from = range.from;
    if (to === undefined || range.to > to) to = range.to;
  }
  return from !== undefined && to !== undefined ? { from, to } : undefined;
};

/**
 * Reads current-run SSE attachments from a conversation and builds packaging state.
 * Returns undefined when no current-run SSE is present (run_incomplete).
 */
export const readCurrentRunState = ({
  attachments,
  reportId,
  runId,
}: {
  attachments: VersionedAttachment[] | undefined;
  reportId: string;
  runId: string;
}): CurrentRunState | undefined => {
  const sseAttachments = (attachments ?? []).filter((a) => a.type === SSE_ATTACHMENT_TYPE);
  const currentRun: CurrentRunSse[] = [];

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

  const corroboratedTechniques = [
    ...new Set(
      currentRun
        .map((sse) => sse.corroborated_technique_id)
        .filter((techniqueId): techniqueId is string => techniqueId !== undefined)
    ),
  ];

  const hosts: CurrentRunHost[] = [
    ...new Set(
      currentRun.flatMap((sse) =>
        sse.entities
          .filter((e) => e.field === 'host.name' || e.field === 'host.hostname')
          .map((e) => e.value)
      )
    ),
  ].map((name) => ({ name }));

  const hasNonHostEntity = currentRun.some((sse) =>
    sse.entities.some((e) => e.field !== 'host.name' && e.field !== 'host.hostname')
  );
  const hasIocIndicator = currentRun.some((sse) =>
    sse.security_knowledge_indicators.some((ski) => ski.type === 'ioc')
  );
  const manualRemediation = [
    ...new Set(currentRun.flatMap((sse) => sse.maps_to_proposal?.manual_remediation ?? [])),
  ];
  const huntWindow = extractHuntWindow(currentRun);

  return {
    runId,
    reportId,
    hasConfirmedHit,
    titles,
    evidenceLines,
    techniques,
    corroboratedTechniques,
    hasNonHostEntity,
    hasIocIndicator,
    manualRemediation,
    hosts,
    evidence,
    ...(huntWindow ? { huntWindow } : {}),
  };
};
