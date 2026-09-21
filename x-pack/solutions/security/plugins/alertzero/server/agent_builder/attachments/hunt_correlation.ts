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

export const HUNT_CORRELATION_ATTACHMENT_ID = ALERTZERO_ATTACHMENT_TYPES.huntCorrelation;

const anchorSchema = z.object({
  kind: z.enum(['hash', 'ioc_set_hash', 'actor']),
  value: z.string().min(1).max(2048),
});

const diamondScoreSchema = z.object({
  vertex: z.enum(['adversary', 'capability', 'infrastructure', 'victim']),
  related_report_id: z.string().min(1).max(512),
  score: z.number().min(0).max(1),
});

const thresholdsSchema = z.object({
  anchor_match: z.number().min(0).max(1),
  diamond_vertex: z.number().min(0).max(1),
});

/**
 * Report-to-report correlation evidence, per D39
 * (docs/working-groups/dark-watch/artifacts/mvp-slice.md:666-682).
 *
 * Note: `diamond_scores` is capped at 100 rows, not the usual 50 — a deliberate exception
 * because each report can score against up to four Diamond Model vertices per related report.
 */
export const huntCorrelationAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  anchors: z.array(anchorSchema).max(50),
  diamond_scores: z.array(diamondScoreSchema).max(100),
  thresholds: thresholdsSchema,
  self_match_excluded: z.literal(true),
  report_revision: z.string().min(1).max(256).optional(),
});

export type HuntCorrelationAttachmentData = z.infer<typeof huntCorrelationAttachmentDataSchema>;

const formatHuntCorrelationForAgent = (data: HuntCorrelationAttachmentData): string => {
  const lines: string[] = ['Hunt correlation evidence', '', 'Anchors:'];

  if (data.anchors.length === 0) {
    lines.push('  no anchors recorded');
  } else {
    const anchorsByKind = new Map<string, string[]>();
    for (const anchor of data.anchors) {
      const values = anchorsByKind.get(anchor.kind) ?? [];
      values.push(anchor.value);
      anchorsByKind.set(anchor.kind, values);
    }
    for (const [kind, values] of anchorsByKind) {
      lines.push(`  ${kind}: ${values.join(', ')}`);
    }
  }

  lines.push('', 'Diamond scores:');
  if (data.diamond_scores.length === 0) {
    lines.push('  no diamond scores recorded');
  } else {
    for (const score of data.diamond_scores) {
      lines.push(`  ${score.vertex}: ${score.related_report_id} (score ${score.score})`);
    }
  }

  lines.push(
    '',
    `Thresholds: anchor_match=${data.thresholds.anchor_match}, ` +
      `diamond_vertex=${data.thresholds.diamond_vertex}`
  );

  return lines.join('\n');
};

const getAgentDescription = (): string => `
This attachment carries report-to-report correlation evidence, built from the Diamond Model of
Intrusion Analysis (adversary, capability, infrastructure, victim).
The payload contains:
- anchors: hard matches (hash, ioc_set_hash, or actor) linking this report to others
- diamond_scores: a per-vertex similarity score against each related report, one row per
  (vertex, related_report_id) pair — a related report can appear more than once, once per vertex
  it scores against
- thresholds: the anchor_match and diamond_vertex thresholds used to decide whether a correlation
  is significant
- self_match_excluded: always true by schema — a report is never correlated against itself

## INLINE RENDERING (REQUIRED)
When a ${HUNT_CORRELATION_ATTACHMENT_ID} attachment is present in the conversation, you MUST render it inline using the exact custom XML element shown below. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename, translate, or abbreviate them.

Assemble the tag by substituting \`ATTACHMENT_ID\` with the value of the attachment's \`attachment_id\` field from the conversation's attachment manifest, and \`VERSION\` with the value of the \`current_version\` field:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

Rules:
- Copy \`attachment_id\` and \`current_version\` VERBATIM from the manifest. Never invent, guess, or rewrite them.
- Put the \`<render_attachment>\` tag on its OWN LINE, with a blank line before and after it. Do not wrap it in backticks, quotes, code fences, or surrounding prose.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the correlation table first.
- Render each ${HUNT_CORRELATION_ATTACHMENT_ID} attachment at most once per turn.
`;

export const createHuntCorrelationAttachmentType = (): AttachmentTypeDefinition => ({
  id: HUNT_CORRELATION_ATTACHMENT_ID,
  // System-produced evidence: the agent must not create or update these via the
  // attachment_add/update tools. Also gates the attachment_read path, which only
  // invokes format() for readonly types.
  isReadonly: true,
  validate: (input) => {
    const parseResult = huntCorrelationAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>, _context: AttachmentFormatContext) => {
    const parseResult = huntCorrelationAttachmentDataSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(`Invalid hunt correlation attachment data for attachment ${attachment.id}`);
    }
    const data = parseResult.data;
    return {
      getRepresentation: () => ({ type: 'text', value: formatHuntCorrelationForAgent(data) }),
    };
  },
  getAgentDescription,
});
