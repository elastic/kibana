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
import { requireResolvedEntity } from '../entity_resolution';
import { resolveEntityIdsForResolution } from './resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';
import { unlinkEntitiesTool, SECURITY_UNLINK_ENTITIES_TOOL_ID } from './unlink_entities_tool';

jest.mock('../entity_resolution', () => ({
  requireResolvedEntity: jest.fn(),
}));

jest.mock('./resolve_entity_ids', () => ({
  resolveEntityIdsForResolution: jest.fn(),
}));

jest.mock('./resolution_availability', () => ({
  getResolutionToolAvailability: jest.fn(),
}));

const mockRequireResolvedEntity = requireResolvedEntity as jest.Mock;
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
    resolved: Array<{ euid: string; resolvedTo?: string }>;
    unresolved: Array<{ entityId: string; status: string }>;
    nonAliases?: Array<Record<string, unknown>>;
  } = {
    resolved: [{ euid: 'host:server2', resolvedTo: 'host:server1' }],
    unresolved: [],
  }
) => {
  (ctx.stateManager.getState as jest.Mock).mockReturnValue({ nonAliases: [], ...state });
  return ctx;
};

describe('unlinkEntitiesTool', () => {
  const mocks = createToolTestMocks();
  const tool = unlinkEntitiesTool(mocks.mockCore, mocks.mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  const mockUnlinkEntities = jest.fn();
  const mockFindEntitiesWithAliases = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mocks.mockCore, mocks.mockEsClient);
    mocks.mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: {
          createResolutionClient: jest.fn().mockReturnValue({
            unlinkEntities: mockUnlinkEntities,
            findEntitiesWithAliases: mockFindEntitiesWithAliases,
          }),
        },
        security: mocks.mockSecurityStart,
      },
      {},
    ]);
    mockGetResolutionToolAvailability.mockResolvedValue({ status: 'available' });
    mockFindEntitiesWithAliases.mockResolvedValue(new Map());
    mockResolveEntityIdsForResolution.mockResolvedValue({
      resolved: [{ euid: 'host:server2', resolvedTo: 'host:server1' }],
      unresolved: [],
    });
    mockRequireResolvedEntity.mockResolvedValue({
      ok: true,
      identity: { identifierType: 'host', identifier: 'server1', entityStoreId: 'host:server1' },
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

    it('accepts a payload naming the group to unlink from', () => {
      expect(
        tool.schema.safeParse({
          entityIds: ['bob.temp', 'bob.old'],
          groupEntityId: 'bob.admin',
        }).success
      ).toBe(true);
    });

    it('rejects an empty entityIds array', () => {
      expect(tool.schema.safeParse({ entityIds: [] }).success).toBe(false);
    });
  });

  describe('handler', () => {
    describe('HITL', () => {
      it('on unprompted: confirmation message names the group each entity is linked to', async () => {
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
        expect(askArgs.message).toBe(
          [
            'Unlink 1 entity from its resolution group?',
            '',
            '- `host:server2` — currently linked to `host:server1`',
          ].join('\n')
        );
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          resolved: [{ euid: 'host:server2', resolvedTo: 'host:server1' }],
          unresolved: [],
          nonAliases: [],
        });
        expect(mockFindEntitiesWithAliases).not.toHaveBeenCalled();
      });

      it('on unprompted: lists entities that are not aliases separately as skipped', async () => {
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [
            { euid: 'host:server2', resolvedTo: 'host:server1' },
            { euid: 'host:server3' },
          ],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: ['server2', 'server3'] }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toBe(
          [
            'Unlink 1 entity from its resolution group?',
            '',
            '- `host:server2` — currently linked to `host:server1`',
            '',
            '1 entity will be skipped:',
            '',
            '- 1 entity is not part of any resolution group',
          ].join('\n')
        );
      });

      it('on unprompted: truncates the confirmation list beyond the preview cap', async () => {
        const resolved = Array.from({ length: 12 }, (_, i) => ({
          euid: `user:u${i}`,
          resolvedTo: 'user:target',
        }));
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved,
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: resolved.map((entity) => entity.euid) }, ctx);

        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        const lines = askArgs.message.split('\n');
        expect(lines[0]).toBe('Unlink 12 entities from their resolution groups?');
        expect(lines[2]).toBe('- `user:u0` — currently linked to `user:target`');
        expect(lines[11]).toBe('- `user:u9` — currently linked to `user:target`');
        expect(lines[12]).toBe('- … and 2 more');
        expect(askArgs.message).not.toContain('user:u10');
      });

      it('on unprompted: does not ask for confirmation when no entity is linked to anything', async () => {
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [{ euid: 'host:server2' }, { euid: 'host:server3' }],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['server2', 'server3'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toEqual({
          message: expect.stringContaining('nothing to unlink'),
          unlinked: [],
          skipped: ['host:server2', 'host:server3'],
          nonAliases: [
            { euid: 'host:server2', kind: 'standalone' },
            { euid: 'host:server3', kind: 'standalone' },
          ],
        });
        expect(mockFindEntitiesWithAliases).toHaveBeenCalledWith(['host:server2', 'host:server3']);
      });

      describe('group targets', () => {
        const targetWithAliases = new Map([['user:head', ['user:alias.one', 'user:alias.two']]]);

        it('reports a group target with its aliases instead of saying it is not linked', async () => {
          mockResolveEntityIdsForResolution.mockResolvedValueOnce({
            resolved: [{ euid: 'user:head' }],
            unresolved: [],
          });
          mockFindEntitiesWithAliases.mockResolvedValueOnce(targetWithAliases);
          const ctx = buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.unprompted,
          });

          const result = (await tool.handler(
            { entityIds: ['head'] },
            ctx
          )) as ToolHandlerStandardReturn;

          expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
          const other = result.results[0] as OtherResult;
          expect(other.data.nonAliases).toEqual([
            {
              euid: 'user:head',
              kind: 'group_target',
              aliases: ['user:alias.one', 'user:alias.two'],
            },
          ]);
          expect(other.data.message).toContain('offer to unlink some of its listed `aliases`');
        });

        it('on unprompted: marks a group target in the confirmation and saves it in state', async () => {
          mockResolveEntityIdsForResolution.mockResolvedValueOnce({
            resolved: [{ euid: 'user:alias.one', resolvedTo: 'user:head' }, { euid: 'user:head' }],
            unresolved: [],
          });
          mockFindEntitiesWithAliases.mockResolvedValueOnce(targetWithAliases);
          const ctx = buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.unprompted,
          });

          await tool.handler({ entityIds: ['alias.one', 'head'] }, ctx);

          const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
          expect(askArgs.message).toBe(
            [
              'Unlink 1 entity from its resolution group?',
              '',
              '- `user:alias.one` — currently linked to `user:head`',
              '',
              '1 entity will be skipped:',
              '',
              '- 1 entity is a group primary',
            ].join('\n')
          );
          expect(ctx.stateManager.setState).toHaveBeenCalledWith(
            expect.objectContaining({
              nonAliases: [expect.objectContaining({ euid: 'user:head', kind: 'group_target' })],
            })
          );
        });

        it('on unprompted: counts group primaries and standalone entities separately', async () => {
          mockResolveEntityIdsForResolution.mockResolvedValueOnce({
            resolved: [
              { euid: 'user:alias.one', resolvedTo: 'user:head' },
              { euid: 'user:head' },
              { euid: 'user:head.two' },
              { euid: 'user:solo' },
            ],
            unresolved: [],
          });
          mockFindEntitiesWithAliases.mockResolvedValueOnce(
            new Map([
              ['user:head', ['user:alias.one']],
              ['user:head.two', ['user:alias.two']],
            ])
          );
          const ctx = buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.unprompted,
          });

          await tool.handler({ entityIds: ['alias.one', 'head', 'head.two', 'solo'] }, ctx);

          const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
          expect(askArgs.message).toContain(
            [
              '3 entities will be skipped:',
              '',
              '- 2 entities are group primaries',
              '- 1 entity is not part of any resolution group',
            ].join('\n')
          );
        });

        it('on accept: reports why the skipped entity was not unlinked', async () => {
          mockUnlinkEntities.mockResolvedValueOnce({
            entity_type: 'user',
            unlinked: ['user:alias.one'],
            skipped: ['user:head'],
          });
          const groupTarget = {
            euid: 'user:head',
            kind: 'group_target',
            aliases: ['user:alias.one', 'user:alias.two'],
          };
          const ctx = seedApprovedUnlink(
            buildHandlerContextWithPrompts(mocks, { checkStatus: ConfirmationStatus.accepted }),
            {
              resolved: [
                { euid: 'user:alias.one', resolvedTo: 'user:head' },
                { euid: 'user:head' },
              ],
              unresolved: [],
              nonAliases: [groupTarget],
            }
          );

          const result = (await tool.handler(
            { entityIds: ['alias.one', 'head'] },
            ctx
          )) as ToolHandlerStandardReturn;

          const other = result.results[0] as OtherResult;
          expect(other.data.skipped).toEqual(['user:head']);
          expect(other.data.nonAliases).toEqual([groupTarget]);
        });

        it('with groupEntityId: reports a group target mismatch with its aliases', async () => {
          mockRequireResolvedEntity.mockResolvedValueOnce({
            ok: true,
            identity: {
              identifierType: 'user',
              identifier: 'bob.admin',
              entityStoreId: 'user:bob.admin',
            },
          });
          mockResolveEntityIdsForResolution.mockResolvedValueOnce({
            resolved: [
              { euid: 'user:bob.temp', resolvedTo: 'user:bob.admin' },
              { euid: 'user:head' },
            ],
            unresolved: [],
          });
          mockFindEntitiesWithAliases.mockResolvedValueOnce(targetWithAliases);
          const ctx = buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.unprompted,
          });

          const result = (await tool.handler(
            { entityIds: ['bob.temp', 'head'], groupEntityId: 'bob.admin' },
            ctx
          )) as ToolHandlerStandardReturn;

          expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
          const other = result.results[0] as OtherResult;
          expect(other.data.groupMismatches).toEqual([
            {
              euid: 'user:head',
              reason: 'group_target',
              aliases: ['user:alias.one', 'user:alias.two'],
            },
          ]);
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

    describe('groupEntityId', () => {
      const seedNamedGroup = (identity: { entityStoreId: string; resolvedTo?: string }) => {
        mockRequireResolvedEntity.mockResolvedValueOnce({
          ok: true,
          identity: { identifierType: 'user', identifier: 'bob.admin', ...identity },
        });
      };

      it('prompts as usual when the named entity is the group target', async () => {
        seedNamedGroup({ entityStoreId: 'user:bob.admin' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [{ euid: 'user:bob.temp', resolvedTo: 'user:bob.admin' }],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: ['bob.temp'], groupEntityId: 'bob.admin' }, ctx);

        expect(ctx.prompts.askForConfirmation).toHaveBeenCalled();
      });

      it('prompts as usual when the named entity is a sibling alias in the same group', async () => {
        // The named entity is itself an alias, so it normalizes to its own target.
        seedNamedGroup({ entityStoreId: 'user:bob.admin', resolvedTo: 'user:bob.real' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [{ euid: 'user:bob.temp', resolvedTo: 'user:bob.real' }],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: ['bob.temp'], groupEntityId: 'bob.admin' }, ctx);

        expect(ctx.prompts.askForConfirmation).toHaveBeenCalled();
      });

      it('reports the actual group without prompting when an entity is in a different group', async () => {
        seedNamedGroup({ entityStoreId: 'user:bob.admin' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [{ euid: 'user:bob.temp', resolvedTo: 'user:bob.other' }],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['bob.temp'], groupEntityId: 'bob.admin' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data.message).toContain('user:bob.admin');
        expect(other.data.groupMismatches).toEqual([
          { euid: 'user:bob.temp', resolvedTo: 'user:bob.other', reason: 'different_group' },
        ]);
      });

      it('reports an unlinked entity alongside one in a different group, tagged by reason', async () => {
        seedNamedGroup({ entityStoreId: 'user:bob.admin' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:bob.temp', resolvedTo: 'user:bob.other' },
            { euid: 'user:bob.solo' },
          ],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['bob.temp', 'bob.solo'], groupEntityId: 'bob.admin' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.groupMismatches).toEqual([
          { euid: 'user:bob.temp', resolvedTo: 'user:bob.other', reason: 'different_group' },
          { euid: 'user:bob.solo', reason: 'standalone' },
        ]);
      });

      it('falls back to the no-op report when no entity in the batch is linked to anything', async () => {
        seedNamedGroup({ entityStoreId: 'user:bob.admin' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [{ euid: 'user:bob.solo' }, { euid: 'user:bob.other.solo' }],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['bob.solo', 'bob.other.solo'], groupEntityId: 'bob.admin' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.groupMismatches).toBeUndefined();
        expect(other.data.skipped).toEqual(['user:bob.solo', 'user:bob.other.solo']);
      });

      it('reports an entity that is not an alias even when every other entity matches', async () => {
        seedNamedGroup({ entityStoreId: 'user:bob.admin' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:bob.temp', resolvedTo: 'user:bob.admin' },
            { euid: 'user:bob.solo' },
          ],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['bob.temp', 'bob.solo'], groupEntityId: 'bob.admin' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.groupMismatches).toEqual([
          { euid: 'user:bob.solo', reason: 'standalone' },
        ]);
      });

      it('rejects the whole batch when at least one entity is in a different group', async () => {
        seedNamedGroup({ entityStoreId: 'user:bob.admin' });
        mockResolveEntityIdsForResolution.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:bob.temp', resolvedTo: 'user:bob.admin' },
            { euid: 'user:bob.old', resolvedTo: 'user:bob.other' },
          ],
          unresolved: [],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['bob.temp', 'bob.old'], groupEntityId: 'bob.admin' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.groupMismatches).toEqual([
          { euid: 'user:bob.old', resolvedTo: 'user:bob.other', reason: 'different_group' },
        ]);
      });

      it('returns the resolution failure when the named group cannot be resolved', async () => {
        mockRequireResolvedEntity.mockResolvedValueOnce({
          ok: false,
          result: {
            tool_result_id: 'result-1',
            type: ToolResultType.error,
            data: { message: 'No entity found for id: ghost-group' },
          },
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { entityIds: ['bob.temp'], groupEntityId: 'ghost-group' },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockUnlinkEntities).not.toHaveBeenCalled();
        expect(mockResolveEntityIdsForResolution).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.data.message).toContain('ghost-group');
      });

      it('does not resolve a group when none was supplied', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ entityIds: ['server2'] }, ctx);

        expect(mockRequireResolvedEntity).not.toHaveBeenCalled();
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
          resolved: [{ euid: 'host:server2', resolvedTo: 'host:server1' }],
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
        resolved: [],
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
        resolved: [],
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
