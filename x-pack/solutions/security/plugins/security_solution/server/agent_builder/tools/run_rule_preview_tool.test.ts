/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
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

const validEsqlRule = {
  type: 'esql' as const,
  language: 'esql' as const,
  query: 'FROM logs-* | LIMIT 10',
};

// Keep the old name as an alias so existing tests don't need to be rewritten
const validRule = validEsqlRule;

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

  it('applies schedule and timeframe defaults in the schema', () => {
    const parsed = tool.schema.safeParse({ rule: validRule });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const data = parsed.data as {
        interval: string;
        from: string;
        to: string;
        timeframeStart: string;
        timeframeEnd: string;
        enableLoggedRequests: boolean;
      };
      expect(data.interval).toBe('1h');
      expect(data.from).toBe('now-1h');
      expect(data.to).toBe('now');
      expect(data.timeframeStart).toBe('now-1h');
      expect(data.timeframeEnd).toBe('now');
      expect(data.enableLoggedRequests).toBe(false);
    }
  });

  it('requires type to be set on the rule', () => {
    expect(tool.schema.safeParse({ rule: {} }).success).toBe(false);
  });

  describe('schema: per-type validation', () => {
    it('accepts a minimal ES|QL rule (type + query)', () => {
      expect(
        tool.schema.safeParse({ rule: { type: 'esql', query: 'FROM logs-* | LIMIT 10' } }).success
      ).toBe(true);
    });

    it('accepts a minimal EQL rule (type + query)', () => {
      expect(
        tool.schema.safeParse({
          rule: { type: 'eql', query: 'process where process.name == "cmd.exe"' },
        }).success
      ).toBe(true);
    });

    it('accepts a minimal query rule (type only, query is optional)', () => {
      expect(tool.schema.safeParse({ rule: { type: 'query' } }).success).toBe(true);
    });

    it('accepts a minimal saved_query rule (type + saved_id)', () => {
      expect(
        tool.schema.safeParse({ rule: { type: 'saved_query', saved_id: 'my-saved-search' } })
          .success
      ).toBe(true);
    });

    it('accepts a minimal threshold rule (type + query + threshold)', () => {
      expect(
        tool.schema.safeParse({
          rule: {
            type: 'threshold',
            query: '*',
            threshold: { field: [], value: 10 },
          },
        }).success
      ).toBe(true);
    });

    it('accepts a minimal threat_match rule (type + required fields)', () => {
      expect(
        tool.schema.safeParse({
          rule: {
            type: 'threat_match',
            query: '*',
            threat_query: '*',
            threat_mapping: [
              { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
            ],
            threat_index: ['logs-ti_*'],
          },
        }).success
      ).toBe(true);
    });

    it('accepts a minimal machine_learning rule (type + anomaly_threshold + job_id)', () => {
      expect(
        tool.schema.safeParse({
          rule: {
            type: 'machine_learning',
            anomaly_threshold: 75,
            machine_learning_job_id: 'my-ml-job',
          },
        }).success
      ).toBe(true);
    });

    it('accepts a minimal new_terms rule (type + query + new_terms_fields + history_window_start)', () => {
      expect(
        tool.schema.safeParse({
          rule: {
            type: 'new_terms',
            query: '*',
            new_terms_fields: ['source.ip'],
            history_window_start: 'now-30d',
          },
        }).success
      ).toBe(true);
    });

    it('rejects a saved_query rule missing saved_id', () => {
      expect(tool.schema.safeParse({ rule: { type: 'saved_query' } }).success).toBe(false);
    });

    it('rejects a threshold rule missing threshold config', () => {
      expect(tool.schema.safeParse({ rule: { type: 'threshold', query: '*' } }).success).toBe(
        false
      );
    });

    it('rejects an unknown type', () => {
      expect(tool.schema.safeParse({ rule: { type: 'unknown_type' } }).success).toBe(false);
    });
  });

  it('defaults the non-essential rule fields in the preview body', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
    (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
      status: ConfirmationStatus.accepted,
    });
    (context.attachments.add as jest.Mock).mockResolvedValue({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      current_version: 1,
    });

    await tool.handler(
      {
        rule: { type: 'esql', language: 'esql', query: 'FROM logs-* | LIMIT 10' },
        interval: '5m',
        timeframeStart: '2024-01-01T00:00:00.000Z',
        timeframeEnd: '2024-01-01T01:00:00.000Z',
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
        interval: '5m',
        severity: 'low',
        risk_score: 21,
        invocationCount: 12,
      })
    );
  });

  it('runs the preview and creates a rule preview attachment', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
    (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
      status: ConfirmationStatus.accepted,
    });
    (context.attachments.add as jest.Mock).mockResolvedValue({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      current_version: 1,
    });

    const result = await tool.handler(
      {
        rule: validRule,
        interval: '5m',
        timeframeStart: '2024-01-01T00:00:00.000Z',
        timeframeEnd: '2024-01-01T01:00:00.000Z',
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
          // 1h / 5m interval => 12 invocations
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

  it('runs an EQL rule preview successfully', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
    (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
      status: ConfirmationStatus.accepted,
    });
    (context.attachments.add as jest.Mock).mockResolvedValue({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      current_version: 1,
    });

    await tool.handler(
      {
        rule: {
          type: 'eql',
          language: 'eql',
          query: 'process where process.name == "cmd.exe"',
        },
        interval: '5m',
        timeframeStart: '2024-01-01T00:00:00.000Z',
        timeframeEnd: '2024-01-01T01:00:00.000Z',
        enableLoggedRequests: false,
      },
      context
    );

    const [, passedParams] = runRulePreviewMock.mock.calls[0];
    expect(passedParams.body).toEqual(
      expect.objectContaining({
        type: 'eql',
        language: 'eql',
        query: 'process where process.name == "cmd.exe"',
      })
    );
  });

  it('runs a machine_learning rule preview successfully', async () => {
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
    (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
      status: ConfirmationStatus.accepted,
    });
    (context.attachments.add as jest.Mock).mockResolvedValue({
      id: 'security-rule-preview-preview-123',
      type: SecurityAgentBuilderAttachments.rulePreview,
      current_version: 1,
    });

    await tool.handler(
      {
        rule: {
          type: 'machine_learning',
          anomaly_threshold: 75,
          machine_learning_job_id: 'my-ml-job',
        },
        interval: '1h',
        timeframeStart: '2024-01-01T00:00:00.000Z',
        timeframeEnd: '2024-01-01T01:00:00.000Z',
        enableLoggedRequests: false,
      },
      context
    );

    const [, passedParams] = runRulePreviewMock.mock.calls[0];
    expect(passedParams.body).toEqual(
      expect.objectContaining({
        type: 'machine_learning',
        anomaly_threshold: 75,
        machine_learning_job_id: 'my-ml-job',
      })
    );
  });

  describe('HITL confirmation for large previews', () => {
    const highInvocationParams = {
      rule: validEsqlRule,
      interval: '5m',
      timeframeStart: '2024-01-01T00:00:00.000Z',
      timeframeEnd: '2024-01-01T01:00:00.000Z',
      enableLoggedRequests: false,
    };

    it('returns a confirmation prompt when invocationCount exceeds the threshold', async () => {
      const mockPrompt = { prompt: { type: 'confirmation', id: 'test-prompt' } };
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });
      (context.prompts.askForConfirmation as jest.Mock).mockReturnValue(mockPrompt);

      const result = await tool.handler(highInvocationParams, context);

      expect(runRulePreviewMock).not.toHaveBeenCalled();
      expect(context.prompts.askForConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `run_rule_preview.high_invocation_count.${context.callContext.toolCallId}`,
          color: 'warning',
        })
      );
      expect(result).toBe(mockPrompt);
    });

    it('proceeds after the user confirms the large preview', async () => {
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.accepted,
      });
      (context.attachments.add as jest.Mock).mockResolvedValue({
        id: 'security-rule-preview-preview-123',
        type: SecurityAgentBuilderAttachments.rulePreview,
        current_version: 1,
      });

      const result = await tool.handler(highInvocationParams, context);

      expect(runRulePreviewMock).toHaveBeenCalledTimes(1);
      expect(getResults(result)[0].type).toBe(ToolResultType.other);
    });

    it('returns an error when the user cancels the large preview', async () => {
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.rejected,
      });

      const result = await tool.handler(highInvocationParams, context);

      expect(runRulePreviewMock).not.toHaveBeenCalled();
      const [firstResult] = getResults(result);
      expect(firstResult.type).toBe(ToolResultType.error);
      const errorData = (firstResult as { type: string; data: { message: string } }).data;
      expect(errorData.message).toContain('explicitly rejected');
      expect(errorData.message).toContain(highInvocationParams.rule.query);
      expect(errorData.message).toContain(highInvocationParams.timeframeStart);
      expect(errorData.message).toContain(highInvocationParams.timeframeEnd);
    });

    it('rejection message for ML rules does not include a query line', async () => {
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.rejected,
      });

      const result = await tool.handler(
        {
          rule: {
            type: 'machine_learning',
            anomaly_threshold: 75,
            machine_learning_job_id: 'my-ml-job',
          },
          interval: '5m',
          timeframeStart: '2024-01-01T00:00:00.000Z',
          timeframeEnd: '2024-01-01T01:00:00.000Z',
          enableLoggedRequests: false,
        },
        context
      );

      const [firstResult] = getResults(result);
      expect(firstResult.type).toBe(ToolResultType.error);
      const errorData = (firstResult as { type: string; data: { message: string } }).data;
      expect(errorData.message).toContain('explicitly rejected');
      expect(errorData.message).not.toContain('query:');
    });

    it('does not prompt when invocationCount is within the threshold', async () => {
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.attachments.add as jest.Mock).mockResolvedValue({
        id: 'security-rule-preview-preview-123',
        type: SecurityAgentBuilderAttachments.rulePreview,
        current_version: 1,
      });

      await tool.handler(
        {
          rule: validRule,
          interval: '1h',
          timeframeStart: '2024-01-01T00:00:00.000Z',
          timeframeEnd: '2024-01-01T09:00:00.000Z',
          enableLoggedRequests: false,
        },
        context
      );

      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(runRulePreviewMock).toHaveBeenCalledTimes(1);
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
    (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
      status: ConfirmationStatus.accepted,
    });

    const result = await tool.handler(
      {
        rule: validRule,
        interval: '1h',
        timeframeStart: 'now-1h',
        timeframeEnd: 'now',
        enableLoggedRequests: false,
      },
      context
    );

    expect(context.attachments.add).not.toHaveBeenCalled();
    expect(getResults(result)[0].type).toBe(ToolResultType.error);
  });

  describe('JSON schema sent to LLM API', () => {
    // Minimal typed representation of the JSON schema structure we care about
    interface JsonSchemaNode {
      type?: string;
      const?: string;
      default?: unknown;
      description?: string;
      properties?: Record<string, JsonSchemaNode>;
      oneOf?: JsonSchemaNode[];
      required?: string[];
    }

    const getLlmSchema = (): JsonSchemaNode => {
      const raw = z.toJSONSchema(tool.schema, {
        unrepresentable: 'any',
        io: 'input',
      }) as JsonSchemaNode & { $schema?: string };
      const { $schema: _, ...rest } = raw;
      return rest;
    };

    it('places interval, from, and to at the top level (not inside the rule union arms)', () => {
      const jsonSchema = getLlmSchema();
      const { properties } = jsonSchema;

      expect(properties).toHaveProperty('interval');
      expect(properties).toHaveProperty('from');
      expect(properties).toHaveProperty('to');

      const ruleArms = properties?.rule?.oneOf ?? [];
      for (const arm of ruleArms) {
        expect(arm.properties).not.toHaveProperty('interval');
        expect(arm.properties).not.toHaveProperty('from');
        expect(arm.properties).not.toHaveProperty('to');
      }
    });

    it('exposes all 8 rule types via oneOf under the rule field', () => {
      const jsonSchema = getLlmSchema();
      const ruleArms = jsonSchema.properties?.rule?.oneOf ?? [];

      expect(ruleArms).toHaveLength(8);
      const types = ruleArms.map((arm) => arm.properties?.type?.const);
      expect(types).toEqual(
        expect.arrayContaining([
          'esql',
          'eql',
          'query',
          'saved_query',
          'threshold',
          'threat_match',
          'machine_learning',
          'new_terms',
        ])
      );
    });

    it('matches the full JSON schema snapshot', () => {
      expect(getLlmSchema()).toMatchSnapshot();
    });
  });

  describe('esqlRulesDisabled feature flag', () => {
    it('returns an error for ES|QL rules when esqlRulesDisabled is true', async () => {
      const disabledDeps = {
        ...deps,
        config: { experimentalFeatures: { esqlRulesDisabled: true } } as never,
      } as unknown as RunRulePreviewDeps;
      const disabledTool = runRulePreviewTool(disabledDeps) as unknown as BuiltinToolDefinition<
        z.ZodObject<z.ZodRawShape>
      >;
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

      const result = await disabledTool.handler(
        {
          rule: validEsqlRule,
          timeframeStart: 'now-1h',
          timeframeEnd: 'now',
          enableLoggedRequests: false,
        },
        context
      );

      expect(runRulePreviewMock).not.toHaveBeenCalled();
      const [firstResult] = getResults(result);
      expect(firstResult.type).toBe(ToolResultType.error);
    });

    it('does not apply the esqlRulesDisabled check for non-ES|QL rule types', async () => {
      const disabledDeps = {
        ...deps,
        config: { experimentalFeatures: { esqlRulesDisabled: true } } as never,
      } as unknown as RunRulePreviewDeps;
      const disabledTool = runRulePreviewTool(disabledDeps) as unknown as BuiltinToolDefinition<
        z.ZodObject<z.ZodRawShape>
      >;
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      (context.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.accepted,
      });
      (context.attachments.add as jest.Mock).mockResolvedValue({
        id: 'security-rule-preview-preview-123',
        type: SecurityAgentBuilderAttachments.rulePreview,
        current_version: 1,
      });

      const result = await disabledTool.handler(
        {
          rule: {
            type: 'eql',
            language: 'eql',
            query: 'process where process.name == "cmd.exe"',
          },
          interval: '1h',
          timeframeStart: 'now-1h',
          timeframeEnd: 'now',
          enableLoggedRequests: false,
        },
        context
      );

      expect(runRulePreviewMock).toHaveBeenCalledTimes(1);
      expect(getResults(result)[0].type).toBe(ToolResultType.other);
    });
  });
});
