/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  entityCardAttachmentDataSchema,
  type EntityCardAttachmentData,
} from '../../../common/agent_builder/entity_card_attachment_schema';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools/entity_analytics/entity_risk_score_tool';

const formatEntityCardForAgent = (attachmentId: string, data: EntityCardAttachmentData): string => {
  const display = data.entity_name ?? data.entity_id;
  const risk =
    data.risk_score_norm != null
      ? `${data.risk_score_norm}${data.risk_level ? ` (${data.risk_level})` : ''}`
      : '—';
  const crit = data.criticality ?? '—';
  const lines = [
    `Entity card "${data.attachmentLabel ?? display}" (entityCardAttachment.id: "${attachmentId}")`,
    `Type: ${data.entity_type} | EUID: ${data.entity_id} | Name: ${display}`,
    `Risk (norm / level): ${risk} | Criticality: ${crit}`,
  ];
  if (data.data_source) {
    lines.push(`Data source: ${data.data_source}`);
  }
  if (data.watchlist_names?.length) {
    lines.push(`Watchlists: ${data.watchlist_names.join(', ')}`);
  }
  if (data.risk_score_updated_at) {
    lines.push(`Risk score updated at: ${data.risk_score_updated_at}`);
  }
  if (data.is_entity_in_store != null) {
    lines.push(`Entity in store: ${data.is_entity_in_store}`);
  }
  if (data.risk_note) {
    lines.push(
      `Risk context: ${data.risk_note.slice(0, 500)}${data.risk_note.length > 500 ? '…' : ''}`
    );
  }
  if (data.resolution?.headline || data.resolution?.status) {
    lines.push(
      `Resolution: ${[data.resolution.headline, data.resolution.status]
        .filter(Boolean)
        .join(' — ')}`
    );
  }
  if (data.insights?.length) {
    lines.push(`Insights: ${data.insights.map((i) => i.title).join('; ')}`);
  }
  return lines.join('\n');
};

export const createEntityCardAttachmentType = (): AttachmentTypeDefinition<
  typeof SecurityAgentBuilderAttachments.entityCard,
  EntityCardAttachmentData
> => ({
  id: SecurityAgentBuilderAttachments.entityCard,
  validate: (input) => {
    const parseResult = entityCardAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatEntityCardForAgent(attachment.id, attachment.data),
    }),
  }),
  getTools: () => [SECURITY_ENTITY_RISK_SCORE_TOOL_ID],
  getAgentDescription: () =>
    `Use type "${SecurityAgentBuilderAttachments.entityCard}" when the user cares about **one particular** entity (named EUID, **this** host/user, **details**, **profile**, **entity card**, **flyout-style** summary) and they are **not** asking for a **list** or **table** of entities — then the rich UI should be the **entity flyout-style card** Canvas (for host/user/service, Preview opens the **same live overview** as the Entity Analytics entity flyout: summary grid, tabs, risk summary, visualizations, resolution, insights, observed data (assistant-backed **highlights** are only in the full Security flyout, not in chat Canvas); generic entities still use the compact snapshot fields). If they asked for a **list** / **ranking** / plural **entities** (even if only one row matches), use "${SecurityAgentBuilderAttachments.entityList}" instead. After \`security.get_entity\`, call \`attachments.add\` with this type and JSON (entity_type, entity_id, plus optional fields from security.get_entity: entity_name, data_source, watchlist_names, criticality, field_rows, first_seen, last_activity, risk_score_norm, risk_level, risk_note, risk_inputs, resolution, insights). Then output in markdown \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` from the tool result so Preview/Canvas appears.`,
});
