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
import {
  createSignificantSecurityEventAttachmentType,
  SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
} from './significant_security_event';

const validPayload = {
  attachmentLabel: 'Significant Security Event',
  title: 'Suspicious lateral movement detected',
  severity: 'high' as const,
  confidence: 0.82,
  status: 'open',
  source_watch: 'lateral-movement-watch',
  capability: 'lateral-movement-detection',
  run_id: 'run-123',
  security_knowledge_indicators: [{ type: 'technique', value: 'T1021', confidence: 0.9 }],
  entities: ['host.name: srv-01', 'user.name: jdoe'],
  timeline: [{ at: '2026-01-01T00:00:00Z', what: 'RDP session established' }],
  hypothesis_tested: 'Adversary used stolen credentials to move laterally',
  evidence_for: ['RDP session from unusual host'],
  evidence_against: [],
  evaluation_record_ref: 'eval-record-1',
};

describe('createSignificantSecurityEventAttachmentType', () => {
  const attachmentType = createSignificantSecurityEventAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  it('registers under the expected attachment id', () => {
    expect(attachmentType.id).toBe(ALERTZERO_ATTACHMENT_TYPES.significantSecurityEvent);
    expect(SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID).toBe('security.significant_security_event');
  });

  describe('validate', () => {
    it('returns valid for a well-formed payload', async () => {
      const result = await attachmentType.validate(validPayload);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('returns invalid when a required field is missing', async () => {
      const { title, ...rest } = validPayload;

      const result = await attachmentType.validate(rest);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when severity is not one of the allowed values', async () => {
      const result = await attachmentType.validate({ ...validPayload, severity: 'catastrophic' });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when confidence is out of [0, 1] range', async () => {
      const result = await attachmentType.validate({ ...validPayload, confidence: 1.5 });

      expect(result.valid).toBe(false);
    });

    it('rejects arrays exceeding the 50-item cap', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        entities: Array.from({ length: 51 }, (_, i) => `entity-${i}`),
      });

      expect(result.valid).toBe(false);
    });

    it('accepts the optional maps_to_proposal field when present', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        maps_to_proposal: { category: 'containment', confidence: 0.7 },
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('format', () => {
    it('returns a text representation quoting the title, severity, and timeline', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
        data: validPayload,
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      expect(representation.type).toBe('text');
      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).toContain(validPayload.title);
      expect(value).toContain('high');
      expect(value).toContain('RDP session established');
    });

    it('throws when attachment data is invalid', () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
        data: { invalid: 'data' },
      };

      expect(() => attachmentType.format(attachment, formatContext)).toThrow(
        'Invalid significant security event attachment data for attachment test-id'
      );
    });
  });

  describe('getAgentDescription', () => {
    it('documents the payload shape and the render_attachment contract', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('Significant Security Event');
      expect(description).toContain('timeline');
      expect(description).toContain('hypothesis_tested');
      expect(description).toContain('<render_attachment id="ATTACHMENT_ID" version="VERSION" />');
    });
  });
});
