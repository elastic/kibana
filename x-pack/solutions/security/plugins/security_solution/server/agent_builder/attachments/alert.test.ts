/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
} from '../tools';
import { createAlertAttachmentType } from './alert';

describe('createAlertAttachmentType', () => {
  const attachmentType = createAlertAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  describe('validate', () => {
    it('returns valid when alert data is valid', async () => {
      const input = { alert: 'test alert data', attachmentLabel: 'Security Alert' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns invalid when alert field is missing', async () => {
      const input = {};

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when alert field is not a string', async () => {
      const input = { alert: 123 };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('format', () => {
    it('returns correct text representation', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SecurityAgentBuilderAttachments.alert,
        data: { alert: 'test alert content', attachmentLabel: 'Security Alert' },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: attachment.data };

      expect(representation.type).toBe('text');
      expect(representation.value).toBe('test alert content');
    });

    it('throws error when attachment data is invalid', () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SecurityAgentBuilderAttachments.alert,
        data: { invalid: 'data', attachmentLabel: 'Security Alert' },
      };

      expect(() => attachmentType.format(attachment, formatContext)).toThrow(
        'Invalid alert attachment data for attachment test-id'
      );
    });
  });

  describe('getTools', () => {
    it('returns expected tool IDs', () => {
      const tools = attachmentType.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toContain(SECURITY_ENTITY_RISK_SCORE_TOOL_ID);
        expect(tools).toContain(SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID);
        expect(tools).toContain(SECURITY_LABS_SEARCH_TOOL_ID);
        expect(tools).toContain(SECURITY_ALERTS_TOOL_ID);
        expect(tools).toContain(platformCoreTools.cases);
        expect(tools).toContain(platformCoreTools.generateEsql);
        expect(tools).toContain(platformCoreTools.productDocumentation);
      }
    });
  });

  describe('getAgentDescription', () => {
    it('returns expected description', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('security alert data');
      expect(description).toContain('SECURITY ALERT DATA');
      expect(description).toContain('Extract alert id(s): _id');
      expect(description).toContain('Extract rule name: kibana.alert.rule.name');
      expect(description).toContain('Extract entities: host.name, user.name, service.name');
    });
  });
});
