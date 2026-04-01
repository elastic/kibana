/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentFormattedAttachment,
  AttachmentFormatContext,
} from '@kbn/agent-builder-server/attachments';
import { DIAGNOSTIC_REPORT_ATTACHMENT_TYPE } from '../../../../common/constants';
import { createDiagnosticReportAttachmentType } from '.';

const mockContext = {} as AttachmentFormatContext;

describe('createDiagnosticReportAttachmentType', () => {
  const attachmentType = createDiagnosticReportAttachmentType();

  describe('id', () => {
    it('has the correct id', () => {
      expect(attachmentType.id).toBe(DIAGNOSTIC_REPORT_ATTACHMENT_TYPE);
    });
  });

  describe('validate', () => {
    it('returns valid for data with a content string', () => {
      const result = attachmentType.validate({ content: '# Diagnostic Report\nSome content.' });

      expect(result).toEqual({
        valid: true,
        data: { content: '# Diagnostic Report\nSome content.' },
      });
    });

    it('returns invalid when content is missing', () => {
      const result = attachmentType.validate({});

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when content is not a string', () => {
      const result = attachmentType.validate({ content: 42 });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid for null input', () => {
      const result = attachmentType.validate(null);

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid for undefined input', () => {
      const result = attachmentType.validate(undefined);

      expect(result).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it('returns the content as a text representation', () => {
      const attachment = {
        data: { content: '# Diagnostic Report\nSome content.' },
        id: 'test-id',
        type: DIAGNOSTIC_REPORT_ATTACHMENT_TYPE,
      };

      const formatted = attachmentType.format(attachment, mockContext) as AgentFormattedAttachment;
      const representation = formatted.getRepresentation?.();

      expect(representation).toEqual({
        type: 'text',
        value: '# Diagnostic Report\nSome content.',
      });
    });

    it('throws when attachment data is invalid', () => {
      const attachment = {
        data: { content: 42 },
        id: 'test-id',
        type: DIAGNOSTIC_REPORT_ATTACHMENT_TYPE,
      };

      const formatted = attachmentType.format(attachment, mockContext) as AgentFormattedAttachment;

      expect(() => formatted.getRepresentation?.()).toThrow();
    });
  });

  describe('getAgentDescription', () => {
    it('returns a non-empty description string', () => {
      expect(typeof attachmentType.getAgentDescription?.()).toBe('string');
      expect((attachmentType.getAgentDescription?.() ?? '').length).toBeGreaterThan(0);
    });
  });
});
