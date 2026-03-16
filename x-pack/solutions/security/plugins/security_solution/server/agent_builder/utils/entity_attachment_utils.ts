/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

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

interface EntityRef {
  entityType: string;
  entityId: string;
}

export const addOrUpdateEntityAttachment = async (
  attachments: AttachmentStateManager,
  entities: EntityRef[],
  description: string
): Promise<void> => {
  const attachmentData = { attachmentLabel: 'Entity', entities };
  const existingAttachment = attachments.get(ENTITY_ATTACHMENT_CONVERSATION_ID);
  console.log(`Existing attachment: ${JSON.stringify(existingAttachment)}`);
  if (existingAttachment) {
    console.log(`Updating existing entity attachment with data: ${JSON.stringify(attachmentData)}`);
    // TODO; merge entities if needed
    await attachments.update(ENTITY_ATTACHMENT_CONVERSATION_ID, {
      data: attachmentData,
    });
  } else {
    console.log(`Adding new entity attachment with data: ${JSON.stringify(attachmentData)}`);
    await attachments.add({
      id: ENTITY_ATTACHMENT_CONVERSATION_ID,
      type: SecurityAgentBuilderAttachments.entity,
      data: attachmentData,
      description,
    });
  }
};
