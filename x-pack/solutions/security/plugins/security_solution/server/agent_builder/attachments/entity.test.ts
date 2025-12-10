/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/onechat-common/attachments';
import { onechatMocks } from '@kbn/onechat-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools';
import { createEntityAttachmentType } from './entity';

describe('createEntityAttachmentType', () => {
  const attachmentType = createEntityAttachmentType();
  const formatContext = onechatMocks.attachments.createFormatContextMock();

  describe('validate', () => {
    it('returns valid when entity data is valid with host identifierType', async () => {
      const input = { identifierType: 'host', identifier: 'hostname-1' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toBe('identifier: hostname-1, identifierType: host');
      }
    });

    it('returns valid when entity data is valid with user identifierType', async () => {
      const input = { identifierType: 'user', identifier: 'username-1' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toBe('identifier: username-1, identifierType: user');
      }
    });

    it('returns valid when entity data is valid with service identifierType', async () => {
      const input = { identifierType: 'service', identifier: 'service-1' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toBe('identifier: service-1, identifierType: service');
      }
    });

    it('returns valid when entity data is valid with generic identifierType', async () => {
      const input = { identifierType: 'generic', identifier: 'generic-1' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toBe('identifier: generic-1, identifierType: generic');
      }
    });

    it('returns invalid when identifierType is missing', async () => {
      const input = { identifier: 'test-identifier' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when identifier is missing', async () => {
      const input = { identifierType: 'host' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when identifier is empty string', async () => {
      const input = { identifierType: 'host', identifier: '' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when identifierType is not in enum', async () => {
      const input = { identifierType: 'invalid', identifier: 'test' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('format', () => {
    it('returns correct string format', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SecurityAgentBuilderAttachments.entity,
        data: 'identifier: hostname-1, identifierType: host',
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = await formatted.getRepresentation();

      expect(representation.type).toBe('text');
      expect(representation.value).toBe('identifier: hostname-1, identifierType: host');
    });

    it('throws error when attachment data is invalid', () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SecurityAgentBuilderAttachments.entity,
        data: 'invalid data',
      };

      expect(() => attachmentType.format(attachment, formatContext)).toThrow(
        'Invalid risk entity attachment data for attachment test-id'
      );
    });
  });

  describe('getTools', () => {
    it('returns entity risk score tool', () => {
      const tools = attachmentType.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toEqual([SECURITY_ENTITY_RISK_SCORE_TOOL_ID]);
      }
    });
  });

  describe('getAgentDescription', () => {
    it('returns expected description', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('risk entity');
      expect(description).toContain('RISK ENTITY DATA');
      expect(description).toContain('identifierType');
      expect(description).toContain('identifier');
    });
  });
});
