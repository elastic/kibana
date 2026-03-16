/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { EntityAttachmentData } from './entity_utils';
import { addOrUpdateEntityAttachment, ENTITY_ATTACHMENT_CONVERSATION_ID } from './entity_utils';
import type { AttachmentType } from '@kbn/agent-builder-common/attachments';

const makeExistingAttachmentReturn = (
  entities: Array<{ entityType: string; entityId: string; riskScore?: number }>
) => ({
  id: ENTITY_ATTACHMENT_CONVERSATION_ID,
  version: 1,
  type: SecurityAgentBuilderAttachments.entity as unknown as AttachmentType,
  data: {
    version: 1,
    data: { attachmentLabel: 'Entity', entities },
    created_at: '2024-01-01T00:00:00Z',
    content_hash: 'abc123',
  },
});

describe('addOrUpdateEntityAttachment', () => {
  let attachments: ReturnType<typeof agentBuilderMocks.tools.createHandlerContext>['attachments'];

  beforeEach(() => {
    attachments = agentBuilderMocks.tools.createHandlerContext().attachments;
  });

  describe('when no existing attachment', () => {
    it('calls attachments.add with all entities including riskScore', async () => {
      attachments.get.mockReturnValue(undefined);
      const entities = [
        { entityType: 'host', entityId: 'host:server1', riskScore: 85.0 },
        { entityType: 'user', entityId: 'user:alice' },
      ] as EntityAttachmentData['entities'];

      await addOrUpdateEntityAttachment({
        attachments,
        entities,
        description: 'test description',
      });

      expect(attachments.add).toHaveBeenCalledTimes(1);
      expect(attachments.add).toHaveBeenCalledWith({
        id: ENTITY_ATTACHMENT_CONVERSATION_ID,
        type: SecurityAgentBuilderAttachments.entity,
        data: { attachmentLabel: 'Entity', entities },
        description: 'test description',
      });
      expect(attachments.update).not.toHaveBeenCalled();
    });
  });

  describe('when an existing attachment is present', () => {
    it('calls attachments.update with merged list when there is no EUID overlap', async () => {
      const existingEntities = [{ entityType: 'host', entityId: 'host:server1' }];
      attachments.get.mockReturnValue(makeExistingAttachmentReturn(existingEntities));

      const newEntities = [
        { entityType: 'user', entityId: 'user:alice' },
        { entityType: 'host', entityId: 'host:server2' },
      ] as EntityAttachmentData['entities'];

      await addOrUpdateEntityAttachment({
        attachments,
        entities: newEntities,
        description: 'updated description',
      });

      expect(attachments.update).toHaveBeenCalledTimes(1);
      expect(attachments.update).toHaveBeenCalledWith(ENTITY_ATTACHMENT_CONVERSATION_ID, {
        data: {
          attachmentLabel: 'Entity',
          entities: [...existingEntities, ...newEntities],
        },
        description: 'updated description',
      });
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('calls attachments.update with only non-duplicate entities when there is partial EUID overlap', async () => {
      const existingEntities = [
        { entityType: 'host', entityId: 'host:server1' },
        { entityType: 'user', entityId: 'user:alice' },
      ];
      attachments.get.mockReturnValue(makeExistingAttachmentReturn(existingEntities));

      const incomingEntities = [
        { entityType: 'host', entityId: 'host:server1' }, // duplicate
        { entityType: 'host', entityId: 'host:server2' }, // new
      ] as EntityAttachmentData['entities'];

      await addOrUpdateEntityAttachment({
        attachments,
        entities: incomingEntities,
        description: 'test description',
      });

      expect(attachments.update).toHaveBeenCalledTimes(1);
      expect(attachments.update).toHaveBeenCalledWith(ENTITY_ATTACHMENT_CONVERSATION_ID, {
        data: {
          attachmentLabel: 'Entity',
          entities: [
            ...existingEntities,
            { entityType: 'host', entityId: 'host:server2' }, // only the non-duplicate
          ],
        },
        description: 'test description',
      });
    });

    it('does not call attachments.update when all incoming entities already exist', async () => {
      const existingEntities = [
        { entityType: 'host', entityId: 'host:server1' },
        { entityType: 'user', entityId: 'user:alice' },
      ];
      attachments.get.mockReturnValue(makeExistingAttachmentReturn(existingEntities));

      const duplicateEntities = [
        { entityType: 'host', entityId: 'host:server1' },
        { entityType: 'user', entityId: 'user:alice' },
      ] as EntityAttachmentData['entities'];

      await addOrUpdateEntityAttachment({
        attachments,
        entities: duplicateEntities,
        description: 'test description',
      });

      expect(attachments.update).not.toHaveBeenCalled();
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('does not call attachments.update when the incoming entities list is empty', async () => {
      const existingEntities = [{ entityType: 'host', entityId: 'host:server1' }];
      attachments.get.mockReturnValue(makeExistingAttachmentReturn(existingEntities));

      await addOrUpdateEntityAttachment({ attachments, entities: [] });

      expect(attachments.update).not.toHaveBeenCalled();
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('deduplicates by EUID regardless of riskScore value', async () => {
      const existingEntities = [{ entityType: 'host', entityId: 'host:server1', riskScore: 50.0 }];
      attachments.get.mockReturnValue(makeExistingAttachmentReturn(existingEntities));

      // Same EUID but a different (updated) riskScore — should not be re-added
      const incomingEntities = [
        { entityType: 'host', entityId: 'host:server1', riskScore: 75.0 },
      ] as EntityAttachmentData['entities'];

      await addOrUpdateEntityAttachment({
        attachments,
        entities: incomingEntities,
        description: 'test description',
      });

      expect(attachments.update).not.toHaveBeenCalled();
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('stores riskScore alongside entityId and entityType when adding new entities', async () => {
      const existingEntities = [{ entityType: 'host', entityId: 'host:server1', riskScore: 50.0 }];
      attachments.get.mockReturnValue(makeExistingAttachmentReturn(existingEntities));

      const newEntities = [
        { entityType: 'user', entityId: 'user:alice', riskScore: 92.3 },
      ] as EntityAttachmentData['entities'];

      await addOrUpdateEntityAttachment({
        attachments,
        entities: newEntities,
        description: 'test description',
      });

      expect(attachments.update).toHaveBeenCalledWith(ENTITY_ATTACHMENT_CONVERSATION_ID, {
        data: {
          attachmentLabel: 'Entity',
          entities: [...existingEntities, ...newEntities],
        },
        description: 'test description',
      });
    });
  });
});
