/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { DEFAULT_PREVIEW_INDEX, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createRulePreviewAttachmentType, getRulePreviewAlertCount } from './rule_preview';

describe('createRulePreviewAttachmentType', () => {
  const getAlertCount = jest.fn();
  const attachmentType = createRulePreviewAttachmentType({ getAlertCount });
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  beforeEach(() => {
    getAlertCount.mockClear();
    getAlertCount.mockResolvedValue(3);
  });

  describe('validate', () => {
    it('returns valid when preview id is provided', async () => {
      const input = { previewId: 'preview-1' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns invalid when preview id is missing', async () => {
      const result = await attachmentType.validate({});

      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    const attachment: Attachment<string, unknown> = {
      id: 'test-id',
      type: SecurityAgentBuilderAttachments.rulePreview,
      data: { previewId: 'preview-1' },
    };

    it('returns a text representation', async () => {
      const formatted = await attachmentType.format(attachment, formatContext);
      const representation = await formatted.getRepresentation?.();

      expect(getAlertCount).toHaveBeenCalledWith({
        previewId: 'preview-1',
        request: formatContext.request,
        spaceId: formatContext.spaceId,
      });
      expect(representation).toEqual({
        type: 'text',
        value: [
          'Security rule preview ID: preview-1.',
          '',
          '## Rule Preview Metrics',
          '',
          '- Generated alerts: 3',
        ].join('\n'),
      });
    });

    it('exposes a single bounded tool that takes the previewId as an argument', async () => {
      const formatted = await attachmentType.format(attachment, formatContext);
      const tools = await formatted.getBoundedTools?.();
      const tool = tools?.[0];
      const search = jest.fn().mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [{ _id: 'alert-1', _source: { [ALERT_RULE_UUID]: 'preview-1' } }],
        },
      });
      const context = {
        spaceId: 'default',
        esClient: {
          asCurrentUser: {
            search,
          },
        },
      };

      if (!tool || !('handler' in tool)) {
        throw new Error('Expected rule preview alerts tool to be a built-in tool');
      }

      const result = await tool.handler({ previewId: 'preview-1', size: 10 }, context as never);

      if (!('results' in result)) {
        throw new Error('Expected a standard tool return with results');
      }
      const firstResult = result.results[0] as ToolResult;

      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${DEFAULT_PREVIEW_INDEX}-default`,
          size: 10,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    [ALERT_RULE_UUID]: 'preview-1',
                  },
                },
              ],
            },
          },
        })
      );
      expect(firstResult.type).toBe(ToolResultType.other);
      if (isOtherResult(firstResult)) {
        expect(firstResult.data).toEqual({
          previewId: 'preview-1',
          total: 1,
          alerts: [{ _id: 'alert-1', _source: { [ALERT_RULE_UUID]: 'preview-1' } }],
        });
      }
    });

    it('emits an instance-agnostic bounded tool so multiple attachments dedupe to one', async () => {
      const formattedA = await attachmentType.format(attachment, formatContext);
      const formattedB = await attachmentType.format(
        { ...attachment, id: 'test-id-2', data: { previewId: 'preview-2' } },
        formatContext
      );

      const toolA = (await formattedA.getBoundedTools?.())?.[0];
      const toolB = (await formattedB.getBoundedTools?.())?.[0];

      // The id is constant (not derived from the previewId), so the framework's
      // dedup-by-id collapses the per-attachment copies into a single shared tool.
      expect(toolA?.id).toBe(toolB?.id);
      // The description must be generic (no embedded previewId) since one tool
      // serves every rule preview attachment in the conversation.
      expect(toolA?.description).not.toContain('preview-1');
      expect(toolA?.description).not.toContain('preview-2');
    });

    it('throws when attachment data is invalid', () => {
      expect(() =>
        attachmentType.format(
          {
            ...attachment,
            data: {},
          },
          formatContext
        )
      ).toThrow('Invalid rule preview attachment data for attachment test-id');
    });
  });
});

describe('getRulePreviewAlertCount', () => {
  it('counts alerts generated for a preview id in the current space', async () => {
    const count = jest.fn().mockResolvedValue({ count: 7 });

    const result = await getRulePreviewAlertCount({
      esClient: { count } as never,
      previewId: 'preview-1',
      spaceId: 'default',
    });

    expect(result).toBe(7);
    expect(count).toHaveBeenCalledWith({
      index: `${DEFAULT_PREVIEW_INDEX}-default`,
      query: {
        bool: {
          filter: [
            {
              term: {
                [ALERT_RULE_UUID]: 'preview-1',
              },
            },
          ],
        },
      },
    });
  });
});
