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
import { resolveSingleEntity, type ResolveSingleEntityResult } from '../entity_resolution';
import { getWatchlistToolAvailability } from './watchlist_availability';
import {
  addEntitiesToWatchlistTool,
  SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
} from './add_entities_to_watchlist_tool';
import type { UnresolvedEntityResult } from '../shared/resolve_entity_ids';

jest.mock('./watchlist_availability', () => ({
  getWatchlistToolAvailability: jest.fn(),
}));

jest.mock('../entity_resolution', () => ({
  resolveSingleEntity: jest.fn(),
}));

const mockGetWatchlistToolAvailability = getWatchlistToolAvailability as jest.Mock;
const mockResolveSingleEntity = resolveSingleEntity as jest.MockedFunction<
  typeof resolveSingleEntity
>;

const resolvedEntity = (euid: string): ResolveSingleEntityResult => ({
  status: 'resolved',
  source: 'exact_id',
  query: '',
  columns: [],
  values: [],
  identity: { identifierType: 'user', identifier: euid, entityStoreId: euid },
});

const mockExperimentalFeatures = {
  entityAnalyticsWatchlistEnabled: true,
  entityAnalyticsEntityStoreV2: true,
} as ExperimentalFeatures;

const mockGetWatchlistFn = jest.fn();
jest.mock('../../../../lib/entity_analytics/watchlists/management/watchlist_config', () => {
  const actual = jest.requireActual(
    '../../../../lib/entity_analytics/watchlists/management/watchlist_config'
  );
  return {
    ...actual,
    WatchlistConfigClient: jest.fn().mockImplementation(() => ({
      get: mockGetWatchlistFn,
    })),
  };
});

const mockAssignFn = jest.fn();
jest.mock('../../../../lib/entity_analytics/watchlists/entity_sources/manual/service', () => ({
  createManualEntityService: jest.fn().mockImplementation(() => ({
    assign: mockAssignFn,
  })),
}));

jest.mock('@kbn/entity-store/server/domain/crud', () => ({
  CRUDClient: jest.fn().mockImplementation(() => ({})),
}));

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
  description: 'Sensitive accounts',
  managed: false,
  riskModifier: 1.5,
  entitySourceIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  ...overrides,
});

