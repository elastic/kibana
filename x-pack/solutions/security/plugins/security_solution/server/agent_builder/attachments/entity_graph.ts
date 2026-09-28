/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_GET_ENTITY_GRAPH_TOOL_ID } from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const entityGraphAttachmentDataSchema = securityAttachmentDataSchema.extend({
  identifierType: IdentifierType,
  identifier: z.string().min(1),
  /** Canonical Entity Store `entity.id` (EUID) the graph is centered on. */
  entityStoreId: z.string().min(1),
  timeRange: z.object({
    from: z.string().min(1),
    to: z.string().min(1),
  }),
});

type EntityGraphAttachmentData = z.infer<typeof entityGraphAttachmentDataSchema>;

const formatEntityGraphForAgent = (id: string, data: EntityGraphAttachmentData): string => {
  const { identifierType, identifier, entityStoreId, timeRange } = data;
  return [
    `Relationship graph preview (attachment id: ${id})`,
    `Entity: ${identifierType} "${identifier}" (${entityStoreId})`,
    `Time window: ${timeRange.from} → ${timeRange.to}`,
  ].join('\n');
};

export const createEntityGraphAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.entityGraph,
    validate: (input) => {
      const parseResult = entityGraphAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatEntityGraphForAgent(
          attachment.id,
          attachment.data as EntityGraphAttachmentData
        ),
      }),
    }),
    getTools: () => [SECURITY_GET_ENTITY_GRAPH_TOOL_ID],
    getAgentDescription: () => {
      return `A ${SecurityAgentBuilderAttachments.entityGraph} attachment renders the relationship-graph preview for a single security entity inline in chat.

## INLINE RENDERING (REQUIRED)
This attachment is emitted by the \`${SECURITY_GET_ENTITY_GRAPH_TOOL_ID}\` tool, whose \`other\` result includes a pre-formatted \`renderTag\` string. To show the graph preview, copy that \`renderTag\` string VERBATIM onto its own line — byte-for-byte, including the quoting — with a blank line before and after it, and BEFORE your prose. Do NOT assemble the tag yourself from \`attachmentId\` and \`version\`, and never derive the id from the user's prompt.

Rules:
- The graph preview IS the visualization — do not restate its nodes/edges as markdown. Keep prose to a short summary (what the graph shows, what to investigate next).
- Render each ${SecurityAgentBuilderAttachments.entityGraph} attachment at most once per turn.
- The preview is compact; the full interactive graph investigation lives in the Security UI and is reached from the preview's "Open full graph" affordance — do not attempt to embed the full investigation in chat.`;
    },
  };
};
