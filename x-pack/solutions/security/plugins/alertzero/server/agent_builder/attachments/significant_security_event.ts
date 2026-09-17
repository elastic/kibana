/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  AttachmentTypeDefinition,
  AttachmentFormatContext,
} from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import { alertZeroAttachmentDataSchema } from './attachment_data_schema';

export const SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID =
  ALERTZERO_ATTACHMENT_TYPES.significantSecurityEvent;

const securityKnowledgeIndicatorSchema = z.object({
  type: z.string().max(64),
  value: z.string().max(2048),
  confidence: z.number().min(0).max(1).optional(),
});

const timelineEntrySchema = z.object({
  at: z.string().min(1).max(64),
  what: z.string().min(1).max(2000),
});

const evidenceItemSchema = z.string().max(2000);

const mapsToProposalSchema = z
  .object({
    category: z.string().max(256).optional(),
    impact: z.string().max(2000).optional(),
    confidence: z.number().min(0).max(1).optional(),
    actionWorkflowId: z.string().max(512).optional(),
    actionInput: z.record(z.string(), z.unknown()).optional(),
    manual_remediation: z.array(z.string().max(2000)).max(50).optional(),
  })
  .optional();

/**
 * Hunt-owned Significant Security Event payload, per the D39 field table
 * (docs/working-groups/dark-watch/artifacts/mvp-slice.md:541-561).
 */
export const significantSecurityEventAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  title: z.string().max(512),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  status: z.string().max(64),
  source_watch: z.string().max(256),
  capability: z.string().max(256),
  run_id: z.string().max(256),
  security_knowledge_indicators: z.array(securityKnowledgeIndicatorSchema).max(50),
  entities: z.array(z.string().max(2048)).max(50),
  alerts: z.array(z.string().max(2048)).max(50).optional(),
  events: z.array(z.string().max(2048)).max(50).optional(),
  timeline: z.array(timelineEntrySchema).max(50),
  hypothesis_tested: z.string().max(4000),
  evidence_for: z.array(evidenceItemSchema).max(50),
  evidence_against: z.array(evidenceItemSchema).max(50),
  maps_to_proposal: mapsToProposalSchema,
  evaluation_record_ref: z.string().max(512),
  truncated: z.boolean().optional(),
  truncated_original_count: z.number().optional(),
  report_revision: z.string().max(256).optional(),
});

export type SignificantSecurityEventAttachmentData = z.infer<
  typeof significantSecurityEventAttachmentDataSchema
>;

const formatSignificantSecurityEventForAgent = (
  data: SignificantSecurityEventAttachmentData
): string => {
  const lines: string[] = [
    `Significant security event: ${data.title}`,
    `Severity: ${data.severity} (confidence ${data.confidence})`,
    `Status: ${data.status}`,
    `Source watch: ${data.source_watch} / Capability: ${data.capability} / Run: ${data.run_id}`,
    '',
    `Hypothesis tested: ${data.hypothesis_tested}`,
    '',
    'Timeline:',
  ];

  if (data.timeline.length === 0) {
    lines.push('  no timeline entries recorded');
  } else {
    for (const entry of data.timeline) {
      lines.push(`  ${entry.at} — ${entry.what}`);
    }
  }

  lines.push('', `Evidence for: ${data.evidence_for.length}`);
  lines.push(`Evidence against: ${data.evidence_against.length}`);

  lines.push('', 'Entities:');
  if (data.entities.length === 0) {
    lines.push('  no entities recorded');
  } else {
    lines.push(`  ${data.entities.join(', ')}`);
  }

  return lines.join('\n');
};

const getAgentDescription = (): string => `
This attachment carries a Hunt-owned Significant Security Event.
The payload contains:
- title, severity, confidence, status: the headline classification of the event
- source_watch, capability, run_id: provenance of the hunt run that produced this event
- security_knowledge_indicators, entities, alerts, events: the supporting signals, already scoped
  and ordered by the hunt worker — do not re-classify or re-order them
- timeline: an ordered sequence of (at, what) entries describing what happened
- hypothesis_tested, evidence_for, evidence_against: the hunt's working hypothesis and its evidence
- maps_to_proposal, evaluation_record_ref: optional links into the proposal/evaluation subsystem

Quote the \`what\` field of timeline entries verbatim rather than re-classifying or summarizing
them into different categories.

## INLINE RENDERING (REQUIRED)
When a ${SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID} attachment is present in the conversation, you MUST render it inline using the exact custom XML element shown below. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename, translate, or abbreviate them.

Assemble the tag by substituting \`ATTACHMENT_ID\` with the value of the attachment's \`attachment_id\` field from the conversation's attachment manifest, and \`VERSION\` with the value of the \`current_version\` field:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

Rules:
- Copy \`attachment_id\` and \`current_version\` VERBATIM from the manifest. Never invent, guess, or rewrite them.
- Put the \`<render_attachment>\` tag on its OWN LINE, with a blank line before and after it. Do not wrap it in backticks, quotes, code fences, or surrounding prose.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the event card first.
- Render each ${SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID} attachment at most once per turn.
`;

export const createSignificantSecurityEventAttachmentType = (): AttachmentTypeDefinition => ({
  id: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
  validate: (input) => {
    const parseResult = significantSecurityEventAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>, _context: AttachmentFormatContext) => {
    const parseResult = significantSecurityEventAttachmentDataSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(
        `Invalid significant security event attachment data for attachment ${attachment.id}`
      );
    }
    const data = parseResult.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatSignificantSecurityEventForAgent(data),
      }),
    };
  },
  getAgentDescription,
});
