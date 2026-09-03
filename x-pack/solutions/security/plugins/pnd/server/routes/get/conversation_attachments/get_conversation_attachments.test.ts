/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  deriveConversationIds,
  deriveThreadConversationId,
  GetConversationAttachmentsResponse,
  PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE,
  PND_GATE_IDS,
} from '@kbn/pnd-common';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { listAgentBuilderAttachments } from '../../helpers/list_agent_builder_attachments';
import { registerGetConversationAttachmentsRoute } from './get_conversation_attachments';

jest.mock('../conversations/helpers/find_attack_discovery_alerts');
jest.mock('../../helpers/list_agent_builder_attachments');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const listAgentBuilderAttachmentsMock = listAgentBuilderAttachments as jest.Mock;

const ATTACK_DISCOVERY_ALERT_ID = 'ad-1';
const OTHER_ATTACK_DISCOVERY_ALERT_ID = 'ad-2';

const THREAD_ID = deriveThreadConversationId({
  correlationId: ATTACK_DISCOVERY_ALERT_ID,
  gateId: PND_GATE_IDS.applyTuning,
}) as string;

const AGENT_BUILDER_ATTACHMENTS = [
  {
    current_version: 1,
    description: 'Attack Discovery',
    id: 'pnd-attack-discovery',
    type: 'text',
    versions: [
      {
        content_hash: 'abc',
        created_at: '2026-08-06T00:00:00.000Z',
        data: { content: '## Coordinated credential theft' },
        version: 1,
      },
    ],
  },
  {
    current_version: 1,
    description: 'Proposed rule change',
    id: 'pnd-proposed-change',
    type: 'text',
    versions: [
      {
        content_hash: 'def',
        created_at: '2026-08-06T00:00:01.000Z',
        data: { content: 'Gate: apply_tuning' },
        version: 1,
      },
    ],
  },
];

const http = { id: 'http' };

const createDeps = () => {
  const router = mockRouter.create();

  return {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-1'),
    getStartServices: jest.fn().mockResolvedValue([{ http }, { agentBuilder: {} }, {}]),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };
};

const getRoute = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE);

