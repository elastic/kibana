/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_CONVERSATIONS_URL } from '@kbn/pnd-common';

import {
  PND_API_PRIVILEGE_READ,
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
} from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { buildPndConversations } from './helpers/build_pnd_conversations';
import { findAttackDiscoveryAlerts } from './helpers/find_attack_discovery_alerts';
import { listAgentBuilderConversations } from './helpers/list_agent_builder_conversations';
import { registerListConversationsRoute } from './list_conversations';

jest.mock('./helpers/build_pnd_conversations');
jest.mock('./helpers/find_attack_discovery_alerts');
jest.mock('./helpers/list_agent_builder_conversations');

const buildPndConversationsMock = buildPndConversations as jest.Mock;
const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const listAgentBuilderConversationsMock = listAgentBuilderConversations as jest.Mock;

const http = { id: 'http' };

const enabledHeaders = { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' };

const createUiSettings = (adWorkflowsEnabled: boolean) => ({
  savedObjects: {
    getUnsafeInternalClient: jest
      .fn()
      .mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
  },
  uiSettings: {
    asScopedToClient: jest
      .fn()
      .mockReturnValue({ get: jest.fn().mockResolvedValue(adWorkflowsEnabled) }),
  },
});

const PND_CONVERSATION = {
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:00:00.000Z',
  id: 'conversation-1',
  kind: 'investigation' as const,
  title: 'Investigation',
  updatedAt: '2026-08-02T01:00:00.000Z',
};

const createDeps = (adWorkflowsEnabled = true) => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest
      .fn()
      .mockResolvedValue([{ http, ...createUiSettings(adWorkflowsEnabled) }, {}, {}]),
    getWatchProjection: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_CONVERSATIONS_URL).versions['1'].handler;

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  query: Record<string, unknown> = {}
) => {
  const request = httpServerMock.createKibanaRequest({ query });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerListConversationsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
    listAgentBuilderConversationsMock.mockResolvedValue([{ id: 'conversation-1' }]);
    buildPndConversationsMock.mockReturnValue([PND_CONVERSATION]);
  });

  it('gates the route on the low read privilege', () => {
    const deps = createDeps();

    registerListConversationsRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_CONVERSATIONS_URL).config.security).toEqual({
      authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
    });
  });

  it('returns the intersected PND conversations with a total', async () => {
    const deps = createDeps();
    registerListConversationsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { conversations: [PND_CONVERSATION], total: 1 },
      headers: enabledHeaders,
    });
  });

  it('returns an empty list with the AD-2.0-disabled signal when the space setting is off', async () => {
    const deps = createDeps(false);
    registerListConversationsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { conversations: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
    });
  });

  it('does not query Agent Builder conversations when AD 2.0 is disabled in the space', async () => {
    const deps = createDeps(false);
    registerListConversationsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(listAgentBuilderConversationsMock).not.toHaveBeenCalled();
  });

  it('resolves the space AD alerts as the calling user (S3)', async () => {
    const deps = createDeps();
    registerListConversationsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, spaceId: 'agent-3' })
    );
  });

  it('does not filter AD alerts by id when listing (whole-space set)', async () => {
    const deps = createDeps();
    registerListConversationsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock.mock.calls[0][0].ids).toBeUndefined();
  });

  it('lists the caller Agent Builder conversations in the request space', async () => {
    const deps = createDeps();
    registerListConversationsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(listAgentBuilderConversationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, spaceId: 'agent-3' })
    );
  });

  it('intersects the derived id set with the conversation list', async () => {
    const deps = createDeps();
    registerListConversationsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(buildPndConversationsMock).toHaveBeenCalledWith({
      correlationIds: ['ad-1'],
      conversations: [{ id: 'conversation-1' }],
    });
  });

  it('resolves the space from the request', async () => {
    const deps = createDeps();
    registerListConversationsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(deps.getSpaceId).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when a dependency throws', async () => {
    const deps = createDeps();
    listAgentBuilderConversationsMock.mockRejectedValue(new Error('boom'));
    registerListConversationsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('filters to the requested kind', async () => {
    const incident = {
      ...PND_CONVERSATION,
      id: 'conversation-incident',
      kind: 'incident' as const,
    };
    buildPndConversationsMock.mockReturnValue([PND_CONVERSATION, incident]);
    const deps = createDeps();
    registerListConversationsRoute(deps);

    const response = await invoke(getHandler(deps.router), { kind: 'incident' });

    expect(response.ok).toHaveBeenCalledWith({
      body: { conversations: [incident], total: 1 },
      headers: enabledHeaders,
    });
  });

  it('pages the requested kind', async () => {
    const newerIncident = {
      ...PND_CONVERSATION,
      id: 'conversation-incident-new',
      kind: 'incident' as const,
      updatedAt: '2026-08-03T00:00:00.000Z',
    };
    const olderIncident = {
      ...PND_CONVERSATION,
      id: 'conversation-incident-old',
      kind: 'incident' as const,
      updatedAt: '2026-08-01T00:00:00.000Z',
    };
    buildPndConversationsMock.mockReturnValue([olderIncident, newerIncident]);
    const deps = createDeps();
    registerListConversationsRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      kind: 'incident',
      page: 2,
      perPage: 1,
    });

    expect(response.ok).toHaveBeenCalledWith({
      body: { conversations: [olderIncident], total: 2 },
      headers: enabledHeaders,
    });
  });
});
