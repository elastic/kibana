/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { TextAttachmentRepresentation } from '@kbn/agent-builder-server/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import { createThreatAttachmentType, THREAT_ATTACHMENT_ID } from './threat';

describe('createThreatAttachmentType', () => {
  const attachmentType = createThreatAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  it('registers under the expected attachment id', () => {
    expect(attachmentType.id).toBe(ALERTZERO_ATTACHMENT_TYPES.threat);
    expect(THREAT_ATTACHMENT_ID).toBe('security.threat');
  });

  describe('validate', () => {
    it('returns valid with only the required report_id', async () => {
      const input = { attachmentLabel: 'Threat Report', report_id: 'report-1' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid with all captured fallback fields present', async () => {
      const input = {
        attachmentLabel: 'Threat Report',
        report_id: 'report-1',
        title: 'APT99 campaign report',
        severity: 'critical' as const,
        source: 'seeded',
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns invalid when report_id is missing', async () => {
      const result = await attachmentType.validate({ attachmentLabel: 'Threat Report' });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when report_id is empty', async () => {
      const result = await attachmentType.validate({
        attachmentLabel: 'Threat Report',
        report_id: '',
      });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when severity is not one of the allowed values', async () => {
      const result = await attachmentType.validate({
        attachmentLabel: 'Threat Report',
        report_id: 'report-1',
        severity: 'extreme',
      });

      expect(result.valid).toBe(false);
    });

    it('does not accept a revision field (dropped per plan decision)', async () => {
      const result = await attachmentType.validate({
        attachmentLabel: 'Threat Report',
        report_id: 'report-1',
        revision: 3,
      });

      // extra unknown fields are stripped by zod's default parse behavior, not rejected
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).not.toHaveProperty('revision');
      }
    });
  });

  describe('format', () => {
    it('returns a text representation including the report id and fallback fields', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: THREAT_ATTACHMENT_ID,
        data: {
          attachmentLabel: 'Threat Report',
          report_id: 'report-1',
          title: 'APT99 campaign report',
          severity: 'critical',
          source: 'seeded',
        },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      expect(representation.type).toBe('text');
      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).toContain('report-1');
      expect(value).toContain('APT99 campaign report');
      expect(value).toContain('critical');
      expect(value).toContain('space-projected');
    });

    it('omits optional fallback lines when they are absent', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: THREAT_ATTACHMENT_ID,
        data: { attachmentLabel: 'Threat Report', report_id: 'report-1' },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).not.toContain('Title:');
      expect(value).not.toContain('Severity:');
      expect(value).not.toContain('Source:');
    });

    it('throws when attachment data is invalid', () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: THREAT_ATTACHMENT_ID,
        data: { invalid: 'data' },
      };

      expect(() => attachmentType.format(attachment, formatContext)).toThrow(
        'Invalid threat attachment data for attachment test-id'
      );
    });
  });

  describe('getAgentDescription', () => {
    it('documents the by-reference semantics and the render_attachment contract', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('by-reference');
      expect(description).toContain('report_id');
      expect(description).toContain('<render_attachment id="ATTACHMENT_ID" version="VERSION" />');
    });
  });
});
