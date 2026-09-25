/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { significantSecurityEventAttachmentDataSchema } from '../../../common/significant_security_event_schema';
import type { CurrentRunHost, CurrentRunState, ProcessSelector } from './types';

const SSE_ATTACHMENT_TYPE = 'security.significant_security_event';

const currentVersionData = (attachment: VersionedAttachment): unknown => {
  const version = attachment.versions.find((v) => v.version === attachment.current_version);
  return version?.data;
};

export type HostEnrollment =
  | { enrolled: true; agentId: string }
  | { enrolled: false };

export type ResolveHostEnrollment = (hostName: string) => Promise<HostEnrollment>;

export type RehydrateProcessSelectors = (args: {
  alerts: Array<{ alert_id: string; index: string }>;
  events: Array<{ event_id: string; source_index: string }>;
}) => Promise<ProcessSelector[]>;

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
    return undefined;
  }

  const hasConfirmedHit = currentRun.some((sse) => sse.hunt_result?.has_confirmed_hit === true);
  const titles = currentRun.map((sse) => sse.title);
  const evidenceLines = currentRun.flatMap((sse) => [
    ...sse.evidence_for,
    ...sse.evidence_against,
  ]);

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
    })),
  });

  return {
    runId,
    reportId,
    hasConfirmedHit,
    titles,
    evidenceLines,
    techniques,
    hosts,
    processSelectors,
  };
};
