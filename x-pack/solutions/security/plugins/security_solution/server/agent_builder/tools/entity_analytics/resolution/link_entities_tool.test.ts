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
import { SelfLinkError } from '@kbn/entity-store/server/domain/errors';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ExperimentalFeatures } from '../../../../../common';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../../lib/telemetry/event_based/events';
import { requireResolvedEntity } from '../entity_resolution';
import { resolveEntityIds } from '../shared/resolve_entity_ids';
import { getResolutionToolAvailability } from './resolution_availability';
import { linkEntitiesTool, SECURITY_LINK_ENTITIES_TOOL_ID } from './link_entities_tool';

jest.mock('../entity_resolution', () => ({
  requireResolvedEntity: jest.fn(),
}));

jest.mock('../shared/resolve_entity_ids', () => ({
  resolveEntityIds: jest.fn(),
}));

jest.mock('./resolution_availability', () => ({
  getResolutionToolAvailability: jest.fn(),
}));

const mockRequireResolvedEntity = requireResolvedEntity as jest.Mock;
const mockResolveEntityIds = resolveEntityIds as jest.Mock;
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
  ctx.callContext = { ...ctx.callContext, toolCallId: 'tool-call-link' };
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

const seedApprovedLink = (
  ctx: ReturnType<typeof buildHandlerContextWithPrompts>,
  state: {
    targetEuid: string;
    targetSelection?: 'user' | 'suggested';
    targetSelectionReason?: string;
    targetNamespace?: string;
    resolved: string[];
    unresolved: Array<{ entityId: string; status: string }>;
  } = {
    targetEuid: 'host:server1',
    resolved: ['host:server2'],
    unresolved: [],
  }
) => {
  (ctx.stateManager.getState as jest.Mock).mockReturnValue({
    targetSelection: 'user',
    ...state,
  });
  return ctx;
};

