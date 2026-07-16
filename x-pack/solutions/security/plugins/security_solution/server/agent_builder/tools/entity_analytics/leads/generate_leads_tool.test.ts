/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { coreMock } from '@kbn/core/server/mocks';
import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { ExperimentalFeatures } from '../../../../../common';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { generateLeadsTool, SECURITY_GENERATE_LEADS_TOOL_ID } from './generate_leads_tool';
import {
  getLeadGenerationConfig,
  upsertLeadGenerationConfig,
} from '../../../../lib/entity_analytics/lead_generation/saved_object';
import { runLeadGenerationPipeline } from '../../../../lib/entity_analytics/lead_generation/run_pipeline';
import { resolveChatModel } from '../../../../lib/entity_analytics/lead_generation/utils';
import { RiskScoreDataClient } from '../../../../lib/entity_analytics/risk_score/risk_score_data_client';
import { getUserLeadPrivileges } from '../../../../lib/entity_analytics/lead_generation/get_user_lead_privileges';

jest.mock('../../../../lib/entity_analytics/lead_generation/saved_object');
jest.mock('../../../../lib/entity_analytics/lead_generation/run_pipeline');
jest.mock('../../../../lib/entity_analytics/lead_generation/utils');
jest.mock('../../../../lib/entity_analytics/lead_generation/entity_conversion');
jest.mock('../../../../lib/entity_analytics/risk_score/risk_score_data_client');
jest.mock('../../../../lib/entity_analytics/lead_generation/get_user_lead_privileges');

const mockGetLeadGenerationConfig = getLeadGenerationConfig as jest.Mock;
const mockUpsertLeadGenerationConfig = upsertLeadGenerationConfig as jest.Mock;
const mockRunLeadGenerationPipeline = runLeadGenerationPipeline as jest.Mock;
const mockResolveChatModel = resolveChatModel as jest.Mock;
const MockRiskScoreDataClient = RiskScoreDataClient as jest.MockedClass<typeof RiskScoreDataClient>;
const mockGetUserLeadPrivileges = getUserLeadPrivileges as jest.Mock;

const mockExperimentalFeatures = { leadGenerationEnabled: true } as ExperimentalFeatures;

const CONNECTOR_ID = 'test-connector-id';
const CONNECTOR_NAME = 'OpenAI Production';

