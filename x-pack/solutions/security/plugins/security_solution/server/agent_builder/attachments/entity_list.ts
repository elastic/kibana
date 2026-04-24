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

const entityListAttachmentDataSchema = securityAttachmentDataSchema.extend({
  entities: z.array(entityListRowSchema).min(1).max(100),
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
      `A security entity list attachment is for when the user asked for a **list**, **table**, **ranking**, **top N**, or otherwise a **set of entities** (plural / scan-and-compare framing), including **show**/**see**/**give me** **multiple** or **several** entities, **riskiest/top entities**, **entities in the system**, and **one message that names several entity kinds** (e.g. **hosts and users**). Put **every** matching entity in \`data.entities\` — **one or more** rows is valid (a list question can return a single row; still use this type so the user gets the **entities table** Canvas, not the flyout-style card). **Do not** use type "${SecurityAgentBuilderAttachments.entityAnalyticsDashboard}" for this — that type is only when they want the **Entity Analytics home/overview product page** in Canvas, not a generic multi-entity answer. For **one particular** entity, **details**, **profile**, or **entity card** language without list framing, use type "${SecurityAgentBuilderAttachments.entityCard}" instead. Create with \`attachments.add\`, type "${SecurityAgentBuilderAttachments.entityList}", JSON with "entities" (array of entity_type, entity_id, plus optional fields from \`security.get_entity\` / \`security.search_entities\`). **After** a successful add, the assistant message **must** include a markdown line \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` (values from the tool result) or the user cannot open Preview/Canvas.`,
  };
};
