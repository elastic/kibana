/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import type { ConversationWithPermissions } from '@kbn/agent-builder-common';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/alertzero-common';
import type { ConversationProposalsService } from '../../services/conversation_proposals/conversation_proposals_service';
import type { RouteDependencies } from '../register_routes';
import { registerGetInvestigationRoute } from './get_investigation';

const conversation: ConversationWithPermissions = {
  agent_id: 'elastic-ai-agent',
  created_at: '2026-09-18T00:00:00.000Z',
  id: '8f85ba5f-08c1-8718-83bb-31c07f16d69e',
  metadata: {
    status: 'open',
    summary: 'Credential theft',
    workflow_execution_id: 'parent-run',
  },
  permissions: { delete: false, rename: false, update_access_control: false },
  rounds: [],
  title: 'macOS Keychain Theft',
  updated_at: '2026-09-18T00:10:00.000Z',
  user: { id: 'u1', username: 'elastic' },
};

const makeConversationProposalsService = (
  overrides: Partial<ConversationProposalsService> = {}
): ConversationProposalsService =>
  ({
    get: jest.fn().mockResolvedValue(conversation),
    ...overrides,
  } as unknown as ConversationProposalsService);

describe('registerGetInvestigationRoute', () => {
  const logger = loggingSystemMock.createLogger();

  const setup = (
    service: ConversationProposalsService = makeConversationProposalsService(),
    useMockData = false
  ) => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion });

    const deps: Partial<RouteDependencies> = {
      config: { enabled: true, ui: { useMockData } } as RouteDependencies['config'],
      getConversationProposalsService: () => service,
      getSpaceId: () => 'default',
      logger,
      router,
    };

    registerGetInvestigationRoute(deps as RouteDependencies);

    const handler = addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>;

    return { handler, service };
  };

  it('maps a live conversation onto the investigation DTO', async () => {
    const service = makeConversationProposalsService();
    const { handler } = setup(service);
    const request = httpServerMock.createKibanaRequest({
      params: { id: conversation.id },
    });
    const response = httpServerMock.createResponseFactory();

    await handler({}, request, response);

    expect(service.get).toHaveBeenCalledWith(conversation.id, request);
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        investigation: expect.objectContaining({
          id: conversation.id,
          summary: 'Credential theft',
          title: 'macOS Keychain Theft',
          watch_execution_id: 'parent-run',
          watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        }),
      },
    });
  });

  it('returns 404 when the conversation is missing', async () => {
    const service = makeConversationProposalsService({
      get: jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: conversation.id })),
    });
    const { handler } = setup(service);
    const response = httpServerMock.createResponseFactory();

    await handler(
      {},
      httpServerMock.createKibanaRequest({ params: { id: conversation.id } }),
      response
    );

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: `Investigation "${conversation.id}" not found` },
    });
  });
});
