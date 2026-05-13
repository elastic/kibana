/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { z } from '@kbn/zod/v4';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const pipelineVolumeSchema = z.object({
  current24h: z.number().int().min(0),
  baseline: z.number().int().min(0).nullable(),
  lastEventMs: z.number().nullable().optional(),
  hoursSilent: z.number().nullable().optional(),
  silenceDetected: z.boolean(),
  criticalSilence: z.boolean().optional(),
  dropPercent: z.number().nullable().optional(),
  dropSeverity: z.enum(['none', 'warning', 'critical']).optional(),
  latencyP95Ms: z.number().nullable().optional(),
});

const pipelineRowSchema = z.object({
  pipeline_name: z.string().min(1).max(512),
  status: z.enum(['healthy', 'critical']),
  failure_rate: z.string().max(32),
  latency_status: z.enum(['ok', 'warning', 'critical', 'unknown']).optional(),
  latency_sla_ms: z.number().int().min(0).optional(),
  volume: pipelineVolumeSchema.nullish(),
});

const siemReadinessContinuityAttachmentDataSchema = securityAttachmentDataSchema.extend({
  pipelines: z.array(pipelineRowSchema).max(200),
  summary: z.string().max(1000).optional(),
});

export type SiemReadinessContinuityAttachmentData = z.infer<
  typeof siemReadinessContinuityAttachmentDataSchema
>;

const isContinuityAttachmentData = (data: unknown): data is SiemReadinessContinuityAttachmentData =>
  siemReadinessContinuityAttachmentDataSchema.safeParse(data).success;

const formatContinuityForAgent = (
  attachmentId: string,
  data: SiemReadinessContinuityAttachmentData
): string => {
  const lines = [`SIEM Readiness – Ingest Pipelines snapshot (id: "${attachmentId}")`];
  for (const p of data.pipelines) {
    const parts = [
      `Pipeline: ${p.pipeline_name}`,
      `Status: ${p.status}`,
      `Failure rate: ${p.failure_rate}`,
    ];
    if (p.latency_status != null) {
      const slaLabel = p.latency_sla_ms != null ? ` (SLA ${p.latency_sla_ms / 1000}s)` : '';
      parts.push(`Latency: ${p.latency_status}${slaLabel}`);
    }
    if (p.volume != null) {
      parts.push(`Volume (24h): ${p.volume.current24h}`);
      if (p.volume.baseline != null) parts.push(`Baseline: ${p.volume.baseline}/day`);
      if (p.volume.criticalSilence) {
        const hrs =
          p.volume.hoursSilent != null ? ` (${p.volume.hoursSilent.toFixed(1)}h silent)` : '';
        parts.push(`CRITICAL SILENCE${hrs}`);
      } else if (p.volume.silenceDetected) {
        parts.push('SILENT');
      }
      if (p.volume.dropSeverity != null && p.volume.dropSeverity !== 'none') {
        const pct = p.volume.dropPercent != null ? ` ${p.volume.dropPercent}%` : '';
        parts.push(`VOLUME DROP${pct} [${p.volume.dropSeverity.toUpperCase()}]`);
      }
      if (p.volume.latencyP95Ms != null) {
        parts.push(`Latency p95: ${Math.round(p.volume.latencyP95Ms / 1000)}s`);
      }
    }
    lines.push(parts.join(' | '));
  }
  if (data.summary) {
    lines.push(`Summary: ${data.summary}`);
  }
  return lines.join('\n');
};

export const createSiemReadinessContinuityAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.siemReadinessContinuity,
  validate: (input) => {
    const result = siemReadinessContinuityAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const { data } = attachment;
    if (!isContinuityAttachmentData(data)) {
      throw new Error(
        `Invalid SIEM readiness continuity attachment data for attachment ${attachment.id}`
      );
    }
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatContinuityForAgent(attachment.id, data),
      }),
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    `A SIEM Readiness – Ingest Pipelines attachment. It renders a table of all ingest pipelines with their health status, failure rate, volume trend, and ingestion latency. Use this attachment when the user asks about pipeline health, pipeline failures, data stream silence, volume drops, or ingestion latency issues.

## Field mapping (tool camelCase → attachment snake_case)
The continuity tool returns camelCase fields; the attachment schema uses snake_case. Map as follows:
- \`name\` → \`pipeline_name\`
- \`status\` → \`status\`
- \`failureRate\` → \`failure_rate\`
- \`latencyStatus\` → \`latency_status\`
- \`latencySlaMs\` → \`latency_sla_ms\`
- \`volume\` → \`volume\` (object, pass through as-is — all keys are already snake_case)

## Required fields per pipeline row
- \`pipeline_name\`: exact pipeline name (string, 1–512 chars)
- \`status\`: \`"healthy"\` or \`"critical"\`
- \`failure_rate\`: formatted string, e.g. \`"2.5%"\`

## Optional per-pipeline fields
- \`latency_status\`: \`"ok"\` | \`"warning"\` | \`"critical"\` | \`"unknown"\`
- \`latency_sla_ms\`: category SLA in milliseconds (e.g. 300000 for Endpoint/Identity, 900000 for Network/Cloud, 3600000 for Application/SaaS)
- \`volume\`: object with the following sub-fields (all optional unless noted):
  - \`current24h\` (required): doc count in the most recent calendar day
  - \`baseline\`: 7-day average daily doc count; null when no history
  - \`lastEventMs\`: epoch ms of the most recent indexed document; null when unavailable
  - \`hoursSilent\`: hours since last event (fractional); null when lastEventMs is null
  - \`silenceDetected\`: true when current24h = 0 and baseline > 0
  - \`criticalSilence\`: true when silence exceeds 2× estimated inter-event interval — statistically significant gap even for low-volume pipelines
  - \`dropPercent\`: % the 24h count is below baseline (0–100); null when no baseline
  - \`dropSeverity\`: \`"none"\` | \`"warning"\` (drop ≥ 50%) | \`"critical"\` (drop ≥ 90%)
  - \`latencyP95Ms\`: raw p95 ingestion latency in ms (event.ingested − event.created); null when unavailable

## Optional top-level field
- \`summary\`: prose summary of overall pipeline health (max 1000 chars). Mention total critical count, any silent pipelines, and latency breaches.

## Inline rendering (REQUIRED after attachments.add)
A successful \`attachments.add\` returns \`{ id, current_version }\`. Emit the tag on its OWN LINE, with a BLANK LINE before and after it:

    <render_attachment id="<attachment_id from attachments.add>" version="<version from attachments.add>" />

Rules: copy \`id\` and \`current_version\` VERBATIM. Do not wrap in backticks or code fences.`,
});
