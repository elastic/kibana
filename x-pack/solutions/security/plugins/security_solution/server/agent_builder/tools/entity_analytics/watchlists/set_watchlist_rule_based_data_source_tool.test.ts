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
  setWatchlistRuleBasedDataSourceTool,
  SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
} from './set_watchlist_rule_based_data_source_tool';

jest.mock('./watchlist_availability', () => ({
  getWatchlistToolAvailability: jest.fn(),
}));

jest.mock('./data_source_utils', () => ({
  ...jest.requireActual('./data_source_utils'),
  previewStoreSource: jest.fn().mockResolvedValue({ total: 47 }),
  formatStorePreviewMessage: jest.fn().mockReturnValue('Matches 47 entities right now.'),
  previewIndexSource: jest.fn().mockResolvedValue({ docCount: 5, distinctIdentifierCount: 1 }),
  formatIndexPreviewMessage: jest.fn().mockReturnValue('Your query matches 5 documents.'),
}));

const mockGetWatchlistToolAvailability = getWatchlistToolAvailability as jest.Mock;

const mockExperimentalFeatures = {
  entityAnalyticsWatchlistEnabled: true,
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const mockGetWatchlistFn = jest.fn();
const mockGetEntitySourceIdsFn = jest.fn().mockResolvedValue([]);
const mockAddEntitySourceReferenceFn = jest.fn().mockResolvedValue(undefined);
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
      addEntitySourceReference: mockAddEntitySourceReferenceFn,
      removeEntitySourceReference: mockRemoveEntitySourceReferenceFn,
    })),
  };
});

const mockListFn = jest.fn().mockResolvedValue({ sources: [] });
const mockCreateFn = jest.fn();
const mockUpdateFn = jest.fn();
const mockDeleteFn = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../lib/entity_analytics/watchlists/entity_sources/infra', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/entity_sources/infra'
  );
  return {
    ...actual,
    WatchlistEntitySourceClient: jest.fn().mockImplementation(() => ({
      list: mockListFn,
      create: mockCreateFn,
      update: mockUpdateFn,
      delete: mockDeleteFn,
    })),
  };
});

const mockSyncWatchlistInBackgroundFn = jest.fn();
jest.mock(
  '../../../../lib/entity_analytics/watchlists/entity_sources/entity_sources_service',
  () => ({
    syncWatchlistInBackground: (...args: unknown[]) => mockSyncWatchlistInBackgroundFn(...args),
  })
);

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
  ctx.callContext = { ...ctx.callContext, toolCallId: 'tool-call-set' };
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

