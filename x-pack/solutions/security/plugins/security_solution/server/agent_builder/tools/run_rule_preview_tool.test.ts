/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { z } from '@kbn/zod/v4';
import { coreMock } from '@kbn/core/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { runRulePreview } from '../../lib/detection_engine/rule_preview/api/preview_rules/run_rule_preview';
import type { RunRulePreviewDeps } from '../../lib/detection_engine/rule_preview/api/preview_rules/run_rule_preview';
import { runRulePreviewTool, SECURITY_RUN_RULE_PREVIEW_TOOL_ID } from './run_rule_preview_tool';

jest.mock('../../lib/detection_engine/rule_preview/api/preview_rules/run_rule_preview', () => ({
  runRulePreview: jest.fn(),
}));

const runRulePreviewMock = runRulePreview as jest.Mock;

const getResults = (ret: unknown) => {
  const standard = ret as { results?: Array<{ type: string }> };
  if (!standard.results) {
    throw new Error('Expected a standard tool return with results');
  }
  return standard.results;
};

const validRule = {
  type: 'esql',
  language: 'esql',
  query: 'FROM logs-* | LIMIT 10',
  name: 'Test ES|QL rule',
  description: 'A test rule',
  severity: 'low',
  risk_score: 21,
  interval: '5m',
  from: 'now-6m',
  to: 'now',
};

describe('runRulePreviewTool', () => {
  const { mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const getActionsClientWithRequest = jest.fn().mockResolvedValue({});
  const getLicense = jest.fn().mockResolvedValue({});
  const mockCoreStart = coreMock.createStart();
  const getStartServices = jest.fn().mockResolvedValue([
    mockCoreStart,
    {
      actions: { getActionsClientWithRequest },
      licensing: { getLicense },
    },
  ]);

  const deps = {
    config: { experimentalFeatures: { esqlRulesDisabled: false } } as never,
    ml: undefined,
    security: undefined,
    securityRuleTypeOptions: {} as never,
    previewRuleDataClient: {} as never,
    getStartServices,
    logger: mockLogger,
    isServerless: false,
  } as unknown as RunRulePreviewDeps;

  const tool = runRulePreviewTool(deps) as unknown as BuiltinToolDefinition<
    z.ZodObject<z.ZodRawShape>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    runRulePreviewMock.mockResolvedValue({
      previewId: 'preview-123',
      logs: [],
      isAborted: false,
    });
  });

  it('returns the correct tool id', () => {
    expect(tool.id).toBe(SECURITY_RUN_RULE_PREVIEW_TOOL_ID);
  });

  it('applies timeframe defaults in the schema', () => {
    const parsed = tool.schema.safeParse({ rule: validRule });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const data = parsed.data as {
        timeframeStart: string;
        timeframeEnd: string;
        enableLoggedRequests: boolean;
      };
      expect(data.timeframeStart).toBe('now-1h');
      expect(data.timeframeEnd).toBe('now');
      expect(data.enableLoggedRequests).toBe(false);
    }
  });

  it('requires the ES|QL query in the rule', () => {
    expect(tool.schema.safeParse({ rule: {} }).success).toBe(false);
  });

  it('accepts a minimal rule containing only a query', () => {
    expect(tool.schema.safeParse({ rule: { query: 'FROM logs-* | LIMIT 10' } }).success).toBe(true);
  });

  it('defaults the non-essential rule fields in the preview body', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
    (context.attachments.add as jest.Mock).mockResolvedValue({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      current_version: 1,
    });

    await tool.handler(
      {
        rule: { query: 'FROM logs-* | LIMIT 10', interval: '5m' },
        timeframeStart: 'now-1h',
        timeframeEnd: 'now',
        enableLoggedRequests: false,
      },
      context
    );

    const [, passedParams] = runRulePreviewMock.mock.calls[0];
    expect(passedParams.body).toEqual(
      expect.objectContaining({
        type: 'esql',
        language: 'esql',
        query: 'FROM logs-* | LIMIT 10',
        severity: 'low',
        risk_score: 21,
        invocationCount: 12,
      })
    );
  });

  it('runs the preview and creates a rule preview attachment', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
    (context.attachments.add as jest.Mock).mockResolvedValue({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      current_version: 1,
    });

    const result = await tool.handler(
      {
        rule: validRule,
        timeframeStart: 'now-1h',
        timeframeEnd: 'now',
        enableLoggedRequests: false,
      },
      context
    );

    expect(runRulePreviewMock).toHaveBeenCalledTimes(1);
    const [passedDeps, passedParams] = runRulePreviewMock.mock.calls[0];
    expect(passedDeps).toBe(deps);
    expect(passedParams).toEqual(
      expect.objectContaining({
        request: context.request,
        spaceId: 'default',
        enableLoggedRequests: false,
        body: expect.objectContaining({
          type: 'esql',
          query: 'FROM logs-* | LIMIT 10',
          // ~1h / 5m interval => 12 invocations
          invocationCount: 12,
        }),
      })
    );

    expect(context.attachments.add).toHaveBeenCalledWith({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      data: { previewId: 'preview-123' },
      description: 'Rule preview: preview-123',
    });

    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: expect.objectContaining({
            attachmentId: 'security-rule-preview-preview-123',
            type: SecurityAgentBuilderAttachments.rulePreview,
            version: 1,
            previewId: 'preview-123',
          }),
        },
      ],
    });
  });

  it('returns an error result for an invalid timeframe', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

    const result = await tool.handler(
      {
        rule: validRule,
        timeframeStart: 'not-a-date',
        timeframeEnd: 'now',
        enableLoggedRequests: false,
      },
      context
    );

    expect(runRulePreviewMock).not.toHaveBeenCalled();
    expect(getResults(result)[0].type).toBe(ToolResultType.error);
  });

  it('returns an error result when no preview id is produced', async () => {
    runRulePreviewMock.mockResolvedValue({
      previewId: undefined,
      logs: [{ errors: ['boom'], warnings: [], duration: 0 }],
      isAborted: false,
    });
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

    const result = await tool.handler(
      {
        rule: validRule,
        timeframeStart: 'now-1h',
        timeframeEnd: 'now',
        enableLoggedRequests: false,
      },
      context
    );

    expect(context.attachments.add).not.toHaveBeenCalled();
    expect(getResults(result)[0].type).toBe(ToolResultType.error);
  });
});
