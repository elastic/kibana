/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { AuthenticatedUser } from '@kbn/core-security-common';

import type { AttackDiscoveryDataClient } from '../../../../lib/attack_discovery/persistence';
import { attackDiscoveryDataClientMock } from '../../../../__mocks__/data_clients.mock';
import { requestMock } from '../../../../__mocks__/request';
import { requestContextMock } from '../../../../__mocks__/request_context';
import { serverMock } from '../../../../__mocks__/server';
import { postAttackDiscoveryGenerationsDismissRoute } from './post_attack_discovery_generations_dismiss';

const { context } = requestContextMock.createTools();
const server = serverMock.create();

describe('postAttackDiscoveryGenerationsDismissRoute', () => {
  const mockUser = {
    authentication_realm: {
      name: 'my_realm_name',
      type: 'my_realm_type',
    },
    username: 'elastic',
  } as AuthenticatedUser;

  const mockDataClient = attackDiscoveryDataClientMock.create();

  beforeEach(() => {
    vi.clearAllMocks();
    context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(
      mockDataClient as unknown as AttackDiscoveryDataClient
    );
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    context.elasticAssistant.logger = {
      debug: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      get: vi.fn().mockReturnThis(),
      info: vi.fn(),
      isLevelEnabled: vi.fn().mockReturnValue(true),
      log: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    };
    context.elasticAssistant.eventLogIndex = 'event-log-index';
    context.elasticAssistant.eventLogger = {
      logEvent: vi.fn().mockResolvedValue(undefined),
      startTiming: vi.fn(),
      stopTiming: vi.fn(),
      updateEvents: vi.fn(),
    };
    context.elasticAssistant.getSpaceId = vi.fn().mockReturnValue('default');
    context.core.featureFlags.getBooleanValue = vi.fn().mockResolvedValue(true);

    const mockGeneration = {
      alerts_context_count: 10,
      connector_id: 'cid',
      connector_stats: {
        average_successful_duration_nanoseconds: 1500000000,
        successful_generations: 5,
      },
      discoveries: 3,
      end: '2024-06-07T21:19:08.090Z',
      execution_uuid: 'uuid-1',
      loading_message: 'Generating attack discovery',
      reason: undefined,
      start: '2024-06-07T18:56:17.357Z',
      status: 'succeeded' as const,
    };

    mockDataClient.getAttackDiscoveryGenerationById.mockResolvedValue(mockGeneration);
    postAttackDiscoveryGenerationsDismissRoute(server.router);
  });

  it('returns 401 if an authenticated user is not found', async () => {
    context.elasticAssistant.getCurrentUser.mockResolvedValueOnce(null);
    const request = requestMock.create({
      method: 'post',
      params: { execution_uuid: 'uuid-1' },
      path: '/internal/elastic_assistant/attack_discovery/generations/uuid-1/dismiss',
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(401);
  });

  it('returns 500 if the data client is not initialized', async () => {
    context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValueOnce(null);
    const request = requestMock.create({
      method: 'post',
      params: { execution_uuid: 'uuid-1' },
      path: '/internal/elastic_assistant/attack_discovery/generations/uuid-1/dismiss',
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(500);
  });

  it('returns 500 if an error is thrown', async () => {
    mockDataClient.getAttackDiscoveryGenerationById.mockRejectedValueOnce(new Error('Oh no!'));
    const request = requestMock.create({
      method: 'post',
      params: { execution_uuid: 'uuid-1' },
      path: '/internal/elastic_assistant/attack_discovery/generations/uuid-1/dismiss',
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(500);
  });
});
