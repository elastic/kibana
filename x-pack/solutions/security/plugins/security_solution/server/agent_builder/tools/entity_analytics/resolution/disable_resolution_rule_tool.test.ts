/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { coreMock } from '@kbn/core/server/mocks';
import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type {
  ToolHandlerPromptReturn,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../../common';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { getResolutionToolAvailability } from './resolution_availability';
import {
  disableResolutionRuleTool,
  SECURITY_DISABLE_RESOLUTION_RULE_TOOL_ID,
} from './disable_resolution_rule_tool';

const mockSetEnabled = jest.fn();

jest.mock('./resolution_availability', () => ({
  getResolutionToolAvailability: jest.fn(),
}));

const mockGetResolutionToolAvailability = getResolutionToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const buildHandlerContextWithPrompts = (
  base: ReturnType<typeof createToolTestMocks>,
  promptOverrides: {
    checkStatus?: ConfirmationStatus;
    askResult?: ToolHandlerPromptReturn;
  } = {}
) => {
  const ctx = createToolHandlerContext(base.mockRequest, base.mockEsClient, base.mockLogger);
  ctx.callContext = { ...ctx.callContext, toolCallId: 'tool-call-disable' };
  ctx.prompts = {
    ...ctx.prompts,
    checkConfirmationStatus: jest.fn().mockReturnValue({
      status: promptOverrides.checkStatus ?? ConfirmationStatus.unprompted,
    }),
    askForConfirmation: jest.fn().mockReturnValue(
      promptOverrides.askResult ?? {
        prompt: {
          id: 'placeholder',
          type: 'confirm',
          definition: { id: 'placeholder', title: 'placeholder' },
        },
      }
    ),
  };
  return ctx;
};

describe('disableResolutionRuleTool', () => {
  const mocks = createToolTestMocks();
  const tool = disableResolutionRuleTool(
    mocks.mockCore,
    mocks.mockLogger,
    mockExperimentalFeatures
  );
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(
      mocks.mockCore,
      mocks.mockEsClient,
      mocks.mockSecurityStart
    );
    mocks.mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: {
          createResolutionRulesClient: jest.fn().mockReturnValue({ setEnabled: mockSetEnabled }),
        },
        security: mocks.mockSecurityStart,
      },
      {},
    ]);
    mockGetResolutionToolAvailability.mockResolvedValue({ status: 'available' });
  });

  describe('availability', () => {
    it('delegates to getResolutionToolAvailability', async () => {
      mockGetResolutionToolAvailability.mockResolvedValueOnce({ status: 'unavailable' });

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mocks.mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
    });
  });

  describe('schema', () => {
    it('accepts a known rule id', () => {
      expect(tool.schema.safeParse({ ruleId: 'windows_sid_bridge' }).success).toBe(true);
    });

    it('rejects an unknown rule id', () => {
      expect(tool.schema.safeParse({ ruleId: 'made_up_rule' }).success).toBe(false);
    });
  });

  describe('handler', () => {
    describe('HITL', () => {
      it('on unprompted: confirmation message names the rule and uses a danger color', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ ruleId: 'windows_sid_bridge' }, ctx);

        expect(mockSetEnabled).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs).toMatchObject({
          id: 'resolution.disable_resolution_rule.tool-call-disable',
          title: 'Disable resolution rule',
          confirm_text: 'Disable',
          cancel_text: 'Cancel',
          color: 'danger',
        });
        expect(askArgs.message).toContain('windows_sid_bridge');
      });

      it('on accept: disables the rule and returns its new state', async () => {
        mockSetEnabled.mockResolvedValueOnce({ id: 'windows_sid_bridge', enabled: false });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        const result = (await tool.handler(
          { ruleId: 'windows_sid_bridge' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockSetEnabled).toHaveBeenCalledWith('windows_sid_bridge', false);
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toEqual({ rule: { id: 'windows_sid_bridge', enabled: false } });
      });

      it('on reject: returns an error result without disabling', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { ruleId: 'windows_sid_bridge' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockSetEnabled).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/declined/i);
      });
    });

    it('returns an error result when the user lacks permission to disable resolution rules', async () => {
      mocks.mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.accepted,
      });

      const result = (await tool.handler(
        { ruleId: 'windows_sid_bridge' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockSetEnabled).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('permission');
    });

    it('returns an error result when setEnabled throws', async () => {
      mockSetEnabled.mockRejectedValueOnce(new Error('boom'));
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.accepted,
      });

      const result = (await tool.handler(
        { ruleId: 'windows_sid_bridge' },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('boom');
    });

    describe('telemetry', () => {
      it('reports success=true after disabling', async () => {
        mockSetEnabled.mockResolvedValueOnce({ id: 'windows_sid_bridge', enabled: false });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        await tool.handler({ ruleId: 'windows_sid_bridge' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          expect.objectContaining({
            toolId: SECURITY_DISABLE_RESOLUTION_RULE_TOOL_ID,
            actionType: 'mutation',
            success: true,
          })
        );
      });
    });
  });
});
