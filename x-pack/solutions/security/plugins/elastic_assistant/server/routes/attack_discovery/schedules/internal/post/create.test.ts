/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { CreateAttackDiscoverySchedulesInternalRequestBody } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { createAttackDiscoverySchedulesInternalRoute } from './create';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { createAttackDiscoverySchedulesInternalRequest } from '../../../../../__mocks__/request';
import { getAttackDiscoveryScheduleMock } from '../../../../../__mocks__/attack_discovery_schedules.mock';
import type { AttackDiscoveryScheduleDataClient } from '../../../../../lib/attack_discovery/schedules/data_client';

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const createAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: jest.fn(),
  createSchedule: createAttackDiscoverySchedule,
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  enableSchedule: jest.fn(),
  disableSchedule: jest.fn(),
} as unknown as AttackDiscoveryScheduleDataClient;
const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  name: 'Test Bedrock',
  provider: OpenAiProviderType.OpenAi,
};
const mockRequestBody: CreateAttackDiscoverySchedulesInternalRequestBody = {
  name: 'Test Schedule 1',
  schedule: {
    interval: '10m',
  },
  params: {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: mockApiConfig,
    end: 'now',
    size: 25,
    start: 'now-24h',
  },
  enabled: true,
};

describe('createAttackDiscoverySchedulesInternalRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    createAttackDiscoverySchedulesInternalRoute(server.router);
    createAttackDiscoverySchedule.mockResolvedValue(
      getAttackDiscoveryScheduleMock(mockRequestBody)
    );
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      createAttackDiscoverySchedulesInternalRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(expect.objectContaining({ ...mockRequestBody }));
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      createAttackDiscoverySchedulesInternalRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.createSchedule` error', async () => {
    (createAttackDiscoverySchedule as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      createAttackDiscoverySchedulesInternalRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: {
        error: 'Oh no!',
        success: false,
      },
      status_code: 500,
    });
  });
});
