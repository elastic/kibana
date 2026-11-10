/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { TextAttachmentRepresentation } from '@kbn/agent-builder-server/attachments';
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

const buildSearchCoreMock = (search: jest.Mock) => {
  const core = coreMock.createSetup();
  (core.getStartServices as jest.Mock).mockResolvedValue([
    {
      elasticsearch: {
        client: { asScoped: jest.fn().mockReturnValue({ asCurrentUser: { search } }) },
      },
    },
  ]);
  return core as unknown as SecuritySolutionPluginCoreSetupDependencies;
};

const taggedHits = (total: number, ids: string[]) => ({
  hits: {
    total: { value: total, relation: 'eq' },
    hits: ids.map((id) => ({ _id: id, _source: mockAlertSource })),
  },
});

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

    it('returns valid when only tags are present', async () => {
      const input = { tags: ['az:proposal:p1'] };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when both alertIds and tags are present', async () => {
      const result = await attachmentType.validate({
        alertIds: ['abc123'],
        tags: ['az:proposal:p1'],
      });

      expect(result.valid).toBe(true);
    });

    it('returns invalid with an empty tags array', async () => {
      const result = await attachmentType.validate({ tags: [] });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when a tag is an empty string', async () => {
      const result = await attachmentType.validate({ tags: [''] });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when tags exceeds 10 entries', async () => {
      const result = await attachmentType.validate({
        tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
      });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when a tag is longer than 256 characters', async () => {
      const result = await attachmentType.validate({ tags: ['t'.repeat(257)] });

      expect(result.valid).toBe(false);
    });

    it('returns invalid when tags come with an empty alertIds array', async () => {
      const result = await attachmentType.validate({ alertIds: [], tags: ['az:proposal:p1'] });

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
      const textRepr = representation as TextAttachmentRepresentation | undefined;
      expect(textRepr?.value).toContain('2 security alerts');
      expect(textRepr?.value).toContain('Alert 1:');
      expect(textRepr?.value).toContain('Alert 2:');
      expect(textRepr?.value).toContain('"_id": "abc123"');
      expect(textRepr?.value).toContain('"_id": "def456"');
    });

    it('keeps the text of a batch that lists its alerts by id unchanged', async () => {
      const core = buildCoreMock([{ _id: 'abc123', _source: mockAlertSource }]);
      const attachmentType = createBulkAlertsAttachmentType(core, mockLogger);

      const formatted = await attachmentType.format(
        {
          id: 'id-exact-text-test',
          type: SecurityAgentBuilderAttachments.alerts,
          data: { alertIds: ['abc123'] },
        },
        formatContext
      );
      const representation = await formatted.getRepresentation?.();

      expect((representation as TextAttachmentRepresentation | undefined)?.value).toBe(
        `1 security alert:\n\nAlert 1:\n${JSON.stringify(
          { _id: 'abc123', ...mockAlertSource },
          null,
          2
        )}`
      );
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

      expect((representation as TextAttachmentRepresentation | undefined)?.value).toContain(
        '"_id": "missing-id"'
      );
      expect((representation as TextAttachmentRepresentation | undefined)?.value).toContain(
        '"error": "not found"'
      );
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

      expect((second as TextAttachmentRepresentation | undefined)?.value).toBe(
        (first as TextAttachmentRepresentation | undefined)?.value
      );
      expect(rawCore.getStartServices).not.toHaveBeenCalled();
    });

    describe('when the batch references alerts by tag', () => {
      const readRepresentation = async (
        attachmentType: ReturnType<typeof createBulkAlertsAttachmentType>,
        attachment: Attachment<string, unknown>
      ) => {
        const formatted = await attachmentType.format(attachment, formatContext);
        const representation = await formatted.getRepresentation?.();
        return (representation as TextAttachmentRepresentation | undefined)?.value;
      };

      it('says how many alerts have the tag and shows the most recent when there are more', async () => {
        const search = jest.fn().mockResolvedValue(taggedHits(25, ['t1', 't2']));
        const attachmentType = createBulkAlertsAttachmentType(
          buildSearchCoreMock(search),
          mockLogger
        );

        const value = await readRepresentation(attachmentType, {
          id: 'id-tags-test',
          type: SecurityAgentBuilderAttachments.alerts,
          data: { tags: ['az:proposal:p1'] },
        });

        expect(value).toContain(
          '25 security alerts have the tag az:proposal:p1. The 2 most recent:'
        );
        expect(value).toContain('Alert 1:');
        expect(value).toContain('"_id": "t2"');
        expect(search).toHaveBeenCalledWith(
          expect.objectContaining({
            size: 20,
            track_total_hits: true,
            sort: [{ '@timestamp': { order: 'desc' } }],
            query: {
              bool: { filter: [{ terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1'] } }] },
            },
          })
        );
      });

      it('says when no alert has the tags', async () => {
        const search = jest.fn().mockResolvedValue(taggedHits(0, []));
        const attachmentType = createBulkAlertsAttachmentType(
          buildSearchCoreMock(search),
          mockLogger
        );

        const value = await readRepresentation(attachmentType, {
          id: 'id-tags-empty-test',
          type: SecurityAgentBuilderAttachments.alerts,
          data: { tags: ['a', 'b'] },
        });

        expect(value).toBe('0 security alerts have any of the tags a, b.');
      });

      it('reads the tagged alerts again on every read instead of caching them', async () => {
        const search = jest.fn().mockResolvedValue(taggedHits(1, ['t1']));
        const attachmentType = createBulkAlertsAttachmentType(
          buildSearchCoreMock(search),
          mockLogger
        );
        const attachment: Attachment<string, unknown> = {
          id: 'id-tags-cache-test',
          type: SecurityAgentBuilderAttachments.alerts,
          data: { tags: ['az:proposal:p1'] },
        };

        await readRepresentation(attachmentType, attachment);
        await readRepresentation(attachmentType, attachment);

        expect(search).toHaveBeenCalledTimes(2);
      });

      it('lists the alerts by id first and numbers the other tagged alerts after them', async () => {
        const search = jest
          .fn()
          .mockResolvedValueOnce({ hits: { hits: [{ _id: 'abc123', _source: mockAlertSource }] } })
          .mockResolvedValueOnce(taggedHits(1, ['t1']));
        const attachmentType = createBulkAlertsAttachmentType(
          buildSearchCoreMock(search),
          mockLogger
        );

        const value = await readRepresentation(attachmentType, {
          id: 'id-ids-and-tags-test',
          type: SecurityAgentBuilderAttachments.alerts,
          data: { alertIds: ['abc123'], tags: ['az:proposal:p1'] },
        });

        expect(value).toContain('1 security alert:');
        expect(value).toContain('1 other security alert has the tag az:proposal:p1:');
        expect(value).toContain('Alert 2:\n{\n  "_id": "t1"');
        expect(search).toHaveBeenLastCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                filter: [{ terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1'] } }],
                must_not: [{ ids: { values: ['abc123'] } }],
              },
            },
          })
        );
      });

      it('logs a warn and says the tagged alerts could not be read when ES search throws', async () => {
        const logger = loggerMock.create();
        const search = jest.fn().mockRejectedValue(new Error('index not available'));
        const attachmentType = createBulkAlertsAttachmentType(buildSearchCoreMock(search), logger);

        const value = await readRepresentation(attachmentType, {
          id: 'id-tags-error-test',
          type: SecurityAgentBuilderAttachments.alerts,
          data: { tags: ['az:proposal:p1'] },
        });

        expect(value).toBe('The security alerts with the tag az:proposal:p1 could not be read.');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index not available'));
      });
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

    it('explains batches that reference alerts by tag', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('reference alerts by tag');
    });
  });

  it('is marked readonly so the LLM cannot modify alert data', () => {
    const attachmentType = createBulkAlertsAttachmentType(buildCoreMock(), mockLogger);
    expect(attachmentType.isReadonly).toBe(true);
  });
});
