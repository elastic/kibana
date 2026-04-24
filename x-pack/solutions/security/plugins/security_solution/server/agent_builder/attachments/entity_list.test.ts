/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createEntityListAttachmentType, type EntityListAttachmentData } from './entity_list';

describe('createEntityListAttachmentType', () => {
  const attachmentType = createEntityListAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  describe('validate', () => {
    it('returns valid when entity list data is valid', async () => {
      const input = {
        attachmentLabel: 'Top users',
        entities: [
          {
            entity_type: 'user',
            entity_id: 'euid-1',
            entity_name: 'alice',
            risk_score_norm: 72,
            risk_level: 'High',
            criticality: 'high_impact',
          },
          {
            entity_type: 'host',
            entity_id: 'euid-2',
            entity_name: 'host-1',
          },
        ],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        const data: EntityListAttachmentData = result.data;
        expect(data.entities).toHaveLength(2);
      }
    });

    it('returns invalid when entities is empty', async () => {
      const input = { entities: [] };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
    });

    it('returns valid when only one entity (list attachment may carry a single-row result)', async () => {
      const input = {
        attachmentLabel: 'Risky hosts',
        entities: [
          {
            entity_type: 'host',
            entity_id: 'euid-1',
            entity_name: 'only-host',
            risk_score_norm: 99,
            risk_level: 'Critical',
          },
        ],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.entities).toHaveLength(1);
      }
    });

    it('returns invalid when entity_id is missing', async () => {
      const input = {
        entities: [{ entity_type: 'user' }],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('getRepresentation includes attachment id and entity lines', async () => {
      const attachment: Attachment<
        SecurityAgentBuilderAttachments.entityList,
        EntityListAttachmentData
      > = {
        id: 'att-1',
        type: SecurityAgentBuilderAttachments.entityList,
        data: {
          entities: [
            {
              entity_type: 'user',
              entity_id: 'euid-1',
              entity_name: 'bob',
              risk_score_norm: 50,
              risk_level: 'Moderate',
            },
          ],
        },
      };

      const formatted = await attachmentType.format(attachment, formatContext);

      const representation = await formatted.getRepresentation?.();
      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('entityListAttachment.id: "att-1"');
        expect(representation.value).toContain('bob');
        expect(representation.value).toContain('euid-1');
      }
    });
  });
});