const buildAssignSuccess = (euids: string[]) => ({
  successful: euids.length,
  failed: 0,
  not_found: 0,
  total: euids.length,
  items: euids.map((euid) => ({ euid, status: 'success' as const })),
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
    toolCallId: 'tool-call-add',
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

const seedResolvedState = (
  ctx: ReturnType<typeof buildHandlerContextWithPrompts>,
  resolved: string[],
  unresolved: UnresolvedEntityResult[] = []
) => {
  (ctx.stateManager.getState as jest.Mock).mockReturnValue({ resolved, unresolved });
};

describe('addEntitiesToWatchlistTool', () => {
  const mocks = createToolTestMocks();
  const tool = addEntitiesToWatchlistTool(
    mocks.mockCore,
    mocks.mockLogger,
    mockExperimentalFeatures
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
    mockResolveSingleEntity.mockReset();
    mockResolveSingleEntity.mockImplementation(async ({ entityId }) => resolvedEntity(entityId));
  });

  describe('availability', () => {
    it('is available when the AB resource check passes and both flags are on', async () => {
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
    it('accepts a single entity id', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', entityIds: ['user:a'] }).success).toBe(
        true
      );
    });

    it('accepts a list of entity ids', () => {
      expect(
        tool.schema.safeParse({
          watchlistId: 'wl-1',
          entityIds: ['user:a', 'host:b', 'service:c'],
        }).success
      ).toBe(true);
    });

    it('rejects an empty entityIds array', () => {
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', entityIds: [] }).success).toBe(false);
    });

    it('rejects an empty watchlistId', () => {
      expect(tool.schema.safeParse({ watchlistId: '', entityIds: ['user:a'] }).success).toBe(false);
    });

    it('rejects an entityIds list larger than the cap', () => {
      const overCap = Array.from({ length: 101 }, (_, i) => `user:u${i}`);
      expect(tool.schema.safeParse({ watchlistId: 'wl-1', entityIds: overCap }).success).toBe(
        false
      );
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
        { watchlistId: 'wl-1', entityIds: ['user:a'] },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockGetWatchlistFn).not.toHaveBeenCalled();
      expect(mockAssignFn).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toMatch(/permission/i);
    });

    describe('HITL', () => {
      it('on unprompted: confirmation message names the watchlist and previews entity ids', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ name: 'Privileged Users' }));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['user:alice', 'host:server01'] },
          ctx
        );

        expect(mockGetWatchlistFn).toHaveBeenCalledWith('wl-1');
        expect(mockAssignFn).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs).toMatchObject({
          id: 'watchlists.add_entities_to_watchlist.tool-call-add',
          title: 'Add entities to watchlist',
          confirm_text: 'Add',
          cancel_text: 'Cancel',
          color: 'primary',
        });
        expect(askArgs.message).toContain('"Privileged Users"');
        expect(askArgs.message).toContain('2 entities');
        expect(askArgs.message).toContain('user:alice');
        expect(askArgs.message).toContain('host:server01');
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          resolved: ['user:alice', 'host:server01'],
          unresolved: [],
        });
      });

      it('on unprompted: confirmation lists the resolved EUID, not the reference that was passed', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockResolveSingleEntity.mockResolvedValueOnce(resolvedEntity('user:jane@acme.com@okta'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['jane'] }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toContain('user:jane@acme.com@okta');
        expect(askArgs.message).toMatch(/1 entity\b/);
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          resolved: ['user:jane@acme.com@okta'],
          unresolved: [],
        });
        expect(mockAssignFn).not.toHaveBeenCalled();
      });

      it('on unprompted with a partial miss: confirms only resolved ids and counts the rest', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const unresolved: UnresolvedEntityResult[] = [
          {
            entityId: 'bob',
            status: 'ambiguous',
            matchCount: 2,
            candidateEntityIds: ['user:bob@okta', 'user:bob@entra_id'],
          },
        ];
        mockResolveSingleEntity
          .mockResolvedValueOnce(resolvedEntity('user:jane@acme.com@okta'))
          .mockResolvedValueOnce({
            status: 'ambiguous',
            source: 'rlike_name',
            query: '',
            columns: [],
            values: [],
            matchCount: 2,
            candidateEntityIds: ['user:bob@okta', 'user:bob@entra_id'],
          });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['jane', 'bob'] }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toContain('user:jane@acme.com@okta');
        expect(askArgs.message).toContain('1 entity could not be resolved and will not be added.');
        expect(askArgs.message).not.toContain('user:bob@okta');
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          resolved: ['user:jane@acme.com@okta'],
          unresolved,
        });
        expect(mockAssignFn).not.toHaveBeenCalled();
      });

      it('when nothing resolves and a reference is ambiguous: returns candidates and skips confirmation', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockResolveSingleEntity.mockResolvedValueOnce({
          status: 'ambiguous',
          source: 'rlike_name',
          query: '',
          columns: [],
          values: [],
          matchCount: 2,
          candidateEntityIds: ['user:bob@okta', 'user:bob@entra_id'],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['bob'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockAssignFn).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toMatchObject({
          message: expect.stringMatching(/pick an entity id/i),
          unresolvedReferences: [
            {
              entityId: 'bob',
              status: 'ambiguous',
              matchCount: 2,
              candidateEntityIds: ['user:bob@okta', 'user:bob@entra_id'],
            },
          ],
        });
      });

      it('when nothing resolves and nothing is ambiguous: returns an error and skips confirmation', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockResolveSingleEntity.mockResolvedValueOnce({
          status: 'not_found',
          source: 'rlike_name',
          query: '',
          columns: [],
          values: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['nobody'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockAssignFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toBe(
          'None of the given entities could be resolved to a canonical id.'
        );
        expect(error.data.metadata).toEqual({
          unresolvedReferences: [{ entityId: 'nobody', status: 'not_found' }],
        });
      });

      it('when a match has no canonical entity.id: reports no_identity and skips confirmation', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockResolveSingleEntity.mockResolvedValueOnce({
          status: 'resolved',
          source: 'exact_id',
          query: '',
          columns: [],
          values: [],
          identity: { identifierType: 'user', identifier: 'jane' },
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['jane'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.data.metadata).toEqual({
          unresolvedReferences: [{ entityId: 'jane', status: 'no_identity' }],
        });
      });

      it('on unprompted with one entity: uses singular "entity" wording', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['user:alice'] }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toMatch(/1 entity\b/);
      });

      it('on accept: assigns the resolved ids saved at confirmation, not the original references', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist({ name: 'Privileged Users' }));
        const assignResult = buildAssignSuccess(['user:jane@acme.com@okta', 'host:server01']);
        mockAssignFn.mockResolvedValueOnce(assignResult);

        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        seedResolvedState(ctx, ['user:jane@acme.com@okta', 'host:server01']);

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['jane', 'server01'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockResolveSingleEntity).not.toHaveBeenCalled();
        expect(mockAssignFn).toHaveBeenCalledWith(['user:jane@acme.com@okta', 'host:server01']);
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toMatchObject({
          watchlistId: 'wl-1',
          watchlistName: 'Privileged Users',
          ...assignResult,
        });
      });

      it('on accept: includes unresolved references stored with the confirmation', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockAssignFn.mockResolvedValueOnce(buildAssignSuccess(['user:jane@acme.com@okta']));
        const unresolved: UnresolvedEntityResult[] = [{ entityId: 'nobody', status: 'not_found' }];
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        seedResolvedState(ctx, ['user:jane@acme.com@okta'], unresolved);

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['jane', 'nobody'] },
          ctx
        )) as ToolHandlerStandardReturn;

        const other = result.results[0] as OtherResult;
        expect(other.data).toMatchObject({ unresolvedReferences: unresolved });
      });

      it('on accept without saved resolution state: returns an error and does not assign', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['user:alice'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockAssignFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/state not found/i);
      });

      it('on reject: returns an error result without calling assign', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { watchlistId: 'wl-1', entityIds: ['user:alice'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockAssignFn).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/declined/i);
      });
    });

    it('returns an error result when the watchlist fetch throws', async () => {
      mockGetWatchlistFn.mockRejectedValueOnce(
        new Error("Watchlist config 'wl-missing' not found")
      );
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.unprompted,
      });

      const result = (await tool.handler(
        { watchlistId: 'wl-missing', entityIds: ['user:a'] },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('not found');
    });

    it('returns an error result when the assign service throws after accept', async () => {
      mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
      mockAssignFn.mockRejectedValueOnce(new Error('boom'));
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.accepted,
      });
      seedResolvedState(ctx, ['user:a']);

      const result = (await tool.handler(
        { watchlistId: 'wl-1', entityIds: ['user:a'] },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('boom');
    });

    describe('telemetry', () => {
      it('does not report telemetry while only asking for confirmation', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['user:a'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).not.toHaveBeenCalled();
      });

      it('reports resultCount matching service.successful after a successful assign', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockAssignFn.mockResolvedValueOnce(buildAssignSuccess(['user:a', 'user:b']));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        seedResolvedState(ctx, ['user:a', 'user:b']);

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['user:a', 'user:b'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: true,
            resultCount: 2,
            errorMessage: undefined,
            userConfirmationOutcome: ConfirmationStatus.accepted,
          }
        );
      });

      it('reports userConfirmationOutcome=rejected when the user declines the prompt', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['user:a'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: true,
            resultCount: 0,
            errorMessage: undefined,
            userConfirmationOutcome: ConfirmationStatus.rejected,
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

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['user:a'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: false,
            resultCount: 0,
            errorMessage:
              'You do not have permission to modify watchlist membership in this space.',
            userConfirmationOutcome: undefined,
          }
        );
      });

      it('reports success=false and errorMessage when the assign call throws', async () => {
        mockGetWatchlistFn.mockResolvedValueOnce(buildWatchlist());
        mockAssignFn.mockRejectedValueOnce(new Error('boom'));
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });
        seedResolvedState(ctx, ['user:a']);

        await tool.handler({ watchlistId: 'wl-1', entityIds: ['user:a'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          {
            toolId: SECURITY_ADD_ENTITIES_TO_WATCHLIST_TOOL_ID,
            actionType: 'mutation',
            spaceId: 'default',
            success: false,
            resultCount: 0,
            errorMessage: 'boom',
            userConfirmationOutcome: ConfirmationStatus.accepted,
          }
        );
      });
    });
  });
});
