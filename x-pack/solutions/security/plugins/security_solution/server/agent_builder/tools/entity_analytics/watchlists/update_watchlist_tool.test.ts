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
  ToolHandlerStandardReturn,
  ToolHandlerPromptReturn,
} from '@kbn/agent-builder-server/tools';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../../common';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { getWatchlistToolAvailability } from './watchlist_availability';
import { updateWatchlistTool, SECURITY_UPDATE_WATCHLIST_TOOL_ID } from './update_watchlist_tool';

jest.mock('./watchlist_availability', () => ({
  getWatchlistToolAvailability: jest.fn(),
}));

const mockGetWatchlistToolAvailability = getWatchlistToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsWatchlistEnabled: true,
} as ExperimentalFeatures;

const mockGetFn = jest.fn();
const mockUpdateFn = jest.fn();
jest.mock('../../../../lib/entity_analytics/watchlists/management/watchlist_config', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/management/watchlist_config'
  );
  return {
    ...actual,
    WatchlistConfigClient: jest.fn().mockImplementation(() => ({
      get: mockGetFn,
      update: mockUpdateFn,
    })),
  };
});

const mockGetUserWatchlistPrivileges = jest.fn();
jest.mock(
  '../../../../lib/entity_analytics/watchlists/management/get_user_watchlist_privileges',
  () => ({
    getUserWatchlistPrivileges: (...args: unknown[]) => mockGetUserWatchlistPrivileges(...args),
  })
);

const buildExistingWatchlist = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'wl-1',
  name: 'Privileged Users',
  description: 'Sensitive accounts under continuous review',
  managed: false,
  riskModifier: 1,
  entitySourceIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  ...overrides,
});