describe('generateLeadsTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const mockGetStartServices = jest.fn();
  const mockCreateCRUDClient = jest.fn().mockReturnValue({});
  const mockActionsGetAll = jest.fn();
  const mockGetActionsClientWithRequest = jest
    .fn()
    .mockResolvedValue({ getAll: mockActionsGetAll });

  const mockStartPlugins = {
    entityStore: { createCRUDClient: mockCreateCRUDClient },
    inference: {},
    actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest },
  };
  const mockPipelineCoreStart = { analytics: {} };

  const tool = generateLeadsTool(
    mockCore,
    mockLogger,
    mockExperimentalFeatures,
    mockGetStartServices,
    undefined
  );

  const handlerContext = () => createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetStartServices.mockResolvedValue([mockPipelineCoreStart, mockStartPlugins, {}]);
    mockActionsGetAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.gen-ai' },
    ]);
    mockGetLeadGenerationConfig.mockResolvedValue({ connectorId: CONNECTOR_ID });
    mockUpsertLeadGenerationConfig.mockResolvedValue(undefined);
    mockRunLeadGenerationPipeline.mockResolvedValue({ total: 3 });
    mockResolveChatModel.mockResolvedValue({});
    MockRiskScoreDataClient.mockImplementation(() => ({} as RiskScoreDataClient));
    mockGetUserLeadPrivileges.mockResolvedValue({
      adhoc: { has_read_permissions: true, has_write_permissions: true },
      scheduled: { has_read_permissions: true, has_write_permissions: true },
      has_all_required: true,
      privileges: {},
    });
  });

  describe('schema', () => {
    it('accepts empty params (connectorName is optional)', () => {
      expect(tool.schema.safeParse({}).success).toBe(true);
    });

    it('accepts a valid connectorName', () => {
      expect(tool.schema.safeParse({ connectorName: 'OpenAI' }).success).toBe(true);
    });

    it('rejects an empty connectorName string', () => {
      expect(tool.schema.safeParse({ connectorName: '' }).success).toBe(false);
    });
  });

  describe('handler — privilege check', () => {
    it('returns permission error when user lacks write permissions', async () => {
      mockGetUserLeadPrivileges.mockResolvedValue({
        adhoc: { has_read_permissions: true, has_write_permissions: false },
        scheduled: { has_read_permissions: true, has_write_permissions: true },
        has_all_required: false,
        privileges: {},
      });
      const ctx = handlerContext();

      const result = (await tool.handler({}, ctx)) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errResult = result.results[0] as ErrorResult;
      expect(errResult.type).toBe(ToolResultType.error);
      expect((errResult.data as { message: string }).message).toContain('permission');
      expect(mockRunLeadGenerationPipeline).not.toHaveBeenCalled();
    });
  });

  describe('handler — HITL', () => {
    it('returns a confirmation prompt when status is unprompted', async () => {
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });
      (ctx.prompts.askForConfirmation as jest.Mock).mockReturnValue({ type: 'confirmation' });

      const result = await tool.handler({}, ctx);

      expect(ctx.prompts.askForConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Generate investigation leads' })
      );
      expect(mockRunLeadGenerationPipeline).not.toHaveBeenCalled();
      expect(result).toEqual({ type: 'confirmation' });
    });

    it('returns cancelled error when status is rejected', async () => {
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.rejected,
      });

      const result = (await tool.handler({}, ctx)) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errResult = result.results[0] as ErrorResult;
      expect(errResult.type).toBe(ToolResultType.error);
      expect((errResult.data as { message: string }).message).toContain('cancelled');
      expect(mockRunLeadGenerationPipeline).not.toHaveBeenCalled();
    });
  });

  describe('handler — accepted', () => {
    const acceptedCtx = () => {
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.accepted,
      });
      return ctx;
    };

    describe('connector name resolution', () => {
      it('resolves exact connector name (case-insensitive) and returns running status', async () => {
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: 'openai production' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockGetActionsClientWithRequest).toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect((other.data as { status: string }).status).toBe('running');
      });

      it('resolves a unique partial name match', async () => {
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: 'OpenAI' },
          ctx
        )) as ToolHandlerStandardReturn;

        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect((other.data as { status: string }).status).toBe('running');
      });

      it('returns error when multiple connectors match the partial name', async () => {
        mockActionsGetAll.mockResolvedValue([
          { id: 'id-1', name: 'OpenAI Prod', actionTypeId: '.gen-ai' },
          { id: 'id-2', name: 'OpenAI Dev', actionTypeId: '.gen-ai' },
        ]);
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: 'OpenAI' },
          ctx
        )) as ToolHandlerStandardReturn;

        const errResult = result.results[0] as ErrorResult;
        expect(errResult.type).toBe(ToolResultType.error);
        expect((errResult.data as { message: string }).message).toContain('Multiple AI connectors');
        expect((errResult.data as { message: string }).message).toContain('"OpenAI Prod"');
        expect((errResult.data as { message: string }).message).toContain('"OpenAI Dev"');
        expect(mockRunLeadGenerationPipeline).not.toHaveBeenCalled();
      });

      it('returns error with available names when no connector matches', async () => {
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: 'Gemini' },
          ctx
        )) as ToolHandlerStandardReturn;

        const errResult = result.results[0] as ErrorResult;
        expect(errResult.type).toBe(ToolResultType.error);
        expect((errResult.data as { message: string }).message).toContain('No AI connector found');
        expect((errResult.data as { message: string }).message).toContain(`"${CONNECTOR_NAME}"`);
        expect(mockRunLeadGenerationPipeline).not.toHaveBeenCalled();
      });

      it('excludes non-AI connectors from name resolution', async () => {
        // 'OpenAI' named as a non-AI connector (e.g. Slack) + 'Bedrock' as the only AI connector.
        // Searching for 'OpenAI' should only look among AI connectors and find no match.
        mockActionsGetAll.mockResolvedValue([
          { id: 'slack-id', name: 'OpenAI', actionTypeId: '.slack' },
          { id: CONNECTOR_ID, name: 'Bedrock', actionTypeId: '.bedrock' },
        ]);
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: 'OpenAI' },
          ctx
        )) as ToolHandlerStandardReturn;

        const errResult = result.results[0] as ErrorResult;
        expect(errResult.type).toBe(ToolResultType.error);
        expect((errResult.data as { message: string }).message).toContain('No AI connector found');
      });

      it('skips saved config lookup when connectorName is provided', async () => {
        const ctx = acceptedCtx();
        await tool.handler({ connectorName: CONNECTOR_NAME }, ctx);

        expect(mockGetLeadGenerationConfig).not.toHaveBeenCalled();
      });
    });

    describe('fallback to saved config', () => {
      it('uses connectorId from saved config when no connectorName arg provided', async () => {
        const ctx = acceptedCtx();
        const result = (await tool.handler({}, ctx)) as ToolHandlerStandardReturn;

        expect(mockGetLeadGenerationConfig).toHaveBeenCalled();
        expect(mockGetActionsClientWithRequest).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect((other.data as { status: string }).status).toBe('running');
      });

      it('returns error when no connectorName in args and no saved config', async () => {
        mockGetLeadGenerationConfig.mockResolvedValue(null);
        const ctx = acceptedCtx();
        const result = (await tool.handler({}, ctx)) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const errResult = result.results[0] as ErrorResult;
        expect(errResult.type).toBe(ToolResultType.error);
        expect((errResult.data as { message: string }).message).toContain('No AI connector');
        expect(mockRunLeadGenerationPipeline).not.toHaveBeenCalled();
      });
    });

    describe('pipeline lifecycle', () => {
      it('returns running status with a valid UUID', async () => {
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: CONNECTOR_NAME },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(result.results).toHaveLength(1);
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        const data = other.data as { executionUuid: string; status: string; message: string };
        expect(data.status).toBe('running');
        expect(data.executionUuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
      });

      it('saves the resolved connector ID to config before starting the pipeline', async () => {
        const ctx = acceptedCtx();
        await tool.handler({ connectorName: CONNECTOR_NAME }, ctx);

        expect(mockUpsertLeadGenerationConfig).toHaveBeenCalledWith(
          expect.anything(),
          expect.any(String),
          expect.objectContaining({ connectorId: CONNECTOR_ID })
        );
      });

      it('runs the pipeline with spaceId and sourceType adhoc', async () => {
        const ctx = acceptedCtx();
        await tool.handler({ connectorName: CONNECTOR_NAME }, ctx);

        // Let background IIFE resolve
        await Promise.resolve();
        await Promise.resolve();

        expect(mockRunLeadGenerationPipeline).toHaveBeenCalledWith(
          expect.objectContaining({
            spaceId: 'default',
            sourceType: 'adhoc',
          })
        );
      });

      it('returns error result when getStartServices throws', async () => {
        mockGetStartServices.mockRejectedValue(new Error('start services unavailable'));
        const ctx = acceptedCtx();
        const result = (await tool.handler(
          { connectorName: CONNECTOR_NAME },
          ctx
        )) as ToolHandlerStandardReturn;

        const errResult = result.results[0] as ErrorResult;
        expect(errResult.type).toBe(ToolResultType.error);
        expect((errResult.data as { message: string }).message).toContain(
          'start services unavailable'
        );
      });
    });
  });

  describe('handler — telemetry', () => {
    it('does not report telemetry while only asking for confirmation', async () => {
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });
      (ctx.prompts.askForConfirmation as jest.Mock).mockReturnValue({ type: 'confirmation' });

      await tool.handler({}, ctx);

      expect(mockCoreStart.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('reports userConfirmationOutcome=accepted and success=true after a successful start', async () => {
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.accepted,
      });

      await tool.handler({ connectorName: CONNECTOR_NAME }, ctx);

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        {
          toolId: SECURITY_GENERATE_LEADS_TOOL_ID,
          actionType: 'mutation',
          spaceId: 'default',
          success: true,
          errorMessage: undefined,
          userConfirmationOutcome: ConfirmationStatus.accepted,
        }
      );
    });

    it('reports userConfirmationOutcome=rejected when the user declines the prompt', async () => {
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.rejected,
      });

      await tool.handler({}, ctx);

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        {
          toolId: SECURITY_GENERATE_LEADS_TOOL_ID,
          actionType: 'mutation',
          spaceId: 'default',
          success: true,
          errorMessage: undefined,
          userConfirmationOutcome: ConfirmationStatus.rejected,
        }
      );
    });

    it('reports success=false when the caller lacks write privilege', async () => {
      mockGetUserLeadPrivileges.mockResolvedValue({
        adhoc: { has_read_permissions: true, has_write_permissions: false },
        scheduled: { has_read_permissions: true, has_write_permissions: true },
        has_all_required: false,
        privileges: {},
      });

      await tool.handler({}, handlerContext());

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        {
          toolId: SECURITY_GENERATE_LEADS_TOOL_ID,
          actionType: 'mutation',
          spaceId: 'default',
          success: false,
          errorMessage: 'You do not have permission to generate leads in this space.',
          userConfirmationOutcome: undefined,
        }
      );
    });

    it('reports success=false when no connector is configured (validation error)', async () => {
      mockGetLeadGenerationConfig.mockResolvedValue({ connectorId: undefined });
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.accepted,
      });

      await tool.handler({}, ctx);

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        {
          toolId: SECURITY_GENERATE_LEADS_TOOL_ID,
          actionType: 'mutation',
          spaceId: 'default',
          success: false,
          errorMessage:
            'No AI connector is configured for lead generation. Provide a connectorName argument, or configure one via the Lead Generation settings.',
          userConfirmationOutcome: ConfirmationStatus.accepted,
        }
      );
    });

    it('reports success=false and errorMessage when getStartServices throws', async () => {
      mockGetStartServices.mockRejectedValue(new Error('boom'));
      const ctx = handlerContext();
      (ctx.prompts.checkConfirmationStatus as jest.Mock).mockReturnValue({
        status: ConfirmationStatus.accepted,
      });

      await tool.handler({ connectorName: CONNECTOR_NAME }, ctx);

      expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
        ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
        {
          toolId: SECURITY_GENERATE_LEADS_TOOL_ID,
          actionType: 'mutation',
          spaceId: 'default',
          success: false,
          errorMessage: 'boom',
          userConfirmationOutcome: ConfirmationStatus.accepted,
        }
      );
    });
  });
});
