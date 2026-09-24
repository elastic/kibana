/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  createEntityAnalyticsDashboardAttachmentType,
  type EntityAnalyticsDashboardAttachmentData,
} from './entity_analytics_dashboard';

describe('createEntityAnalyticsDashboardAttachmentType', () => {
  const attachmentType = createEntityAnalyticsDashboardAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  describe('validate', () => {
    it('returns valid when dashboard data includes entities and severity_count', async () => {
      const input = {
        attachmentLabel: 'EA overview',
        severity_count: {
          Critical: 1,
          High: 2,
          Moderate: 3,
          Low: 4,
          Unknown: 5,
        },
        entities: [
          {
            entity_type: 'user' as const,
            entity_id: 'euid-1',
            entity_name: 'alice',
            risk_score_norm: 72,
            risk_level: 'High',
          },
        ],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        const data = result.data as EntityAnalyticsDashboardAttachmentData;
        expect(data.entities).toHaveLength(1);
        expect(data.severity_count?.High).toBe(2);
      }
    });

    it('returns valid when entities array is empty', async () => {
      const input = {
        entities: [],
        severity_count: {
          Critical: 0,
          High: 0,
          Moderate: 0,
          Low: 0,
          Unknown: 0,
        },
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
    });

    it('returns invalid when severity_count omits a required level', async () => {
      const input = {
        entities: [],
        severity_count: {
          Critical: 0,
          High: 0,
        },
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('getRepresentation includes attachment id and dashboard summary', async () => {
      const attachment: Attachment<
        SecurityAgentBuilderAttachments.entityAnalyticsDashboard,
        EntityAnalyticsDashboardAttachmentData
      > = {
        id: 'dash-1',
        type: SecurityAgentBuilderAttachments.entityAnalyticsDashboard,
        data: {
          attachmentLabel: 'Snapshot',
          entities: [
            {
              entity_type: 'host',
              entity_id: 'euid-host',
              entity_name: 'web-1',
            },
          ],
        },
      };

      const formatted = await attachmentType.format(attachment, formatContext);

      const representation = await formatted.getRepresentation?.();
      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('id: "dash-1"');
        expect(representation.value).toContain('web-1');
      }
    });
  });
});
