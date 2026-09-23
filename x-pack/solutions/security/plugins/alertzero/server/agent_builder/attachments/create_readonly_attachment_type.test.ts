/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { createReadonlyAttachmentType } from './create_readonly_attachment_type';
import { formatToText } from './test_utils';

const fixtureSchema = z.object({
  attachmentLabel: z.string().optional(),
  value: z.string().min(1),
});

const attachmentType = createReadonlyAttachmentType({
  id: 'test.fixture',
  schema: fixtureSchema,
  formatForAgent: (data) => `fixture: ${data.value}`,
  describePayload: 'The payload contains: value.',
  renderNoun: 'fixture widget',
  maxContentLength: 100,
});

describe('createReadonlyAttachmentType', () => {
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  it('registers under the given id', () => {
    expect(attachmentType.id).toBe('test.fixture');
  });

  it('is readonly so the agent cannot create or update these attachments', () => {
    expect(attachmentType.isReadonly).toBe(true);
  });

  describe('validate', () => {
    it('returns valid data when the schema parses', async () => {
      const result = await attachmentType.validate({ value: 'ok' });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual({ value: 'ok' });
      }
    });

    it('returns invalid with an error message when the schema rejects', async () => {
      const result = await attachmentType.validate({ value: '' });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('format', () => {
    it('calls formatForAgent with the parsed data', async () => {
      const value = await formatToText(attachmentType, formatContext, { value: 'ok' });

      expect(value).toBe('fixture: ok');
    });

    it('throws a message naming the attachment id when data is invalid', () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: 'test.fixture',
        data: { invalid: 'data' },
      };

      expect(() => attachmentType.format(attachment, formatContext)).toThrow(
        'Invalid test.fixture attachment data for attachment test-id'
      );
    });

    it('hard-truncates the representation when it exceeds maxContentLength', async () => {
      const longValue = 'x'.repeat(500);
      const value = await formatToText(attachmentType, formatContext, { value: longValue });

      expect(value.length).toBeLessThanOrEqual(100);
      expect(value).toContain('[truncated: representation exceeded 100 characters]');
    });
  });

  describe('getAgentDescription', () => {
    it('includes describePayload and the render_attachment contract for the given noun', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('The payload contains: value.');
      expect(description).toContain('test.fixture');
      expect(description).toContain('<render_attachment id="ATTACHMENT_ID" version="VERSION" />');
      expect(description).toContain('fixture widget');
    });
  });
});
