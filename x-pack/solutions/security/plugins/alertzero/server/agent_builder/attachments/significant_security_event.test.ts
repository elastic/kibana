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

  it('is readonly so the agent cannot create or update these attachments', () => {
    expect(attachmentType.isReadonly).toBe(true);
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
        entities: Array.from({ length: 51 }, (_, i) => `user.name: entity-${i}`),
      });

      expect(result.valid).toBe(false);
    });

    it('rejects bare entity identifiers', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        entities: ['dev-user'],
      });

      expect(result.valid).toBe(false);
    });

    it('rejects EUID and ARN entity strings', async () => {
      const euid = await attachmentType.validate({
        ...validPayload,
        entities: ['entity:generic:arn:aws:iam::123456789012:user/dev-user'],
      });
      const arn = await attachmentType.validate({
        ...validPayload,
        entities: ['arn:aws:iam::123456789012:user/dev-user'],
      });

      expect(euid.valid).toBe(false);
      expect(arn.valid).toBe(false);
    });

    it('accepts the optional maps_to_proposal field when present', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        maps_to_proposal: { category: 'containment', confidence: 0.7 },
      });

      expect(result.valid).toBe(true);
    });

    it('rejects maps_to_proposal.actionInput with more than 50 keys', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        maps_to_proposal: {
          actionInput: Object.fromEntries(
            Array.from({ length: 51 }, (_, i) => [`key-${i}`, 'value'])
          ),
        },
      });

      expect(result.valid).toBe(false);
    });

    it('rejects maps_to_proposal.actionInput when serialized size exceeds 32KB', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        maps_to_proposal: {
          actionInput: { blob: 'x'.repeat(40_000) },
        },
      });

      expect(result.valid).toBe(false);
    });

    it('rejects empty event_id or source_index on events', async () => {
      const emptyEventId = await attachmentType.validate({
        ...validPayload,
        events: [{ event_id: '', source_index: 'logs-*' }],
      });
      const emptySourceIndex = await attachmentType.validate({
        ...validPayload,
        events: [{ event_id: 'evt-1', source_index: '' }],
      });

      expect(emptyEventId.valid).toBe(false);
      expect(emptySourceIndex.valid).toBe(false);
    });

    it('rejects a non-integer truncated_original_count', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        truncated: true,
        truncated_original_count: 1.5,
      });

      expect(result.valid).toBe(false);
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

    it('includes indicators, evidence content, and the evaluation record ref', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
        data: validPayload,
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).toContain('technique: T1021 (confidence 0.9)');
      expect(value).toContain('- RDP session from unusual host');
      expect(value).toContain('Evidence against:\n  none recorded');
      expect(value).toContain('Evaluation record: eval-record-1');
    });

    it('renders maps_to_proposal details when present', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
        data: {
          ...validPayload,
          maps_to_proposal: {
            category: 'containment',
            impact: 'Isolate affected hosts',
            confidence: 0.7,
            actionWorkflowId: 'workflow-1',
            manual_remediation: ['Rotate the compromised key'],
          },
        },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).toContain('Maps to proposal:');
      expect(value).toContain('Category: containment');
      expect(value).toContain('Impact: Isolate affected hosts');
      expect(value).toContain('Action workflow: workflow-1');
      expect(value).toContain('- Rotate the compromised key');
    });

    it('surfaces the truncation note when the payload was truncated', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
        data: { ...validPayload, truncated: true, truncated_original_count: 120 },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).toContain('truncated from 120 original entries');
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
