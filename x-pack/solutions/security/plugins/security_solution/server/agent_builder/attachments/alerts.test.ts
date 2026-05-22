/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
} from '../tools';
import { createBulkAlertsAttachmentType } from './alerts';

const mockAlertSource = {
  'kibana.alert.rule.name': 'Test Rule',
  'kibana.alert.severity': 'critical',
  'kibana.alert.risk_score': 75,
  'host.name': 'test-host',
  'user.name': 'test-user',
};

const mockLogger = loggerMock.create();

const buildCoreMock = (hits: Array<{ _id: string; _source: unknown }> = []) => {
  const core = coreMock.createSetup();
  const scopedClient = {
    asCurrentUser: {
      search: jest.fn().mockResolvedValue({
        hits: { hits: hits.map((h) => ({ _id: h._id, _source: h._source })) },
      }),
    },
  };
  const elasticsearchMock = {
    client: { asScoped: jest.fn().mockReturnValue(scopedClient) },
  };
  (core.getStartServices as jest.Mock).mockResolvedValue([{ elasticsearch: elasticsearchMock }]);
  return core as unknown as SecuritySolutionPluginCoreSetupDependencies;
};

describe('createBulkAlertsAttachmentType', () => {
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  describe('validate', () => {
    const attachmentType = createBulkAlertsAttachmentType(buildCoreMock(), mockLogger);

    it('returns valid when alertIds array is present', async () => {
      const input = { alertIds: ['abc123', 'def456'] };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns invalid with an empty alertIds array', async () => {
      const result = await attachmentType.validate({ alertIds: [] });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when alertIds exceeds 20 entries', async () => {
      const result = await attachmentType.validate({
        alertIds: Array.from({ length: 21 }, (_, i) => `id-${i}`),
      });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when alertIds field is missing', async () => {
      const result = await attachmentType.validate({});

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when alertIds field is not an array', async () => {
      const result = await attachmentType.validate({ alertIds: 'not-an-array' });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when an alertIds entry is not a string', async () => {
      const result = await attachmentType.validate({ alertIds: [123] });

      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('fetches alerts from ES and returns inline JSON representation', async () => {
      const core = buildCoreMock([
        { _id: 'abc123', _source: mockAlertSource },
        { _id: 'def456', _source: { ...mockAlertSource, 'host.name': 'other-host' } },
      ]);
      const attachmentType = createBulkAlertsAttachmentType(core, mockLogger);

      const attachment: Attachment<string, unknown> = {
        id: 'id-fetch-test',
        type: SecurityAgentBuilderAttachments.alerts,
        data: { alertIds: ['abc123', 'def456'] },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : undefined;

      expect(representation?.type).toBe('text');
      expect(representation?.value).toContain('2 security alerts');
      expect(representation?.value).toContain('Alert 1:');
      expect(representation?.value).toContain('Alert 2:');
      expect(representation?.value).toContain('"_id": "abc123"');
      expect(representation?.value).toContain('"_id": "def456"');
    });

    it('marks missing alerts with an error placeholder', async () => {
      const core = buildCoreMock([{ _id: 'abc123', _source: mockAlertSource }]);
      const attachmentType = createBulkAlertsAttachmentType(core, mockLogger);

      const attachment: Attachment<string, unknown> = {
        id: 'id-missing-test',
        type: SecurityAgentBuilderAttachments.alerts,
        data: { alertIds: ['abc123', 'missing-id'] },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = formatted.getRepresentation
        ? await formatted.getRepresentation()
        : undefined;

      expect(representation?.value).toContain('"_id": "missing-id"');
      expect(representation?.value).toContain('"error": "not found"');
    });

    it('logs a warn and returns placeholders when ES search throws', async () => {
      const core = coreMock.createSetup();
      const scopedClient = {
        asCurrentUser: { search: jest.fn().mockRejectedValue(new Error('index not available')) },
      };
      (core.getStartServices as jest.Mock).mockResolvedValue([
        { elasticsearch: { client: { asScoped: jest.fn().mockReturnValue(scopedClient) } } },
      ]);
      const logger = loggerMock.create();
      const attachmentType = createBulkAlertsAttachmentType(
        core as unknown as SecuritySolutionPluginCoreSetupDependencies,
        logger
      );

      const attachment: Attachment<string, unknown> = {
        id: 'id-error-test',
        type: SecurityAgentBuilderAttachments.alerts,
        data: { alertIds: ['abc123'] },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      await formatted.getRepresentation?.();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch'));
    });

    it('logs a warn when ES returns no results', async () => {
      const core = buildCoreMock([]);
      const logger = loggerMock.create();
      const attachmentType = createBulkAlertsAttachmentType(core, logger);

      const attachment: Attachment<string, unknown> = {
        id: 'id-no-results-test',
        type: SecurityAgentBuilderAttachments.alerts,
        data: { alertIds: ['abc123'] },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      await formatted.getRepresentation?.();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no results'));
    });

    it('returns cached representation on repeated reads without re-fetching from ES', async () => {
      const rawCore = coreMock.createSetup();
      const scopedClient = {
        asCurrentUser: {
          search: jest.fn().mockResolvedValue({
            hits: { hits: [{ _id: 'abc123', _source: mockAlertSource }] },
          }),
        },
      };
      (rawCore.getStartServices as jest.Mock).mockResolvedValue([
        { elasticsearch: { client: { asScoped: jest.fn().mockReturnValue(scopedClient) } } },
      ]);
      const core = rawCore as unknown as SecuritySolutionPluginCoreSetupDependencies;
      const attachmentType = createBulkAlertsAttachmentType(core, mockLogger);

      const attachment: Attachment<string, unknown> = {
        id: 'id-cache-test',
        type: SecurityAgentBuilderAttachments.alerts,
        data: { alertIds: ['abc123'] },
      };

      const formatted = await attachmentType.format(attachment, formatContext);
      const first = await formatted.getRepresentation?.();

      // Second read with the same attachment ID should return cached value without hitting ES
      (rawCore.getStartServices as jest.Mock).mockClear();
      const formatted2 = await attachmentType.format(attachment, formatContext);
      const second = await formatted2.getRepresentation?.();

      expect(second?.value).toBe(first?.value);
      expect(rawCore.getStartServices).not.toHaveBeenCalled();
    });
  });

  describe('getTools', () => {
    const attachmentType = createBulkAlertsAttachmentType(buildCoreMock(), mockLogger);

    it('returns enrichment tool IDs but not the ES|QL alerts search tool', () => {
      const tools = attachmentType.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toContain(SECURITY_ENTITY_RISK_SCORE_TOOL_ID);
        expect(tools).toContain(SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID);
        expect(tools).toContain(SECURITY_LABS_SEARCH_TOOL_ID);
        expect(tools).toContain(platformCoreTools.cases);
        expect(tools).toContain(platformCoreTools.generateEsql);
        expect(tools).toContain(platformCoreTools.productDocumentation);
        expect(tools).not.toContain(SECURITY_ALERTS_TOOL_ID);
      }
    });
  });

  describe('getAgentDescription', () => {
    const attachmentType = createBulkAlertsAttachmentType(buildCoreMock(), mockLogger);

    it('instructs the agent to process batches and synthesize across all', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('batch');
      expect(description).toContain('After processing all batches');
    });
  });

  it('is marked readonly so the LLM cannot modify alert data', () => {
    const attachmentType = createBulkAlertsAttachmentType(buildCoreMock(), mockLogger);
    expect(attachmentType.isReadonly).toBe(true);
  });
});