const invoke = async (
  router: ReturnType<typeof mockRouter.create>,
  {
    correlationId = ATTACK_DISCOVERY_ALERT_ID,
    conversationId = THREAD_ID,
  }: { correlationId?: string; conversationId?: string } = {}
) => {
  const { handler } = getRoute(router).versions['1'];
  const request = httpServerMock.createKibanaRequest({
    params: { conversationId },
    query: { correlationId },
  });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

const okBody = (response: ReturnType<typeof httpServerMock.createResponseFactory>) =>
  (response.ok as jest.Mock).mock.calls[0][0].body as GetConversationAttachmentsResponse;

describe('registerGetConversationAttachmentsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { id: ATTACK_DISCOVERY_ALERT_ID, title: 'Coordinated credential theft' },
    ]);
    listAgentBuilderAttachmentsMock.mockResolvedValue({
      attachments: AGENT_BUILDER_ATTACHMENTS,
      exists: true,
      status: 200,
    });
  });

  describe('route registration', () => {
    it('gates the route on the low read privilege', () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      expect(getRoute(deps.router).config.security).toEqual({
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      });
    });

    it('is an internal route', () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      expect(getRoute(deps.router).config.access).toEqual('internal');
    });
  });

  describe('the happy path', () => {
    it('projects the Agent Builder attachments onto the PND contract', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          attachments: [
            {
              content: '## Coordinated credential theft',
              createdAt: '2026-08-06T00:00:00.000Z',
              description: 'Attack Discovery',
              id: 'pnd-attack-discovery',
              type: 'text',
              version: 1,
            },
            {
              content: 'Gate: apply_tuning',
              createdAt: '2026-08-06T00:00:01.000Z',
              description: 'Proposed rule change',
              id: 'pnd-proposed-change',
              type: 'text',
              version: 1,
            },
          ],
          total: 2,
        },
      });
    });

    it('returns a body the response contract accepts', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(GetConversationAttachmentsResponse.safeParse(okBody(response)).success).toBe(true);
    });

    it('reads the attachments as the calling user, in the request space', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      await invoke(deps.router);

      expect(listAgentBuilderAttachmentsMock).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: THREAD_ID, http, spaceId: 'agent-1' })
      );
    });

    it('answers an empty list for a thread with no attachments', async () => {
      listAgentBuilderAttachmentsMock.mockResolvedValue({
        attachments: [],
        exists: true,
        status: 200,
      });
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(okBody(response)).toEqual({ attachments: [], total: 0 });
    });

    it('answers an empty list when Agent Builder returned no results array at all', async () => {
      listAgentBuilderAttachmentsMock.mockResolvedValue({
        attachments: undefined,
        exists: true,
        status: 200,
      });
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(okBody(response)).toEqual({ attachments: [], total: 0 });
    });
  });

  describe('the S11 guard', () => {
    it('404s an id that is not derived from the supplied alert', async () => {
      const { incidentConversationId } = deriveConversationIds(OTHER_ATTACK_DISCOVERY_ALERT_ID);
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router, { conversationId: incidentConversationId });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('never reaches Agent Builder for an id it does not own', async () => {
      const { incidentConversationId } = deriveConversationIds(OTHER_ATTACK_DISCOVERY_ALERT_ID);
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      await invoke(deps.router, { conversationId: incidentConversationId });

      expect(listAgentBuilderAttachmentsMock).not.toHaveBeenCalled();
    });

    it('404s rather than 403s, so a rejection does not confirm the id is meaningful', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router, { conversationId: 'not-a-pnd-conversation' });

      expect(response.forbidden).not.toHaveBeenCalled();
    });

    it('fails closed on a blank alert id that reached the handler', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router, { correlationId: '   ' });

      expect(response.notFound).toHaveBeenCalled();
    });

    it('logs every rejection, so a refusal is never silent', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      await invoke(deps.router, { conversationId: 'not-a-pnd-conversation' });

      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not-a-pnd-conversation')
      );
    });
  });

  describe('resolving the discovery as the calling user (S3)', () => {
    it('resolves the discovery in the request space', async () => {
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      await invoke(deps.router);

      expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
        expect.objectContaining({ http, ids: [ATTACK_DISCOVERY_ALERT_ID], spaceId: 'agent-1' })
      );
    });

    it('404s when the caller cannot read the discovery', async () => {
      findAttackDiscoveryAlertsMock.mockResolvedValue([]);
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(response.notFound).toHaveBeenCalled();
    });

    it('never reads the attachments for a discovery the caller cannot read', async () => {
      findAttackDiscoveryAlertsMock.mockResolvedValue([]);
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      await invoke(deps.router);

      expect(listAgentBuilderAttachmentsMock).not.toHaveBeenCalled();
    });
  });

  describe('the not-found path', () => {
    it('404s a conversation Agent Builder does not return', async () => {
      listAgentBuilderAttachmentsMock.mockResolvedValue({
        attachments: undefined,
        exists: false,
        status: 404,
      });
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(response.notFound).toHaveBeenCalled();
    });

    // Agent Builder `client.get`s the conversation first, so a caller who may not read it is
    // answered 404 there. PND must not turn that into a distinguishable status.
    it('404s a conversation the caller cannot read, rather than 403ing it', async () => {
      listAgentBuilderAttachmentsMock.mockResolvedValue({
        attachments: undefined,
        exists: false,
        status: 403,
      });
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(response.notFound).toHaveBeenCalled();
    });
  });

  describe('failure paths', () => {
    it('maps a thrown error to a 500', async () => {
      listAgentBuilderAttachmentsMock.mockRejectedValue(new Error('socket hang up'));
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      const response = await invoke(deps.router);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });

    it('logs the message rather than the Error object, so the marker survives', async () => {
      listAgentBuilderAttachmentsMock.mockRejectedValue(new Error('socket hang up'));
      const deps = createDeps();
      registerGetConversationAttachmentsRoute(deps);

      await invoke(deps.router);

      expect(deps.logger.error).toHaveBeenCalledWith(expect.stringContaining('socket hang up'));
    });
  });
});