describe('setWatchlistRuleBasedDataSourceTool', () => {
  const mocks = createToolTestMocks();
  const tool = setWatchlistRuleBasedDataSourceTool(
    mocks.mockCore,
    mocks.mockLogger,
    mockExperimentalFeatures,
    true
  );
  const toolNoEncryptionKey = setWatchlistRuleBasedDataSourceTool(
    mocks.mockCore,
    mocks.mockLogger,
    mockExperimentalFeatures,
    false
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
    it('accepts a valid store source', () => {
      expect(
        tool.schema.safeParse({
          type: 'store',
          watchlistId: 'wl-1',
          queryRule: 'host.os.name: "Ubuntu*"',
        }).success
      ).toBe(true);
    });

    it('accepts a valid index source', () => {
      expect(
        tool.schema.safeParse({
          type: 'index',
          watchlistId: 'wl-1',
          queryRule: 'event.action: "user.session.start"',
          indexPattern: 'logs-okta*',
          identifierField: 'user.name',
        }).success
      ).toBe(true);
    });

    it('rejects an index source with an identifierField outside the fixed list', () => {
      expect(
        tool.schema.safeParse({
          type: 'index',
          watchlistId: 'wl-1',
          queryRule: 'a: b',
          indexPattern: 'logs-okta*',
          identifierField: 'not.a.real.field',
        }).success
      ).toBe(false);
    });

    it('rejects an index source missing indexPattern', () => {
      expect(
        tool.schema.safeParse({
          type: 'index',
          watchlistId: 'wl-1',
          queryRule: 'a: b',
          identifierField: 'user.name',
        }).success
      ).toBe(false);
    });

    it('rejects an unknown type', () => {
      expect(
        tool.schema.safeParse({ type: 'manual', watchlistId: 'wl-1', queryRule: 'a: b' }).success
      ).toBe(false);
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
        { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockGetWatchlistFn).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/permission/i);
    });

    it('rejects an index source without confirming when encryption is unavailable', async () => {
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await toolNoEncryptionKey.handler(
        {
          type: 'index',
          watchlistId: 'wl-1',
          queryRule: 'a: b',
          indexPattern: 'logs-*',
          identifierField: 'user.name',
        },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/encrypted saved objects/i);
    });

    it('rejects replacing a managed source of the same type before prompting', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
      mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
      mockListFn.mockResolvedValueOnce({
        sources: [{ id: 'src-1', type: 'store', name: 'locked-store', managed: true }],
      });
      const ctx = buildHandlerContextWithPrompts(mocks);

      const result = (await tool.handler(
        { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockCreateFn).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/managed/i);
      expect(error.data.message).toContain('locked-store');
    });

    describe('one-source invariant for non-managed watchlists', () => {
      it('rejects creating a source of the other type when the existing other-type source is managed', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-1'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [{ id: 'src-1', type: 'index', name: 'locked-index', managed: true }],
        });
        const ctx = buildHandlerContextWithPrompts(mocks);

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockCreateFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/managed/i);
        expect(error.data.message).toMatch(/index pattern/i);
      });

      it('on unprompted: warns that the existing other-type source will be removed on a non-managed watchlist', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-1'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [{ id: 'src-1', type: 'index', name: 'wl-index', managed: false }],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toMatch(/remove its existing.*index pattern.*source/i);
      });

      it('on accept: removes the other-type source, after the new one is created and linked, by deleting it before unlinking it', async () => {
        const conflictingSource = { id: 'src-old-index', type: 'index' as const, name: 'wl-index' };
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-old-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-old-index']);
        mockListFn.mockResolvedValueOnce({ sources: [conflictingSource] });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: conflictingSource.id,
        });

        const callOrder: string[] = [];
        mockCreateFn.mockImplementationOnce(async () => {
          callOrder.push('create');
          return { id: 'src-new-store', type: 'store', name: 'wl-store', managed: false };
        });
        mockAddEntitySourceReferenceFn.mockImplementationOnce(async () => {
          callOrder.push('link');
        });
        mockDeleteFn.mockImplementationOnce(async () => {
          callOrder.push('delete-conflicting');
        });
        mockRemoveEntitySourceReferenceFn.mockImplementationOnce(async () => {
          callOrder.push('unlink-conflicting');
        });

        await tool.handler({ type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' }, ctx);

        expect(mockRemoveEntitySourceReferenceFn).toHaveBeenCalledWith('wl-1', conflictingSource);
        expect(mockDeleteFn).toHaveBeenCalledWith('src-old-index');
        expect(mockCreateFn).toHaveBeenCalled();
        // The conflicting source is only touched once the replacement is safely created and
        // linked — never before, since a failure at either step would otherwise leave the
        // watchlist with no rule-based source at all. It's deleted before being unlinked — if
        // unlinking then fails, the leftover reference just points to an already-deleted source
        // (harmless — see syncWatchlist), instead of leaving the old source and its credential
        // orphaned but still live.
        expect(callOrder).toEqual(['create', 'link', 'delete-conflicting', 'unlink-conflicting']);
      });

      it('on accept: fails the whole request if deleting the conflicting source fails, leaving it fully untouched', async () => {
        const conflictingSource = { id: 'src-old-index', type: 'index' as const, name: 'wl-index' };
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-old-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-old-index']);
        mockListFn.mockResolvedValueOnce({ sources: [conflictingSource] });
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new-store',
          type: 'store',
          name: 'wl-store',
          managed: false,
        });
        mockDeleteFn.mockRejectedValueOnce(new Error('ES unavailable'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: conflictingSource.id,
        });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        // Delete failed, so unlink is never attempted — the conflicting source stays fully
        // intact (rather than being unlinked-but-not-deleted, i.e. orphaned) — and the request
        // reports the failure instead of a misleading full success.
        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/ES unavailable/);
      });

      it('on accept: still succeeds if unlinking the conflicting source fails after it was deleted', async () => {
        const conflictingSource = { id: 'src-old-index', type: 'index' as const, name: 'wl-index' };
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-old-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-old-index']);
        mockListFn.mockResolvedValueOnce({ sources: [conflictingSource] });
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new-store',
          type: 'store',
          name: 'wl-store',
          managed: false,
        });
        mockRemoveEntitySourceReferenceFn.mockRejectedValueOnce(new Error('SO update conflict'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: conflictingSource.id,
        });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        // The real work (deleting the old source) succeeded — only unlinking the now-dangling
        // reference failed, which is harmless (see syncWatchlist's active-ids fix) and just
        // logged, so the request still reports success.
        expect(mockDeleteFn).toHaveBeenCalledWith('src-old-index');
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toMatchObject({ action: 'created' });
      });

      it('on accept: does not touch the conflicting source if creating the replacement fails', async () => {
        const conflictingSource = { id: 'src-old-index', type: 'index' as const, name: 'wl-index' };
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-old-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-old-index']);
        mockListFn.mockResolvedValueOnce({ sources: [conflictingSource] });
        mockCreateFn.mockRejectedValueOnce(new Error('API key granting failed'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: conflictingSource.id,
        });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockDeleteFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
      });

      it('on accept: does not touch the conflicting source if linking the replacement fails', async () => {
        const conflictingSource = { id: 'src-old-index', type: 'index' as const, name: 'wl-index' };
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-old-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-old-index']);
        mockListFn.mockResolvedValueOnce({ sources: [conflictingSource] });
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new-store',
          type: 'store',
          name: 'wl-store',
          managed: false,
        });
        mockAddEntitySourceReferenceFn.mockRejectedValueOnce(new Error('link failed'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: conflictingSource.id,
        });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        // The rollback of the new (unlinked) source is expected — but the conflicting source
        // must be left untouched, since it's still the only working rule-based source.
        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockDeleteFn).toHaveBeenCalledWith('src-new-store');
        expect(mockDeleteFn).not.toHaveBeenCalledWith('src-old-index');
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
      });

      it('does not touch the other-type source on a managed watchlist', async () => {
        const conflictingSource = { id: 'src-old-index', type: 'index' as const, name: 'wl-index' };
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: true, entitySourceIds: ['src-old-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-old-index']);
        mockListFn.mockResolvedValueOnce({ sources: [conflictingSource] });
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new-store',
          type: 'store',
          name: 'wl-store',
          managed: false,
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: null,
        });

        await tool.handler({ type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' }, ctx);

        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockDeleteFn).not.toHaveBeenCalled();
        expect(mockCreateFn).toHaveBeenCalled();
      });

      it("on accept: refuses when the conflicting source's identity changed after the confirmation was shown", async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(
          buildWatchlist({ managed: false, entitySourceIds: ['src-new-index'] })
        );
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-new-index']);
        // The source approved for removal (src-old-index) is gone; a different index source now
        // occupies the conflicting slot, as if it was deleted and replaced while the confirmation
        // was open.
        mockListFn.mockResolvedValueOnce({
          sources: [{ id: 'src-new-index', type: 'index', name: 'wl-index' }],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        // What the user actually approved: removal of src-old-index specifically.
        ctx.stateManager.getState = jest.fn().mockReturnValue({
          existingSourceFingerprint: fingerprintDataSource(undefined),
          conflictingSourceId: 'src-old-index',
        });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockRemoveEntitySourceReferenceFn).not.toHaveBeenCalled();
        expect(mockCreateFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/changed after the confirmation/i);
      });
    });

    describe('HITL', () => {
      it('on unprompted: prompt names the watchlist, shows the query, and the preview', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ name: 'Privileged Users' }));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          ctx
        );

        expect(mockCreateFn).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.title).toBe('Create rule-based data source');
        expect(askArgs.message).toContain('"Privileged Users"');
        expect(askArgs.message).toContain('host.os.name: "Ubuntu*"');
        expect(askArgs.message).toContain('Matches 47 entities right now.');
      });

      it('on unprompted for an index source: prompt shows indexPattern, identifierField, range, and query', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ name: 'Departing Employees' }));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler(
          {
            type: 'index',
            watchlistId: 'wl-1',
            queryRule: 'employment.status: "Terminated"',
            indexPattern: 'hr-workday-*',
            identifierField: 'user.name',
          },
          ctx
        );

        expect(mockCreateFn).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.title).toBe('Create rule-based data source');
        expect(askArgs.message).toContain('"Departing Employees"');
        expect(askArgs.message).toContain('**Index pattern:** `hr-workday-*`');
        expect(askArgs.message).toContain('**Identifier field:** `user.name`');
        expect(askArgs.message).toContain('**Lookback range:** `now-10d to now`');
        expect(askArgs.message).toContain('**Filter query:** `employment.status: "Terminated"`');
        expect(askArgs.message).toContain('Your query matches 5 documents.');
      });

      it('on unprompted with an existing source: prompt says "Update" and shows current → new', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({
          sources: [
            {
              id: 'src-1',
              type: 'store',
              name: 'wl-store',
              managed: false,
              queryRule: 'host.os.name: "Windows*"',
            },
          ],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          ctx
        );

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.title).toBe('Update rule-based data source');
        expect(askArgs.message).toContain('host.os.name: "Windows*"');
        expect(askArgs.message).toContain('host.os.name: "Ubuntu*"');
      });

      it('on accept: creates a new store source and links it to the watchlist', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ name: 'Privileged Users' }));
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new',
          type: 'store',
          name: 'Privileged Users-store',
          queryRule: 'host.os.name: "Ubuntu*"',
          managed: false,
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(undefined) });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockCreateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'store',
            queryRule: 'host.os.name: "Ubuntu*"',
            name: 'wl-1-store',
          }),
          ctx.request
        );
        expect(mockAddEntitySourceReferenceFn).toHaveBeenCalledWith('wl-1', 'src-new');
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toMatchObject({ action: 'created', watchlistId: 'wl-1' });
      });

      it('on accept: rolls back the newly created source when linking it to the watchlist fails', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ name: 'Privileged Users' }));
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new',
          type: 'store',
          name: 'Privileged Users-store',
          queryRule: 'host.os.name: "Ubuntu*"',
          managed: false,
        });
        mockAddEntitySourceReferenceFn.mockRejectedValueOnce(new Error('version conflict'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(undefined) });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockAddEntitySourceReferenceFn).toHaveBeenCalledWith('wl-1', 'src-new');
        expect(mockDeleteFn).toHaveBeenCalledWith('src-new');
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
      });

      it('on accept with an existing source: updates instead of creating', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        const existingSource = {
          id: 'src-1',
          type: 'store' as const,
          name: 'wl-store',
          managed: false,
        };
        mockListFn.mockResolvedValueOnce({ sources: [existingSource] });
        mockUpdateFn.mockResolvedValueOnce({
          id: 'src-1',
          type: 'store',
          name: 'wl-store',
          queryRule: 'host.os.name: "Ubuntu*"',
          managed: false,
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(existingSource) });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockCreateFn).not.toHaveBeenCalled();
        expect(mockUpdateFn).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'src-1', type: 'store' }),
          ctx.request
        );
        const other = result.results[0] as OtherResult;
        expect(other.data).toMatchObject({ action: 'updated' });
      });

      it('on accept: returns a projected source summary without credentials or internal fields', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new',
          type: 'index',
          name: 'wl-index',
          queryRule: 'a: b',
          indexPattern: 'logs-*',
          identifierField: 'user.name',
          managed: false,
          apiKeyId: 'super-secret-key-id',
          apiKey: 'super-secret-key',
          matchersModifiedByUser: false,
          managedVersion: 3,
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(undefined) });

        const result = (await tool.handler(
          {
            type: 'index',
            watchlistId: 'wl-1',
            queryRule: 'a: b',
            indexPattern: 'logs-*',
            identifierField: 'user.name',
          },
          ctx
        )) as ToolHandlerStandardReturn;

        const other = result.results[0] as OtherResult;
        const source = (other.data as { source: Record<string, unknown> }).source;
        expect(source).toMatchObject({ id: 'src-new', type: 'index', hasApiKey: true });
        expect(source).not.toHaveProperty('apiKeyId');
        expect(source).not.toHaveProperty('apiKey');
        expect(source).not.toHaveProperty('managedVersion');
        expect(source).not.toHaveProperty('matchersModifiedByUser');
      });

      it('with a disabled existing source: warns it will be re-enabled, then re-enables it on accept', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        const existingSource = {
          id: 'src-1',
          type: 'store' as const,
          name: 'wl-store',
          managed: false,
          enabled: false,
          queryRule: 'host.os.name: "Windows*"',
        };
        mockListFn.mockResolvedValueOnce({ sources: [existingSource] });
        const unpromptedCtx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          unpromptedCtx
        );

        const askArgs = (unpromptedCtx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toMatch(/currently \*\*disabled\*\*.*re-enable it/i);

        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ entitySourceIds: ['src-1'] }));
        mockGetEntitySourceIdsFn.mockResolvedValueOnce(['src-1']);
        mockListFn.mockResolvedValueOnce({ sources: [existingSource] });
        mockUpdateFn.mockResolvedValueOnce({ ...existingSource, enabled: true });
        const acceptCtx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        acceptCtx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(existingSource) });

        await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'host.os.name: "Ubuntu*"' },
          acceptCtx
        );

        expect(mockUpdateFn).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'src-1', enabled: true }),
          acceptCtx.request
        );
      });

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
        // What the user actually approved: the source as it looked when prompted.
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: 'stale-fingerprint' });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockUpdateFn).not.toHaveBeenCalled();
        expect(mockCreateFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/changed after the confirmation/i);
      });

      it('on accept: refuses when the approved confirmation state is missing', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        // Simulate lost confirmation state (e.g. the interrupt/resume state was not persisted).
        ctx.stateManager.getState = jest.fn().mockReturnValue(undefined);

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockUpdateFn).not.toHaveBeenCalled();
        expect(mockCreateFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/changed after the confirmation/i);
      });

      it('on unprompted: records the approved source state for the accept pass', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' }, ctx);

        expect(ctx.stateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({ existingSourceFingerprint: expect.any(String) })
        );
      });

      it('on reject: returns an error result without creating', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockCreateFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/declined/i);
      });
    });

    describe('telemetry', () => {
      it('reports success=true and resultCount=1 after a successful create', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockCreateFn.mockResolvedValueOnce({
          id: 'src-new',
          type: 'store',
          name: 'wl-store',
          managed: false,
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        ctx.stateManager.getState = jest
          .fn()
          .mockReturnValue({ existingSourceFingerprint: fingerprintDataSource(undefined) });

        await tool.handler({ type: 'store', watchlistId: 'wl-1', queryRule: 'a: b' }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
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
