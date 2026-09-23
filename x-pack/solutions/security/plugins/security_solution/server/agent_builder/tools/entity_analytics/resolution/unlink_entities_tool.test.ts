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
import { resolveEntityIdsForResolution } from './resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';
import { unlinkEntitiesTool, SECURITY_UNLINK_ENTITIES_TOOL_ID } from './unlink_entities_tool';

jest.mock('./resolve_entity_ids', () => ({
  resolveEntityIdsForResolution: jest.fn(),
}));

jest.mock('./resolution_availability', () => ({
  getResolutionToolAvailability: jest.fn(),
}));

const mockResolveEntityIdsForResolution = resolveEntityIdsForResolution as jest.Mock;
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
  ctx.callContext = { ...ctx.callContext, toolCallId: 'tool-call-unlink' };
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

const seedApprovedUnlink = (
  ctx: ReturnType<typeof buildHandlerContextWithPrompts>,
  state: {
    euids: string[];
    unresolved: Array<{ entityId: string; status: string }>;
  } = {
    euids: ['host:server2'],
    unresolved: [],
  }
) => {
  (ctx.stateManager.getState as jest.Mock).mockReturnValue(state);
  return ctx;
};

describe('unlinkEntitiesTool', () => {
  const mocks = createToolTestMocks();
  const tool = unlinkEntitiesTool(mocks.mockCore, mocks.mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  const mockUnlinkEntities = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mocks.mockCore, mocks.mockEsClient);
    mocks.mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: {
          createResolutionClient: jest.fn().mockReturnValue({ unlinkEntities: mockUnlinkEntities }),
        },
        security: mocks.mockSecurityStart,
      },
      {},
    ]);
    mockGetResolutionToolAvailability.mockResolvedValue({ status: 'available' });
    mockResolveEntityIdsForResolution.mockResolvedValue({
      euids: ['host:server2'],
      unresolved: [],
    });
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
    it('accepts a valid payload', () => {
      expect(tool.schema.safeParse({ entityIds: ['host:server2'] }).success).toBe(true);
    });

    it('rejects an empty entityIds array', () => {
      expect(tool.schema.safeParse({ entityIds: [] }).success).toBe(false);
    });
  });

  describe('handler', () => {
    describe('HITL', () => {
      it('on unprompted: confirmation message previews the resolved entity ids', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: ['server2'] }, ctx);

        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs).toMatchObject({
          id: 'resolution.unlink_entities.tool-call-unlink',
          title: 'Unlink entities',
          confirm_text: 'Unlink',
          cancel_text: 'Cancel',
        });
        expect(askArgs.message).toContain('host:server2');
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          euids: ['host:server2'],
          unresolved: [],
        });
      });

      it('on accept: unlinks the saved ids and does not look the names up again', async () => {
        mockUnlinkEntities.mockResolvedValueOnce({
          entity_type: 'host',
          unlinked: ['host:server2'],
          skipped: [],
        });
        const ctx = seedApprovedUnlink(
          buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.accepted,
          })
        );

        const result = (await tool.handler(
          { entityIds: ['server2'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockResolveEntityIdsForResolution).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).toHaveBeenCalledWith(['host:server2'], {
          awaitVisibility: true,
        });
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toEqual({
          entityType: 'host',
          unlinked: ['host:server2'],
          skipped: [],
        });
      });

      it('on reject: returns an error result without unlinking', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { entityIds: ['server2'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/declined/i);
        expect(mockResolveEntityIdsForResolution).not.toHaveBeenCalled();
      });

      it('on accept without saved ids: does not unlink', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        const result = (await tool.handler(
          { entityIds: ['server2'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        expect(mockResolveEntityIdsForResolution).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toBe('Resolved entities state not found.');
      });
    });

    it('unlinks only the resolved euids, surfacing the rest as unresolved', async () => {
      mockUnlinkEntities.mockResolvedValueOnce({
        entity_type: 'host',
        unlinked: ['host:server2'],
        skipped: [],
      });
      const ctx = seedApprovedUnlink(
        buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        }),
        {
          euids: ['host:server2'],
          unresolved: [{ entityId: 'ghost-entity', status: 'not_found' }],
        }
      );

      const result = (await tool.handler(
        { entityIds: ['server2', 'ghost-entity'] },
        ctx
      )) as ToolHandlerStandardReturn;

      // The unresolved reference must never reach the resolution client — it would
      // otherwise fail EntitiesNotFoundError validation for the whole batch.
      expect(mockUnlinkEntities).toHaveBeenCalledWith(['host:server2'], {
        awaitVisibility: true,
      });
      const other = result.results[0] as OtherResult;
      expect(other.data.unlinked).toEqual(['host:server2']);
      expect(other.data.unresolvedReferences).toEqual([
        { entityId: 'ghost-entity', status: 'not_found' },
      ]);
    });

    it('when nothing resolves: returns an error with unresolved references, without prompting or calling the client', async () => {
      mockResolveEntityIdsForResolution.mockResolvedValueOnce({
        euids: [],
        unresolved: [{ entityId: 'ghost-entity', status: 'not_found' }],
      });
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.unprompted,
      });

      const result = (await tool.handler(
        { entityIds: ['ghost-entity'] },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockUnlinkEntities).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.metadata).toEqual({
        unresolvedReferences: [{ entityId: 'ghost-entity', status: 'not_found' }],
      });
    });

    it('when a reference is ambiguous: returns the candidates without prompting or unlinking', async () => {
      mockResolveEntityIdsForResolution.mockResolvedValueOnce({
        euids: [],
        unresolved: [
          {
            entityId: 'server',
            status: 'ambiguous',
            matchCount: 2,
            candidateEntityIds: ['host:server1', 'host:server10'],
          },
        ],
      });
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.unprompted,
      });

      const result = (await tool.handler(
        { entityIds: ['server'] },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(mockUnlinkEntities).not.toHaveBeenCalled();
      const other = result.results[0] as OtherResult;
      expect(other.type).toBe(ToolResultType.other);
      expect(other.data.unresolvedReferences).toEqual([
        {
          entityId: 'server',
          status: 'ambiguous',
          matchCount: 2,
          candidateEntityIds: ['host:server1', 'host:server10'],
        },
      ]);
    });

    it('returns an error result when the user lacks permission to unlink entities', async () => {
      mocks.mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.accepted,
      });

      const result = (await tool.handler(
        { entityIds: ['server2'] },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockUnlinkEntities).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('permission');
    });

    it('returns an error result when the resolution client rejects', async () => {
      mockUnlinkEntities.mockRejectedValueOnce(new Error('boom'));
      const ctx = seedApprovedUnlink(
        buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        })
      );

      const result = (await tool.handler(
        { entityIds: ['server2'] },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('boom');
    });

    describe('telemetry', () => {
      it('does not report telemetry while only asking for confirmation', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: ['server2'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).not.toHaveBeenCalled();
      });

      it('reports success=true after a successful unlink', async () => {
        mockUnlinkEntities.mockResolvedValueOnce({
          entity_type: 'host',
          unlinked: ['host:server2'],
          skipped: [],
        });
        const ctx = seedApprovedUnlink(
          buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.accepted,
          })
        );

        await tool.handler({ entityIds: ['server2'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          expect.objectContaining({
            toolId: SECURITY_UNLINK_ENTITIES_TOOL_ID,
            actionType: 'mutation',
            success: true,
          })
        );
      });
    });
  });
});
