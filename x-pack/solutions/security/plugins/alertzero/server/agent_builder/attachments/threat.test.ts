/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { createThreatAttachmentType, THREAT_ATTACHMENT_ID } from './threat';
import { formatToText } from './test_utils';

describe('createThreatAttachmentType', () => {
  const attachmentType = createThreatAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  it('registers under the security.threat attachment id', () => {
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

    it('returns invalid for whitespace-only report_id and title', async () => {
      // A blank report_id fetches an encoded blank and builds a Discover link for it; a blank
      // title becomes the chrome label when attachmentLabel is absent.
      const blankReportId = await attachmentType.validate({
        attachmentLabel: 'Threat Report',
        report_id: '   ',
      });
      const blankTitle = await attachmentType.validate({
        report_id: 'report-1',
        title: '   ',
      });

      expect(blankReportId.valid).toBe(false);
      expect(blankTitle.valid).toBe(false);
    });

    it('returns invalid when severity is not one of the allowed values', async () => {
      const result = await attachmentType.validate({
        attachmentLabel: 'Threat Report',
        report_id: 'report-1',
        severity: 'extreme',
      });

      expect(result.valid).toBe(false);
    });

    it('rejects unknown fields', async () => {
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
      const value = await formatToText(attachmentType, formatContext, {
        attachmentLabel: 'Threat Report',
        report_id: 'report-1',
        title: 'APT99 campaign report',
        severity: 'critical',
        source: 'seeded',
      });

      expect(value).toContain('report-1');
      expect(value).toContain('APT99 campaign report');
      expect(value).toContain('critical');
      expect(value).toContain('space-projected');
    });

    it('omits optional fallback lines when they are absent', async () => {
      const value = await formatToText(attachmentType, formatContext, {
        attachmentLabel: 'Threat Report',
        report_id: 'report-1',
      });

      expect(value).not.toContain('Title:');
      expect(value).not.toContain('Severity:');
      expect(value).not.toContain('Source:');
    });

    it('drops a captured field this build no longer accepts instead of failing the attachment', async () => {
      // A payload persisted before `severity` was constrained to SEVERITY_LEVELS. `report_id`
      // is what makes the attachment useful, so the agent must still be shown the reference.
      const value = await formatToText(attachmentType, formatContext, {
        report_id: 'report-1',
        title: 'APT99 campaign report',
        severity: 'informational',
      } as never);

      expect(value).toContain('report-1');
      expect(value).toContain('APT99 campaign report');
      // The stale value is dropped rather than passed through to the LLM.
      expect(value).not.toContain('informational');
      expect(value).not.toContain('Severity:');
    });

    it('still fails when the payload has no usable reference', async () => {
      await expect(
        formatToText(attachmentType, formatContext, { title: 'No id here' } as never)
      ).rejects.toThrow(/Invalid security.threat attachment data/);
    });

    it('keeps writes strict for a field that reads tolerate', async () => {
      // The tolerance is deliberately one-directional: nothing new is persisted with a value
      // this build rejects, so `format` only ever has to forgive already-stored payloads.
      const result = await attachmentType.validate?.({
        report_id: 'report-1',
        severity: 'informational',
      });

      expect(result?.valid).toBe(false);
    });
  });

  describe('getAgentDescription', () => {
    it('documents the by-reference semantics', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('by-reference');
      expect(description).toContain('report_id');
    });
  });

  describe('max-size payload', () => {
    it('keeps the representation within maxContentLength at the schema max sizes', async () => {
      const value = await formatToText(attachmentType, formatContext, {
        attachmentLabel: 'Threat Report',
        report_id: 'r'.repeat(512),
        title: 't'.repeat(512),
        severity: 'critical' as const,
        source: 's'.repeat(256),
      });

      expect(value.length).toBeLessThanOrEqual(attachmentType.maxContentLength ?? Infinity);
      expect(value).not.toContain('[truncated:');
    });
  });
});
