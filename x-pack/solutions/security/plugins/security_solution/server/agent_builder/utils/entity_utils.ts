/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import { securityAttachmentDataSchema } from '../attachments/security_attachment_data_schema';

export const ENTITY_STORE_ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const ENTITY_STORE_ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_ATTACHMENT_CONVERSATION_ID = 'entity_attachment_conversation_id';

export const getRowValue = (
  columns: Array<{ name: string }>,
  row: unknown[],
  columnName: string
): unknown => {
  const idx = columns.findIndex((col) => col.name === columnName);
  return idx >= 0 ? row[idx] : undefined;
};

export const ENTITY_STORE_RISK_SCORE_FIELD = 'entity.risk.calculated_score_norm';

export const entityAttachmentDataSchema = securityAttachmentDataSchema.extend({
  entities: z.array(
    z.object({
      entityType: IdentifierType,
      entityId: z.string().min(1),
      riskScore: z.number().optional(),
    })
  ),
});

export type EntityAttachmentData = z.infer<typeof entityAttachmentDataSchema>;

interface AddOrUpdateEntityAttachmentParams {
  attachments: AttachmentStateManager;
  entities: EntityAttachmentData['entities'];
  description?: string;
}

export const addOrUpdateEntityAttachment = async ({
  attachments,
  entities,
  description,
}: AddOrUpdateEntityAttachmentParams) => {
  const existingAttachment = attachments.get(ENTITY_ATTACHMENT_CONVERSATION_ID);

  if (existingAttachment) {
    // Update the existing attachment data by merging entities
    const existingData = existingAttachment.data.data as EntityAttachmentData;
    const existingEuids = new Set((existingData.entities ?? []).map((e) => e.entityId));
    const newEntities = entities.filter((e) => !existingEuids.has(e.entityId));

    if (newEntities.length === 0) {
      // No need to update the attachment
      return;
    }

    return attachments.update(ENTITY_ATTACHMENT_CONVERSATION_ID, {
      description,
      data: {
        attachmentLabel: 'Entity',
        entities: [...(existingData.entities ?? []), ...newEntities],
      },
    });
  }

  // Otherwise, add attachment
  return attachments.add({
    id: ENTITY_ATTACHMENT_CONVERSATION_ID,
    type: SecurityAgentBuilderAttachments.entity,
    data: { attachmentLabel: 'Entity', entities },
    description,
  });
};
