/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { TextAttachmentRepresentation } from '@kbn/agent-builder-server/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  createSignificantSecurityEventAttachmentType,
  SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
} from './significant_security_event';

const validPayload = {
  attachmentLabel: 'Significant Security Event',
  title: 'Suspicious lateral movement detected',
  severity: 'high' as const,
  confidence: 0.82,
  status: 'open' as const,
  source_watch: 'lateral-movement-watch',
  capability: 'lateral-movement-detection',
  run_id: 'run-123',
  report_id: 'tr-lateral-movement-2026-01',
  security_knowledge_indicators: [
    { type: 'technique', value: 'T1021', confidence: 0.9, technique_id: 'T1021' },
  ],
  entities: [
    { field: 'host.name' as const, value: 'srv-01' },
    { field: 'user.name' as const, value: 'jdoe' },
  ],
  timeline: [{ at: '2026-01-01T00:00:00Z', what: 'RDP session established' }],
  hypothesis_tested: 'Adversary used stolen credentials to move laterally',
  evidence_for: ['RDP session from unusual host'],
  evidence_against: [],
  evaluation_record_ref: 'eval-record-1',
};

describe('createSignificantSecurityEventAttachmentType', () => {
  const attachmentType = createSignificantSecurityEventAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  // Generic zod-shape cases (required fields, enum bounds, array caps) live in
  // common/significant_security_event_schema.test.ts. Only the schema's custom
  // superRefine checks are re-verified here, through the attachment type's own
  // validate() entry point.
  describe('validate', () => {
    it('rejects a technique indicator missing technique_id', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        security_knowledge_indicators: [{ type: 'technique', value: 'T1021' }],
      });

      expect(result.valid).toBe(false);
    });

    it('rejects an ioc indicator missing ioc', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        security_knowledge_indicators: [{ type: 'ioc', value: 'suspicious hash' }],
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

    it('includes indicators, structured entities, evidence, and the evaluation record ref', async () => {
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
      expect(value).toContain('technique: T1021 [T1021] (confidence 0.9)');
      expect(value).toContain('host.name: srv-01');
      expect(value).toContain('user.name: jdoe');
      expect(value).toContain('- RDP session from unusual host');
      expect(value).toContain('Evidence against:\n  none recorded');
      expect(value).toContain('Evaluation record: eval-record-1');
      expect(value).toContain('taxonomy labels, not Discover IOCs');
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
  });

  describe('getAgentDescription', () => {
    it('documents the payload shape and the render_attachment contract', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('Significant Security Event');
      expect(description).toContain('timeline');
      expect(description).toContain('hypothesis_tested');
      expect(description).toContain('{ field, value }');
      expect(description).toContain('NOT Discover IOCs');
      expect(description).toContain('<render_attachment id="ATTACHMENT_ID" version="VERSION" />');
    });
  });
});
