/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createImpactAttachmentType, MAX_IMPACTED_ENTITIES } from './impact';

describe('createImpactAttachmentType', () => {
  const attachmentType = createImpactAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  const validEntity = {
    entity_type: 'host' as const,
    name: 'WKSTN-01',
    alert_count: 3,
    verdicts: { true_positive: 2, false_positive: 1, inconclusive: 0 },
  };

  const makeAttachment = (data: unknown) =>
    ({
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.impact,
      data,
    } as Attachment<string, unknown>);

  it('has the impact type id', () => {
    expect(attachmentType.id).toBe(SecurityAgentBuilderAttachments.impact);
  });

  describe('validate', () => {
    it('accepts a payload with a mix of hosts and users', async () => {
      const result = await attachmentType.validate({
        entities: [
          validEntity,
          {
            entity_type: 'user',
            name: 'jdoe',
            alert_count: 1,
            verdicts: { true_positive: 1, false_positive: 0, inconclusive: 0 },
          },
        ],
        total_alert_count: 4,
      });
      expect(result.valid).toBe(true);
    });

    it('accepts an empty entity list', async () => {
      const result = await attachmentType.validate({ entities: [] });
      expect(result.valid).toBe(true);
    });

    it('accepts coercible string numbers (from Liquid {{ }} rendering)', async () => {
      const result = await attachmentType.validate({
        entities: [
          {
            entity_type: 'host',
            name: 'WKSTN-01',
            alert_count: '3',
            verdicts: { true_positive: '2', false_positive: '1', inconclusive: '0' },
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts a truncated payload with the flag set (native boolean)', async () => {
      const result = await attachmentType.validate({
        entities: [validEntity],
        truncated: true,
      });
      expect(result.valid).toBe(true);
    });

    it('accepts truncated: "true" (Liquid {{ }} string render)', async () => {
      const result = await attachmentType.validate({
        entities: [validEntity],
        truncated: 'true',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts truncated: "false" (Liquid {{ }} string render)', async () => {
      const result = await attachmentType.validate({
        entities: [validEntity],
        truncated: 'false',
      });
      expect(result.valid).toBe(true);
    });

    it(`rejects more than ${MAX_IMPACTED_ENTITIES} entities`, async () => {
      const result = await attachmentType.validate({
        entities: Array.from({ length: MAX_IMPACTED_ENTITIES + 1 }, (_, i) => ({
          ...validEntity,
          name: `host-${i}`,
        })),
      });
      expect(result.valid).toBe(false);
    });

    it('rejects an entity with an unknown entity_type', async () => {
      const result = await attachmentType.validate({
        entities: [{ ...validEntity, entity_type: 'service' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects an entity with an empty name', async () => {
      const result = await attachmentType.validate({
        entities: [{ ...validEntity, name: '' }],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('renders each entity with its type, name, counts, and verdict breakdown', async () => {
      const formatted = await attachmentType.format(
        makeAttachment({ entities: [validEntity] }),
        formatContext
      );
      const representation = await formatted.getRepresentation?.();

      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('host WKSTN-01');
        expect(representation.value).toContain('3 alert(s)');
        expect(representation.value).toContain('2 TP');
        expect(representation.value).toContain('1 FP');
      }
    });

    it('renders a truncation note when the list was capped', async () => {
      const formatted = await attachmentType.format(
        makeAttachment({ entities: [validEntity], truncated: true }),
        formatContext
      );
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('truncated');
      }
    });

    it('renders an empty-state message when there are no entities', async () => {
      const formatted = await attachmentType.format(
        makeAttachment({ entities: [] }),
        formatContext
      );
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('No impacted entities recorded');
      }
    });
  });

  describe('getAgentDescription', () => {
    it('documents entity_type, name, alert_count, and the verdict fields', () => {
      const description = attachmentType.getAgentDescription?.();
      expect(description).toContain('entity_type');
      expect(description).toContain('alert_count');
      expect(description).toContain('true_positive');
      expect(description).toContain('truncated');
    });
  });
});
