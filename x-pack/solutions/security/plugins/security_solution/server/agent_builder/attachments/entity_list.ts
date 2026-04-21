/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const entityListRowSchema = z.object({
  entity_type: z.enum(['host', 'user', 'service', 'generic']),
  entity_id: z.string().min(1),
  entity_name: z.string().optional(),
  source: z.unknown().optional(),
  risk_score_norm: z.number().optional(),
  risk_level: z.string().optional(),
  criticality: z.string().optional(),
  first_seen: z.string().optional(),
  last_activity: z.string().optional(),
});

const entityListAttachmentDataSchema = securityAttachmentDataSchema
  .extend({
    entities: z.array(entityListRowSchema).max(100),
  })
  .superRefine((val, ctx) => {
    if (val.entities.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entities'],
        message: `security.entity_list requires at least two entities in "entities". For exactly one entity (for example the single riskiest host or any one EUID the user cares about), use attachments.add with type "${SecurityAgentBuilderAttachments.entityCard}" instead.`,
      });
    }
  });

export type EntityListAttachmentData = z.infer<typeof entityListAttachmentDataSchema>;

const formatEntityListForAgent = (attachmentId: string, data: EntityListAttachmentData): string => {
  const lines = data.entities.map((e, index) => {
    const name = e.entity_name ?? e.entity_id;
    const risk = e.risk_score_norm != null ? String(e.risk_score_norm) : '—';
    const level = e.risk_level ?? '—';
    const crit = e.criticality ?? '—';
    return `${index + 1}. [${e.entity_type}] ${name} (EUID: ${
      e.entity_id
    }) — risk: ${risk}, level: ${level}, criticality: ${crit}`;
  });

  return `Entity list "${
    data.attachmentLabel ?? 'Entities'
  }" (entityListAttachment.id: "${attachmentId}", count: ${data.entities.length})
${lines.join('\n')}`;
};

/**
 * Creates the definition for the `security.entity_list` attachment type.
 * Renders as a rich table in Agent Builder canvas (UI registered in the Security plugin).
 */
export const createEntityListAttachmentType = (): AttachmentTypeDefinition<
  typeof SecurityAgentBuilderAttachments.entityList,
  EntityListAttachmentData
> => {
  return {
    id: SecurityAgentBuilderAttachments.entityList,
    validate: (input) => {
      const parseResult = entityListAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatEntityListForAgent(attachment.id, attachment.data),
      }),
    }),
    getTools: () => [],
    getAgentDescription: () =>
      `A security entity list attachment is only for **two or more** investigated entities (host, user, service, or generic): EUIDs plus optional risk scores, risk levels, asset criticality, and lifecycle timestamps. The payload **must** include at least two rows in "entities"; otherwise validation fails — for a **single** entity use type "${SecurityAgentBuilderAttachments.entityCard}" (entity card / flyout-style Canvas), not this type. In the conversation UI this attachment opens a **multi-row table** in Canvas. Summarize the key findings in plain text and reference the attachment id. Create with \`attachments.add\`, type "${SecurityAgentBuilderAttachments.entityList}", JSON with "entities" (array of objects with entity_type, entity_id, and optional fields from \`security.get_entity\` / \`security.search_entities\`).`,
  };
};
