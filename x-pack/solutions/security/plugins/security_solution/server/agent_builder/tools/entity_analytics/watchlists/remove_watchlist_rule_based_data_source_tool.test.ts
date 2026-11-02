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
import { fingerprintDataSource } from './data_source_utils';
import {
  removeWatchlistRuleBasedDataSourceTool,
  SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
} from './remove_watchlist_rule_based_data_source_tool';

jest.mock('./watchlist_availability', () => ({
  getWatchlistToolAvailability: jest.fn(),
}));

const mockGetWatchlistToolAvailability = getWatchlistToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsWatchlistEnabled: true,
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const mockGetWatchlistFn = jest.fn();
const mockGetEntitySourceIdsFn = jest.fn().mockResolvedValue([]);
const mockRemoveEntitySourceReferenceFn = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../lib/entity_analytics/watchlists/management/watchlist_config', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/management/watchlist_config'
  );
  return {
    ...actual,
    WatchlistConfigClient: jest.fn().mockImplementation(() => ({
      get: mockGetWatchlistFn,
      getEntitySourceIds: mockGetEntitySourceIdsFn,
      removeEntitySourceReference: mockRemoveEntitySourceReferenceFn,
    })),
  };
});

const mockListFn = jest.fn().mockResolvedValue({ sources: [] });
const mockDeleteFn = jest.fn().mockResolvedValue(undefined);
const mockSyncWatchlistInBackgroundFn = jest.fn();
jest.mock(
  '../../../../lib/entity_analytics/watchlists/entity_sources/entity_sources_service',
  () => ({
    syncWatchlistInBackground: (...args: unknown[]) => mockSyncWatchlistInBackgroundFn(...args),
  })
);
jest.mock('../../../../lib/entity_analytics/watchlists/entity_sources/infra', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/entity_sources/infra'
  );
  return {
    ...actual,
    WatchlistEntitySourceClient: jest.fn().mockImplementation(() => ({
      list: mockListFn,
      delete: mockDeleteFn,
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

const buildWatchlist = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'wl-1',
  name: 'Privileged Users',
  managed: false,
  entitySourceIds: [],
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
  ctx.callContext = { ...ctx.callContext, toolCallId: 'tool-call-remove' };
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

describe('removeWatchlistRuleBasedDataSourceTool', () => {
  const mocks = createToolTestMocks();
  const tool = removeWatchlistRuleBasedDataSourceTool(
    mocks.mockCore,
    mocks.mockLogger,
    mockExperimentalFeatures,
    true
  );
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
    mockGetEntitySourceIdsFn.mockResolvedValue([]);
    mockListFn.mockResolvedValue({ sources: [] });
  });

  describe('availability', () => {
    it('is available when the AB resource check passes and both flags are on', async () => {
      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mocks.mockRequest, 'default')
      );
      expect(result.status).toBe('available');
    });
  });

  describe('schema', () => {
    it('accepts a valid payload', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', type: 'store' }).success).toBe(true);
    });

    it('rejects an unknown type', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', type: 'manual' }).success).toBe(false);
    });

    it('rejects a missing type', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1' }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns an error when the caller lacks write privilege', async () => {
      mockGetUserWatchlistPrivileges.mockResolvedValueOnce({
        privileges: {},
        has_all_required: false,
        has_read_permissions: true,
        has_write_permissions: false,
      });
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { watchlistId: 'wl-1', type: 'store' },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/permission/i);
    });

    it('errors, without prompting, when no source of that type exists and none of any type', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { watchlistId: 'wl-1', type: 'store' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.data.message).toBe(
        'Watchlist "Privileged Users" does not have a store rule-based data source to remove.'
      );
    });

    it('errors, without prompting, and mentions the other type when it exists instead', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
      mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
      mockListFn.mockResolvedValueOnce({
        sources: [{ id: 'src-1', type: 'index', name: 'wl-index', managed: false }],
      });
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { watchlistId: 'wl-1', type: 'store' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.data.message).toBe(
        'Watchlist "Privileged Users" does not have a store rule-based data source to remove. This watchlist has an index source instead.'
      );
    });

    it('errors, without prompting, when the source of that type is managed', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
      mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
      mockListFn.mockResolvedValueOnce({
        sources: [{ id: 'src-1', type: 'index', name: 'okta-index', managed: true }],
      });
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { watchlistId: 'wl-1', type: 'index' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockDeleteFn).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.data.message).toMatch(/managed/i);
      expect(error.data.message).toMatch(/cannot currently be removed/i);
    });

    describe('HITL', () => {
      it('on accept: refuses when the source changed after the confirmation was shown', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [
            { id: 'src-1', type: 'store', name: 'wl-store', queryRule: 'edited: elsewhere' },
          ],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: 'stale-fingerprint' });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', type: 'store' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockDeleteFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/changed after the confirmation/i);
      });

      it('on accept: refuses when the approved confirmation state is missing', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [{ id: 'src-1', type: 'store', name: 'wl-store' }],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        // Simulate lost confirmation state (e.g. the interrupt/resume state was not persisted).
        ctx.stateManager.getState = jest.fn().mockReturnValue(undefined);

        const result = (await tool.handler(
          { watchlistId: 'wl-1', type: 'store' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockDeleteFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/changed after the confirmation/i);
      });

      it('on unprompted: prompt names the watchlist, type, and query', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ name: 'Privileged Users', entitySourceIds: ['src-1'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [
            {
              id: 'src-1',
              type: 'store',
              name: 'wl-store',
              managed: false,
              queryRule: 'host.os.name: "Ubuntu*"',
            },
          ],
        });
        const ctx = buildHandlerContextWithPrompts(mocks);

        await tool.handler({ watchlistId: 'wl-1', type: 'store' }, ctx);

        expect(mockDeleteFn).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs).toMatchObject({
          id: 'watchlists.remove_watchlist_rule_based_data_source.tool-call-remove',
          title: 'Remove rule-based data source',
          confirm_text: 'Remove',
          cancel_text: 'Cancel',
          color: 'warning',
        });
        expect(askArgs.message).toContain('"Privileged Users"');
        expect(askArgs.message).toContain('host.os.name: "Ubuntu*"');
      });

      it('on unprompted: prompt for an index source names its index pattern, identifier field, and range', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ name: 'Ubuntu Hosts', entitySourceIds: ['src-2'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-2']);
        mockListFn.mockResolvedValueOnce({
          sources: [
            {
              id: 'src-2',
              type: 'index',
              name: 'wl-1-index',
              managed: false,
              queryRule: 'event.action: "user.session.start"',
              indexPattern: 'logs-okta.system-*',
              identifierField: 'user.email',
              range: { start: 'now-10d', end: 'now' },
            },
          ],
        });
        const ctx = buildHandlerContextWithPrompts(mocks);

        await tool.handler({ watchlistId: 'wl-1', type: 'index' }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        // Identifying params are shown (not the internal source name) so the user can spot a
        // mismatch if more than one source of this type ended up linked to the watchlist.
        expect(askArgs.message).toContain('logs-okta.system-*');
        expect(askArgs.message).toContain('user.email');
        expect(askArgs.message).toContain('now-10d to now');
        expect(askArgs.message).toContain('event.action: "user.session.start"');
      });

      it('on accept: deletes the source before unlinking it', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        const source = { id: 'src-1', type: 'store' as const, name: 'wl-store', managed: false };
        mockListFn.mockResolvedValueOnce({ sources: [source] });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(source) });

        const callOrder: string[] = [];
        mockDeleteFn.mockImplementationOnce(async () => {
          callOrder.push('delete');
        });
        mockRemoveEntitySourceReferenceFn.mockImplementationOnce(async () => {
          callOrder.push('unlink');
        });
        mockSyncWatchlistInBackgroundFn.mockImplementationOnce(() => {
          callOrder.push('sync');
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', type: 'store' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(callOrder).toEqual(['delete', 'unlink', 'sync']);
        expect(mockDeleteFn).toHaveBeenCalledWith('src-1');
        expect(mockRemoveEntitySourceReferenceFn).toHaveBeenCalledWith('wl-1', source);
        expect(mockSyncWatchlistInBackgroundFn).toHaveBeenCalledWith(
          expect.objectContaining({
            watchlistId: 'wl-1',
            logContext: SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
          })
        );
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toMatchObject({ watchlistId: 'wl-1', removedSourceId: 'src-1' });
      });

      it('on accept: does not unlink the source if deleting it fails', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        const source = { id: 'src-1', type: 'store' as const, name: 'wl-store', managed: false };
        mockListFn.mockResolvedValueOnce({ sources: [source] });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(source) });
        mockDeleteFn.mockRejectedValueOnce(new Error('ES unavailable'));

        const result = (await tool.handler(
          { watchlistId: 'wl-1', type: 'store' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockSyncWatchlistInBackgroundFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/ES unavailable/);
      });

      it('on reject: returns an error result without deleting', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [{ id: 'src-1', type: 'store', name: 'wl-store', managed: false }],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', type: 'store' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockDeleteFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.data.message).toMatch(/declined/i);
      });
    });

    describe('telemetry', () => {
      it('reports success=true and resultCount=1 after a successful removal', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        const source = { id: 'src-1', type: 'store' as const, name: 'wl-store', managed: false };
        mockListFn.mockResolvedValueOnce({ sources: [source] });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(source) });

        await tool.handler({ watchlistId: 'wl-1', type: 'store' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: true,
            resultCount: 1,
            errorMessage: undefined,
            userConfirmationOutcome: ConfirmationStatus.accepted,
          }
        );
      });
    });
  });
});
