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
  createHuntCorrelationAttachmentType,
  HUNT_CORRELATION_ATTACHMENT_ID,
} from './hunt_correlation';

const validPayload = {
  attachmentLabel: 'Hunt Correlation',
  anchors: [{ kind: 'hash' as const, value: 'abc123' }],
  diamond_scores: [
    { vertex: 'infrastructure' as const, related_report_id: 'report-42', score: 0.75 },
  ],
  thresholds: { anchor_match: 0.8, diamond_vertex: 0.6 },
  self_match_excluded: true as const,
};

describe('createHuntCorrelationAttachmentType', () => {
  const attachmentType = createHuntCorrelationAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  it('registers under the security.hunt_correlation attachment id', () => {
    expect(HUNT_CORRELATION_ATTACHMENT_ID).toBe('security.hunt_correlation');
  });

  describe('validate', () => {
    it('returns valid for a well-formed payload', async () => {
      const result = await attachmentType.validate(validPayload);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('returns invalid when self_match_excluded is false', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        self_match_excluded: false,
      });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when an anchor kind is not one of the allowed values', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        anchors: [{ kind: 'fingerprint', value: 'abc123' }],
      });

      expect(result.valid).toBe(false);
    });

    it('rejects empty anchor values and related_report_id', async () => {
      const emptyAnchor = await attachmentType.validate({
        ...validPayload,
        anchors: [{ kind: 'hash', value: '' }],
      });
      const emptyReportId = await attachmentType.validate({
        ...validPayload,
        diamond_scores: [{ vertex: 'victim', related_report_id: '', score: 0.5 }],
      });

      expect(emptyAnchor.valid).toBe(false);
      expect(emptyReportId.valid).toBe(false);
    });

    it('returns invalid when a diamond score is out of [0, 1] range', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        diamond_scores: [{ vertex: 'victim', related_report_id: 'report-1', score: 1.2 }],
      });

      expect(result.valid).toBe(false);
    });

    it('allows diamond_scores up to the 100-item cap, and rejects beyond it', async () => {
      const atCap = await attachmentType.validate({
        ...validPayload,
        diamond_scores: Array.from({ length: 100 }, (_, i) => ({
          vertex: 'adversary' as const,
          related_report_id: `report-${i}`,
          score: 0.5,
        })),
      });
      const overCap = await attachmentType.validate({
        ...validPayload,
        diamond_scores: Array.from({ length: 101 }, (_, i) => ({
          vertex: 'adversary' as const,
          related_report_id: `report-${i}`,
          score: 0.5,
        })),
      });

      expect(atCap.valid).toBe(true);
      expect(overCap.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('returns a text representation grouping anchors by kind and listing diamond scores', async () => {
      const attachment: Attachment<string, unknown> = {
        id: 'test-id',
        type: HUNT_CORRELATION_ATTACHMENT_ID,
        data: validPayload,
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : { type: 'text', value: '' };

      expect(representation.type).toBe('text');
      const value = (representation as TextAttachmentRepresentation).value;
      expect(value).toContain('hash: abc123');
      expect(value).toContain('infrastructure: report-42 (score 0.75)');
      expect(value).toContain('anchor_match=0.8, diamond_vertex=0.6');
    });
  });

  describe('getAgentDescription', () => {
    it('documents the Diamond Model shape', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('Diamond Model');
      expect(description).toContain('self_match_excluded');
    });
  });
});