const buildHandlerContextWithPrompts = (
  base: ReturnType<typeof createToolTestMocks>,
  promptOverrides: {
    checkStatus?: ConfirmationStatus;
    askResult?: ToolHandlerPromptReturn;
  } = {}
) => {
  const ctx = createToolHandlerContext(base.mockRequest, base.mockEsClient, base.mockLogger);
  ctx.callContext = {
    ...ctx.callContext,
    toolCallId: 'tool-call-update',
  };
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

describe('updateWatchlistTool', () => {
  const mocks = createToolTestMocks();
  const tool = updateWatchlistTool(mocks.mockCore, mocks.mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mocks.mockCore, mocks.mockEsClient);
    mockGetWatchlistToolAvailability.mockResolvedValue({ status: 'available' });
    mockGetUserWatchlistPrivileges.mockResolvedValue({
      privileges: {},
      has_all_required: true,
      has_read_permissions: true,
      has_write_permissions: true,
    });
  });

  describe('availability', () => {
    it('is available when the AB resource check passes and watchlists are enabled', async () => {
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mocks.mockRequest, 'default')
      );
      expect(result.status).toBe('available');
    });

    it('is unavailable when availability check returns unavailable', async () => {
      mockGetWatchlistToolAvailability.mockResolvedValueOnce({
        status: 'unavailable',
        reason: 'not in a security space',
      });
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mocks.mockRequest, 'default')
      );
      expect(result.status).toBe('unavailable');
    });
  });

  describe('schema', () => {
    it('accepts watchlistId + name update', () => {
      const result = tool.schema.safeParse({ watchlistId: 'wl-1', name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('accepts watchlistId + riskModifier update', () => {
      const result = tool.schema.safeParse({ watchlistId: 'wl-1', riskModifier: 1.5 });
      expect(result.success).toBe(true);
    });

    it('rejects a missing watchlistId', () => {
      const result = tool.schema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(false);
    });

    it('rejects a riskModifier not in the allowed set', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', riskModifier: 1.25 }).success).toBe(
        false
      );
    });

    it('rejects a name longer than 256 characters', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', name: 'x'.repeat(257) }).success).toBe(
        false
      );
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', name: 'x'.repeat(256) }).success).toBe(
        true
      );
    });

    it('rejects a description longer than 1000 characters', () => {
      expect(
        tool.schema.safeParse({ watchlistId: 'wl-1', description: 'y'.repeat(1001) }).success
      ).toBe(false);
      expect(
        tool.schema.safeParse({ watchlistId: 'wl-1', description: 'y'.repeat(1000) }).success
      ).toBe(true);
    });
  });

  describe('handler', () => {
    it('returns an error when no update fields are supplied', async () => {
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { watchlistId: 'wl-1' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockGetFn).not.toHaveBeenCalled();
      expect(mockUpdateFn).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/at least one/i);
    });

    it('returns an error when the caller lacks write privilege', async () => {
      mockGetUserWatchlistPrivileges.mockResolvedValueOnce({
        privileges: {},
        has_all_required: false,
        has_read_permissions: true,
        has_write_permissions: false,
      });
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { watchlistId: 'wl-1', name: 'New Name' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockGetFn).not.toHaveBeenCalled();
      expect(mockUpdateFn).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/permission/i);
    });

    describe('HITL', () => {
      it('on unprompted: fetches existing, asks for confirmation showing old → new for changing fields', async () => {
        mockGetFn.mockResolvedValueOnce(
          buildExistingWatchlist({ name: 'Privileged Users', riskModifier: 1 })
        );

        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler(
          { watchlistId: 'wl-1', name: 'Senior Privileged Users', riskModifier: 2 },
          ctx
        );

        expect(mockGetFn).toHaveBeenCalledWith('wl-1');
        expect(mockUpdateFn).not.toHaveBeenCalled();
        expect(ctx.prompts.askForConfirmation).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'watchlists.update_watchlist.tool-call-update',
            title: 'Update watchlist',
            confirm_text: 'Update',
            cancel_text: 'Cancel',
            color: 'primary',
            message: expect.stringContaining('"Privileged Users" → "Senior Privileged Users"'),
          })
        );
        const message = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0].message;
        expect(message).toMatch(/Risk modifier/);
      });

      it('on unprompted with no actual changes: returns a "no changes" result without prompting', async () => {
        mockGetFn.mockResolvedValueOnce(
          buildExistingWatchlist({ name: 'Privileged Users', riskModifier: 1 })
        );

        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', name: 'Privileged Users', riskModifier: 1 },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUpdateFn).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toMatchObject({ message: expect.stringContaining('No changes') });
      });

      it('on accept: updates without re-fetching, returns the updated watchlist', async () => {
        const updated = buildExistingWatchlist({ name: 'Senior Privileged Users' });
        mockUpdateFn.mockResolvedValueOnce(updated);

        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', name: 'Senior Privileged Users' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockGetFn).not.toHaveBeenCalled();
        expect(mockUpdateFn).toHaveBeenCalledWith('wl-1', { name: 'Senior Privileged Users' });
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toEqual({ watchlist: updated });
      });

      it('on reject: returns an error result without updating', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', name: 'X' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockUpdateFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/declined/i);
      });
    });

    it('returns an error result when the service throws on update', async () => {
      mockUpdateFn.mockRejectedValueOnce(new Error('boom'));
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.accepted,
      });

      const result = (await tool.handler(
        { watchlistId: 'wl-1', name: 'X' },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('boom');
    });

    describe('telemetry', () => {
      it('does not report telemetry while only asking for confirmation', async () => {
        mockGetFn.mockResolvedValueOnce(buildExistingWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ watchlistId: 'wl-1', name: 'New Name' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).not.toHaveBeenCalled();
      });

      it('reports telemetry for a "no changes" outcome, without ever prompting', async () => {
        mockGetFn.mockResolvedValueOnce(
          buildExistingWatchlist({ name: 'Privileged Users', riskModifier: 1 })
        );
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ watchlistId: 'wl-1', name: 'Privileged Users', riskModifier: 1 }, ctx);

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_UPDATE_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: true,
            errorMessage: undefined,
            userConfirmationOutcome: ConfirmationStatus.unprompted,
          }
        );
      });

      it('reports userConfirmationOutcome=accepted and success=true after a successful update', async () => {
        mockUpdateFn.mockResolvedValueOnce(buildExistingWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        await tool.handler({ watchlistId: 'wl-1', name: 'New Name' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_UPDATE_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: true,
            errorMessage: undefined,
            userConfirmationOutcome: ConfirmationStatus.accepted,
          }
        );
      });

      it('reports userConfirmationOutcome=rejected when the user declines the prompt', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        await tool.handler({ watchlistId: 'wl-1', name: 'New Name' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_UPDATE_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: true,
            errorMessage: undefined,
            userConfirmationOutcome: ConfirmationStatus.rejected,
          }
        );
      });

      it('reports success=false when no update fields are supplied', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks);

        await tool.handler({ watchlistId: 'wl-1' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_UPDATE_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: false,
            errorMessage:
              'No update fields supplied. Pass at least one of name, description, or riskModifier.',
            userConfirmationOutcome: undefined,
          }
        );
      });

      it('reports success=false when the caller lacks write privilege', async () => {
        mockGetUserWatchlistPrivileges.mockResolvedValueOnce({
          privileges: {},
          has_all_required: false,
          has_read_permissions: true,
          has_write_permissions: false,
        });
        const ctx = buildHandlerContextWithPrompts(mocks);

        await tool.handler({ watchlistId: 'wl-1', name: 'New Name' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_UPDATE_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: false,
            errorMessage: 'You do not have permission to update watchlists in this space.',
            userConfirmationOutcome: undefined,
          }
        );
      });

      it('reports success=false and errorMessage when the update call throws', async () => {
        mockUpdateFn.mockRejectedValueOnce(new Error('boom'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        await tool.handler({ watchlistId: 'wl-1', name: 'New Name' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_UPDATE_WATCHLIST_TOOL_ID,
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
});
