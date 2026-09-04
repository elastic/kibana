/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import { SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID } from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const scoreTypeSchema = z.enum(['base', 'resolution']);

const riskScoreHistoryAttachmentEntrySchema = z.object({
  '@timestamp': z.string().min(1),
  calculated_score_norm: z.number(),
  calculated_level: z.string().min(1),
  calculated_score: z.number().optional(),
  score_type: scoreTypeSchema.optional(),
  category_1_score: z.number().optional(),
  category_1_count: z.number().int().optional(),
});

const entityRiskScoreHistoryAttachmentDataSchema = securityAttachmentDataSchema.extend({
  identifierType: IdentifierType,
  identifier: z.string().min(1),
  entityStoreId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  bucketInterval: z.string().min(1),
  scoreType: scoreTypeSchema.optional(),
  entries: z.array(riskScoreHistoryAttachmentEntrySchema),
});

type EntityRiskScoreHistoryAttachmentData = z.infer<
  typeof entityRiskScoreHistoryAttachmentDataSchema
>;

const formatHistoryForAgent = (id: string, data: EntityRiskScoreHistoryAttachmentData): string => {
  const { identifierType, identifier, entityStoreId, from, to, bucketInterval, entries } = data;
  const first = entries[0];
  const last = entries[entries.length - 1];
  const trendSummary =
    first && last
      ? `First score: ${first.calculated_score_norm} (${first['@timestamp']}); ` +
        `latest score: ${last.calculated_score_norm} (${last['@timestamp']}); ` +
        `${entries.length} point(s).`
      : 'No history points in range.';

  return [
    `Risk score history chart (attachment id: ${id})`,
    `Entity: ${identifierType} "${identifier}" (${entityStoreId})`,
    `Time window: ${from} → ${to} (bucket interval ${bucketInterval})`,
    trendSummary,
  ].join('\n');
};

export const createEntityRiskScoreHistoryAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.entityRiskScoreHistory,
    validate: (input) => {
      const parseResult = entityRiskScoreHistoryAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatHistoryForAgent(
          attachment.id,
          attachment.data as EntityRiskScoreHistoryAttachmentData
        ),
      }),
    }),
    getTools: () => [SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID],
    getAgentDescription: () => {
      return `A ${SecurityAgentBuilderAttachments.entityRiskScoreHistory} attachment renders the risk score history chart for a single security entity inline in chat.

## INLINE RENDERING (REQUIRED)
This attachment is emitted by the \`${SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID}\` tool, whose \`other\` result includes a pre-formatted \`renderTag\` string. To show the chart, copy that \`renderTag\` string VERBATIM onto its own line — byte-for-byte, including the quoting — with a blank line before and after it, and BEFORE your prose. Do NOT assemble the tag yourself from \`attachmentId\` and \`version\`, and never derive the id from the entity name, EUID, or attachment type name.

Rules:
- The chart IS the visualization — do not restate every history point as a markdown table. Keep prose to a short trend summary (increasing / decreasing / stable, significant jumps, what to investigate next).
- Entries are date_histogram buckets; the tool result's \`bucketInterval\` is the histogram bucket size (not the lookback window). A single chart point means one bucket had data (peak score in that period), not that only one scoring run ever existed.
- Render each ${SecurityAgentBuilderAttachments.entityRiskScoreHistory} attachment at most once per turn.
- The preview is compact; the full interactive risk history (point-in-time contributions) lives in the Security entity flyout and is reached from the preview's "Open full risk history" affordance.`;
    },
  };
};