describe('linkEntitiesTool', () => {
  const mocks = createToolTestMocks();
  const tool = linkEntitiesTool(mocks.mockCore, mocks.mockLogger, mockExperimentalFeatures);
  let mockCoreStart: ReturnType<typeof coreMock.createStart>;
  const mockLinkEntities = jest.fn();
  const mockFindEntitiesWithAliases = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart = setupMockCoreStartServices(mocks.mockCore, mocks.mockEsClient);
    mocks.mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        entityStore: {
          createResolutionClient: jest.fn().mockReturnValue({
            linkEntities: mockLinkEntities,
            findEntitiesWithAliases: mockFindEntitiesWithAliases,
          }),
        },
        security: mocks.mockSecurityStart,
      },
      {},
    ]);
    mockGetResolutionToolAvailability.mockResolvedValue({ status: 'available' });
    mockFindEntitiesWithAliases.mockResolvedValue(new Map());
    mockRequireResolvedEntity.mockResolvedValue({
      ok: true,
      identity: { identifierType: 'host', identifier: 'server1', entityStoreId: 'host:server1' },
    });
    mockResolveEntityIds.mockResolvedValue({
      resolved: [{ euid: 'host:server2' }],
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
    it('accepts a payload without a target', () => {
      expect(tool.schema.safeParse({ entityIds: ['host:server1', 'host:server2'] }).success).toBe(
        true
      );
    });

    it('accepts a valid payload', () => {
      expect(
        tool.schema.safeParse({ targetId: 'host:server1', entityIds: ['host:server2'] }).success
      ).toBe(true);
    });

    it('rejects an empty entityIds array', () => {
      expect(tool.schema.safeParse({ targetId: 'host:server1', entityIds: [] }).success).toBe(
        false
      );
    });

    it('rejects more than 100 entityIds', () => {
      const entityIds = Array.from({ length: 101 }, (_, i) => `host:server${i}`);
      expect(tool.schema.safeParse({ targetId: 'host:server1', entityIds }).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns the not-resolved results as-is when the target cannot be resolved', async () => {
      const notFoundResult = {
        tool_result_id: 'x',
        type: ToolResultType.error,
        data: { message: 'No entity found' },
      };
      mockRequireResolvedEntity.mockResolvedValueOnce({ ok: false, result: notFoundResult });

      const result = (await tool.handler(
        { targetId: 'ghost', entityIds: ['host:server2'] },
        buildHandlerContextWithPrompts(mocks)
      )) as ToolHandlerStandardReturn;

      expect(mockLinkEntities).not.toHaveBeenCalled();
      expect(result.results).toEqual([notFoundResult]);
    });

    describe('suggested target', () => {
      const unpromptedCtx = () =>
        buildHandlerContextWithPrompts(mocks, { checkStatus: ConfirmationStatus.unprompted });

      it('proposes the identity-provider entity when no target is given', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:jsmith.local', namespace: 'local' },
            { euid: 'user:jsmith@okta', namespace: 'okta' },
            { euid: 'user:jsmith@entra', namespace: 'entra_id' },
          ],
          unresolved: [],
        });
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: ['jsmith.local', 'jsmith@okta', 'jsmith@entra'] }, ctx);

        expect(mockRequireResolvedEntity).not.toHaveBeenCalled();
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'user:jsmith@okta',
          targetSelection: 'suggested',
          targetSelectionReason: 'namespace_priority',
          targetNamespace: 'okta',
          resolved: ['user:jsmith.local', 'user:jsmith@entra'],
          unresolved: [],
        });
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs.message).toContain('Link 2 entities to `user:jsmith@okta` as aliases?');
      });

      it.each([
        [
          'active_directory over okta and entra_id',
          [
            { euid: 'user:a@entra', namespace: 'entra_id' },
            { euid: 'user:a@okta', namespace: 'okta' },
            { euid: 'user:a@ad', namespace: 'active_directory' },
          ],
          'user:a@ad',
        ],
        [
          'okta over entra_id and local',
          [
            { euid: 'user:a.local', namespace: 'local' },
            { euid: 'user:a@entra', namespace: 'entra_id' },
            { euid: 'user:a@okta', namespace: 'okta' },
          ],
          'user:a@okta',
        ],
        [
          'the alphabetically first id when no identity provider is involved',
          [
            { euid: 'user:b', namespace: 'local' },
            { euid: 'user:a', namespace: 'local' },
          ],
          'user:a',
        ],
        [
          'an identity provider over an entity without a namespace',
          [{ euid: 'user:a' }, { euid: 'user:b@okta', namespace: 'okta' }],
          'user:b@okta',
        ],
        [
          'a non-alias, even when an alias comes from a higher-priority namespace',
          [
            { euid: 'user:a@ad', namespace: 'active_directory', resolvedTo: 'user:x' },
            { euid: 'user:a.local', namespace: 'local' },
            { euid: 'user:b.local', namespace: 'local' },
          ],
          'user:a.local',
        ],
      ])('proposes %s', async (_label, resolved, expectedTarget) => {
        mockResolveEntityIds.mockResolvedValueOnce({ resolved, unresolved: [] });
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: resolved.map(({ euid }) => euid) }, ctx);

        expect(ctx.stateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({ targetEuid: expectedTarget, targetSelection: 'suggested' })
        );
      });

      it('asks for a target when only one entity is not already an alias', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:a', namespace: 'okta' },
            { euid: 'user:b', namespace: 'okta', resolvedTo: 'user:x' },
          ],
          unresolved: [],
        });
        const ctx = unpromptedCtx();

        const result = (await tool.handler(
          { entityIds: ['a', 'b'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect((result.results[0] as OtherResult).data.message).toContain(
          'Ask the user which entity should be the target'
        );
      });

      it('asks for a target instead of prompting when only one entity is linkable', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:jsmith@okta', namespace: 'okta' }],
          unresolved: [{ entityId: 'ghost', status: 'not_found' }],
        });
        const ctx = unpromptedCtx();

        const result = (await tool.handler(
          { entityIds: ['jsmith@okta', 'ghost'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(ctx.stateManager.setState).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data.message).toContain('Ask the user which entity should be the target');
        expect(other.data.unresolvedReferences).toEqual([
          { entityId: 'ghost', status: 'not_found' },
        ]);
      });

      it('proposes the entity that already heads a group over a higher-priority namespace', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:jsmith.contractor', namespace: 'okta' },
            { euid: 'user:jsmith123', namespace: 'local' },
          ],
          unresolved: [],
        });
        mockFindEntitiesWithAliases.mockResolvedValueOnce(
          new Map([['user:jsmith123', ['user:jsmith.old']]])
        );
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: ['jsmith.contractor', 'jsmith123'] }, ctx);

        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'user:jsmith123',
          targetSelection: 'suggested',
          targetSelectionReason: 'existing_group_target',
          resolved: ['user:jsmith.contractor'],
          unresolved: [],
        });
      });

      it('asks for a target when more than one entity already heads a group', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:a', namespace: 'okta' }, { euid: 'user:b' }],
          unresolved: [],
        });
        mockFindEntitiesWithAliases.mockResolvedValueOnce(
          new Map([
            ['user:a', ['user:a.old']],
            ['user:b', ['user:b.old']],
          ])
        );
        const ctx = unpromptedCtx();

        const result = (await tool.handler(
          { entityIds: ['a', 'b'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(ctx.stateManager.setState).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.message).toContain('more than one of the entities already heads');
        expect(other.data.groupTargets).toEqual(['user:a', 'user:b']);
      });

      it('reports alphabetical when every candidate shares the winning namespace', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:008-era@okta', namespace: 'okta' },
            { euid: 'user:005-grace@okta', namespace: 'okta' },
          ],
          unresolved: [],
        });
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: ['008-era@okta', '005-grace@okta'] }, ctx);

        // The namespace distinguished nothing here: both are okta and the alphabetical
        // tiebreaker picked the target, so the tool must not claim a namespace win.
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'user:005-grace@okta',
          targetSelection: 'suggested',
          targetSelectionReason: 'alphabetical',
          resolved: ['user:008-era@okta'],
          unresolved: [],
        });
      });

      it('reports alphabetical when no candidate comes from an identity provider', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:b', namespace: 'local' }, { euid: 'user:a' }],
          unresolved: [],
        });
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: ['b', 'a'] }, ctx);

        // `local` is not a prioritised namespace, so it cannot explain the pick either.
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'user:a',
          targetSelection: 'suggested',
          targetSelectionReason: 'alphabetical',
          resolved: ['user:b'],
          unresolved: [],
        });
      });

      it('reports namespace_priority when the namespace distinguished the target', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:a.local', namespace: 'local' },
            { euid: 'user:b@okta', namespace: 'okta' },
          ],
          unresolved: [],
        });
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: ['a.local', 'b@okta'] }, ctx);

        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'user:b@okta',
          targetSelection: 'suggested',
          targetSelectionReason: 'namespace_priority',
          targetNamespace: 'okta',
          resolved: ['user:a.local'],
          unresolved: [],
        });
      });

      it('only looks up group heads among entities that are not already aliases', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [
            { euid: 'user:a' },
            { euid: 'user:b' },
            { euid: 'user:c', resolvedTo: 'user:x' },
          ],
          unresolved: [],
        });
        const ctx = unpromptedCtx();

        await tool.handler({ entityIds: ['a', 'b', 'c'] }, ctx);

        expect(mockFindEntitiesWithAliases).toHaveBeenCalledWith(['user:a', 'user:b']);
      });

      it('on accept: reports that the target was suggested', async () => {
        mockLinkEntities.mockResolvedValueOnce({
          target_id: 'user:jsmith@okta',
          entity_type: 'user',
          linked: ['user:jsmith.local'],
          skipped: [],
        });
        const ctx = seedApprovedLink(
          buildHandlerContextWithPrompts(mocks, { checkStatus: ConfirmationStatus.accepted }),
          {
            targetEuid: 'user:jsmith@okta',
            targetSelection: 'suggested',
            targetSelectionReason: 'existing_group_target',
            resolved: ['user:jsmith.local'],
            unresolved: [],
          }
        );

        const result = (await tool.handler(
          { entityIds: ['jsmith.local', 'jsmith@okta'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockLinkEntities).toHaveBeenCalledWith('user:jsmith@okta', ['user:jsmith.local'], {
          awaitVisibility: true,
        });
        expect((result.results[0] as OtherResult).data.targetSelection).toBe('suggested');
        expect((result.results[0] as OtherResult).data.targetSelectionReason).toBe(
          'existing_group_target'
        );
      });
    });

    describe('entities that already head a group', () => {
      const unpromptedCtx = () =>
        buildHandlerContextWithPrompts(mocks, { checkStatus: ConfirmationStatus.unprompted });

      it('refuses before confirming when a named target would absorb a group head', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:jsmith123' }],
          unresolved: [],
        });
        mockRequireResolvedEntity.mockResolvedValueOnce({
          ok: true,
          identity: {
            identifierType: 'user',
            identifier: 'jsmith.contractor',
            entityStoreId: 'user:jsmith.contractor',
          },
        });
        mockFindEntitiesWithAliases.mockResolvedValueOnce(
          new Map([['user:jsmith123', ['user:jsmith.old']]])
        );
        const ctx = unpromptedCtx();

        const result = (await tool.handler(
          { targetId: 'jsmith.contractor', entityIds: ['jsmith123'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(ctx.stateManager.setState).not.toHaveBeenCalled();
        expect(mockLinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data.message).toContain(
          'Cannot link to `user:jsmith.contractor`: `user:jsmith123` already heads a resolution group of its own'
        );
        expect(other.data.message).toContain('call this tool again with `user:jsmith123`');
        expect(other.data.groupTargets).toEqual([
          { euid: 'user:jsmith123', aliases: ['user:jsmith.old'] },
        ]);
      });

      it('does not offer a flip when more than one entity heads a group', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:head.a' }, { euid: 'user:head.b' }],
          unresolved: [],
        });
        mockRequireResolvedEntity.mockResolvedValueOnce({
          ok: true,
          identity: {
            identifierType: 'user',
            identifier: 'canonical',
            entityStoreId: 'user:canonical',
          },
        });
        mockFindEntitiesWithAliases.mockResolvedValueOnce(
          new Map([
            ['user:head.a', ['user:a.alias']],
            ['user:head.b', ['user:b.alias']],
          ])
        );
        const ctx = unpromptedCtx();

        const result = (await tool.handler(
          { targetId: 'canonical', entityIds: ['head.a', 'head.b'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockLinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.message).toContain('cannot merge existing resolution groups');
        expect(other.data.message).not.toContain('call this tool again with');
        expect(other.data.groupTargets).toEqual([
          { euid: 'user:head.a', aliases: ['user:a.alias'] },
          { euid: 'user:head.b', aliases: ['user:b.alias'] },
        ]);
      });

      it('does not offer a flip when the named target heads a group of its own', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:jsmith123' }],
          unresolved: [],
        });
        mockRequireResolvedEntity.mockResolvedValueOnce({
          ok: true,
          identity: {
            identifierType: 'user',
            identifier: 'jsmith.contractor',
            entityStoreId: 'user:jsmith.contractor',
          },
        });
        mockFindEntitiesWithAliases.mockResolvedValueOnce(
          new Map([
            ['user:jsmith123', ['user:jsmith.old']],
            ['user:jsmith.contractor', ['user:jsmith.temp']],
          ])
        );
        const ctx = unpromptedCtx();

        const result = (await tool.handler(
          { targetId: 'jsmith.contractor', entityIds: ['jsmith123'] },
          ctx
        )) as ToolHandlerStandardReturn;

        // Both sides have aliases, so reversing the roles would hit the same guard.
        expect(mockFindEntitiesWithAliases).toHaveBeenCalledWith([
          'user:jsmith123',
          'user:jsmith.contractor',
        ]);
        expect(mockLinkEntities).not.toHaveBeenCalled();
        const other = result.results[0] as OtherResult;
        expect(other.data.message).toContain('cannot merge existing resolution groups');
        expect(other.data.message).not.toContain('call this tool again with');
        expect(other.data.groupTargets).toEqual([
          { euid: 'user:jsmith123', aliases: ['user:jsmith.old'] },
        ]);
      });

      it('still confirms when the only group head in the batch is the named target', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [{ euid: 'user:jsmith.contractor' }],
          unresolved: [],
        });
        mockRequireResolvedEntity.mockResolvedValueOnce({
          ok: true,
          identity: {
            identifierType: 'user',
            identifier: 'jsmith123',
            entityStoreId: 'user:jsmith123',
          },
        });
        const ctx = unpromptedCtx();

        await tool.handler({ targetId: 'jsmith123', entityIds: ['jsmith.contractor'] }, ctx);

        expect(ctx.prompts.askForConfirmation).toHaveBeenCalled();
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'user:jsmith123',
          targetSelection: 'user',
          resolved: ['user:jsmith.contractor'],
          unresolved: [],
        });
      });
    });

    describe('HITL', () => {
      it('on unprompted: confirmation message names the target and previews the resolved entity ids', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ targetId: 'server1', entityIds: ['server2'] }, ctx);

        expect(mockLinkEntities).not.toHaveBeenCalled();
        const askArgs = (ctx.prompts.askForConfirmation as jest.Mock).mock.calls[0][0];
        expect(askArgs).toMatchObject({
          id: 'resolution.link_entities.tool-call-link',
          title: 'Link entities',
          confirm_text: 'Link',
          cancel_text: 'Cancel',
        });
        expect(askArgs.message).toContain('`host:server1`');
        expect(askArgs.message).toContain('`host:server2`');
        expect(ctx.stateManager.setState).toHaveBeenCalledWith({
          targetEuid: 'host:server1',
          targetSelection: 'user',
          resolved: ['host:server2'],
          unresolved: [],
        });
      });

      it('on accept: links the saved ids and does not look the names up again', async () => {
        mockLinkEntities.mockResolvedValueOnce({
          target_id: 'host:server1',
          entity_type: 'host',
          linked: ['host:server2'],
          skipped: [],
        });
        const ctx = seedApprovedLink(
          buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.accepted,
          })
        );

        const result = (await tool.handler(
          { targetId: 'server1', entityIds: ['server2'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockRequireResolvedEntity).not.toHaveBeenCalled();
        expect(mockResolveEntityIds).not.toHaveBeenCalled();
        expect(mockLinkEntities).toHaveBeenCalledWith('host:server1', ['host:server2'], {
          awaitVisibility: true,
        });
        const other = result.results[0] as OtherResult;
        expect(other.type).toBe(ToolResultType.other);
        expect(other.data).toEqual({
          targetId: 'host:server1',
          targetSelection: 'user',
          entityType: 'host',
          linked: ['host:server2'],
          skipped: [],
        });
      });

      it('on accept: links only the resolved euids, surfacing the rest as unresolved', async () => {
        mockLinkEntities.mockResolvedValueOnce({
          target_id: 'host:server1',
          entity_type: 'host',
          linked: ['host:server2'],
          skipped: [],
        });
        const ctx = seedApprovedLink(
          buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.accepted,
          }),
          {
            targetEuid: 'host:server1',
            resolved: ['host:server2'],
            unresolved: [{ entityId: 'ghost-entity', status: 'not_found' }],
          }
        );

        const result = (await tool.handler(
          { targetId: 'server1', entityIds: ['server2', 'ghost-entity'] },
          ctx
        )) as ToolHandlerStandardReturn;

        // The unresolved reference must never reach the resolution client — it would
        // otherwise fail EntitiesNotFoundError validation for the whole batch.
        expect(mockLinkEntities).toHaveBeenCalledWith('host:server1', ['host:server2'], {
          awaitVisibility: true,
        });
        const other = result.results[0] as OtherResult;
        expect(other.data.linked).toEqual(['host:server2']);
        expect(other.data.unresolvedReferences).toEqual([
          { entityId: 'ghost-entity', status: 'not_found' },
        ]);
      });

      it('when nothing resolves: returns an error with unresolved references, without prompting or calling the client', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
          resolved: [],
          unresolved: [{ entityId: 'ghost-entity', status: 'not_found' }],
        });
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        const result = (await tool.handler(
          { targetId: 'server1', entityIds: ['ghost-entity'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockLinkEntities).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.metadata).toEqual({
          unresolvedReferences: [{ entityId: 'ghost-entity', status: 'not_found' }],
        });
      });

      it('when a reference is ambiguous: returns the candidates without prompting or linking', async () => {
        mockResolveEntityIds.mockResolvedValueOnce({
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
          { targetId: 'server1', entityIds: ['server'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(ctx.prompts.askForConfirmation).not.toHaveBeenCalled();
        expect(mockLinkEntities).not.toHaveBeenCalled();
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

      it('on reject: returns an error result without linking', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.rejected,
        });

        const result = (await tool.handler(
          { targetId: 'server1', entityIds: ['server2'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockLinkEntities).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toMatch(/declined/i);
        expect(mockRequireResolvedEntity).not.toHaveBeenCalled();
      });

      it('on accept without saved ids: does not link', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        });

        const result = (await tool.handler(
          { targetId: 'server1', entityIds: ['server2'] },
          ctx
        )) as ToolHandlerStandardReturn;

        expect(mockLinkEntities).not.toHaveBeenCalled();
        expect(mockRequireResolvedEntity).not.toHaveBeenCalled();
        const error = result.results[0] as ErrorResult;
        expect(error.type).toBe(ToolResultType.error);
        expect(error.data.message).toBe('Resolved entities state not found.');
      });
    });

    it('returns an error result when the user lacks permission to link entities', async () => {
      mocks.mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });
      const ctx = buildHandlerContextWithPrompts(mocks, {
        checkStatus: ConfirmationStatus.accepted,
      });

      const result = (await tool.handler(
        { targetId: 'server1', entityIds: ['server2'] },
        ctx
      )) as ToolHandlerStandardReturn;

      expect(mockLinkEntities).not.toHaveBeenCalled();
      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('permission');
    });

    it('returns an error result with the domain error message when the resolution client rejects', async () => {
      mockLinkEntities.mockRejectedValueOnce(new SelfLinkError('host:server1'));
      const ctx = seedApprovedLink(
        buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.accepted,
        })
      );

      const result = (await tool.handler(
        { targetId: 'server1', entityIds: ['server2'] },
        ctx
      )) as ToolHandlerStandardReturn;

      const error = result.results[0] as ErrorResult;
      expect(error.type).toBe(ToolResultType.error);
      expect(error.data.message).toContain('host:server1');
    });

    describe('telemetry', () => {
      it('does not report telemetry while only asking for confirmation', async () => {
        const ctx = buildHandlerContextWithPrompts(mocks, {
          checkStatus: ConfirmationStatus.unprompted,
        });

        await tool.handler({ targetId: 'server1', entityIds: ['server2'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).not.toHaveBeenCalled();
      });

      it('reports success=true after a successful link', async () => {
        mockLinkEntities.mockResolvedValueOnce({
          target_id: 'host:server1',
          entity_type: 'host',
          linked: ['host:server2'],
          skipped: [],
        });
        const ctx = seedApprovedLink(
          buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.accepted,
          })
        );

        await tool.handler({ targetId: 'server1', entityIds: ['server2'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          expect.objectContaining({
            toolId: SECURITY_LINK_ENTITIES_TOOL_ID,
            actionType: 'mutation',
            success: true,
            userConfirmationOutcome: ConfirmationStatus.accepted,
          })
        );
      });

      it('reports success=false with the domain error message when linking fails', async () => {
        mockLinkEntities.mockRejectedValueOnce(new Error('boom'));
        const ctx = seedApprovedLink(
          buildHandlerContextWithPrompts(mocks, {
            checkStatus: ConfirmationStatus.accepted,
          })
        );

        await tool.handler({ targetId: 'server1', entityIds: ['server2'] }, ctx);

        expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
          ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType,
          expect.objectContaining({ success: false, errorMessage: 'boom' })
        );
      });
    });
  });
});
