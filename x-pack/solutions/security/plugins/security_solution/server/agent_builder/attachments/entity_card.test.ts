/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { EntityCardAttachmentData } from '../../../common/agent_builder/entity_card_attachment_schema';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools/entity_analytics/entity_risk_score_tool';
import { createEntityCardAttachmentType } from './entity_card';

describe('createEntityCardAttachmentType', () => {
  const attachmentType = createEntityCardAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  describe('validate', () => {
    it('returns valid for minimal entity card', async () => {
      const input: EntityCardAttachmentData = {
        entity_type: 'user',
        entity_id: 'euid-abc',
        entity_name: 'jdoe',
      };
      const result = await attachmentType.validate(input);
      expect(result.valid).toBe(true);
    });

    it('returns invalid when entity_id missing', async () => {
      const result = await attachmentType.validate({ entity_type: 'host' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('getRepresentation includes attachment id and entity id', async () => {
      const attachment: Attachment<
        SecurityAgentBuilderAttachments.entityCard,
        EntityCardAttachmentData
      > = {
        id: 'card-1',
        type: SecurityAgentBuilderAttachments.entityCard,
        data: {
          entity_type: 'host',
          entity_id: 'euid-host',
          entity_name: 'web-01',
          risk_score_norm: 88,
          risk_level: 'High',
        },
      };
      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = await formatted.getRepresentation?.();
      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('entityCardAttachment.id: "card-1"');
        expect(representation.value).toContain('euid-host');
      }
    });
  });

  describe('getTools', () => {
    it('returns entity risk score tool', () => {
      expect(attachmentType.getTools?.()).toEqual([SECURITY_ENTITY_RISK_SCORE_TOOL_ID]);
    });
  });
});
