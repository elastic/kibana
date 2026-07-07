/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai/constants';

import { getAttackDiscoverySchedulesRoute } from './get';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { getAttackDiscoverySchedulesRequest } from '../../../../../__mocks__/request';
import { getAttackDiscoveryScheduleMock } from '../../../../../__mocks__/attack_discovery_schedules.mock';
import type { AttackDiscoveryScheduleDataClient } from '../../../../../lib/attack_discovery/schedules/data_client';
import { performChecks } from '../../../../helpers';

jest.mock('../../../../helpers', () => ({
  performChecks: jest.fn(),
}));

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const getAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: getAttackDiscoverySchedule,
  createSchedule: jest.fn(),
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
const basicAttackDiscoveryScheduleMock = {
  name: 'Test Schedule',
  schedule: {
    interval: '100m',
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

const expectedApiResponse = {
  name: 'Test Schedule',
  schedule: {
    interval: '100m',
  },
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: mockApiConfig,
    end: 'now',
    size: 25,
    start: 'now-24h',
  },
  enabled: true,
};

describe('getAttackDiscoverySchedulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    (performChecks as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
    getAttackDiscoverySchedulesRoute(server.router);
    getAttackDiscoverySchedule.mockResolvedValue(
      getAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock)
    );
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      getAttackDiscoverySchedulesRequest('schedule-1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(expect.objectContaining(expectedApiResponse));
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      getAttackDiscoverySchedulesRequest('schedule-2'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.getSchedule` error', async () => {
    (getAttackDiscoverySchedule as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      getAttackDiscoverySchedulesRequest('schedule-3'),
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
