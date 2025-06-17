/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { findAttackDiscoverySchedulesRoute } from './find';
import { serverMock } from '../../../__mocks__/server';
import { requestContextMock } from '../../../__mocks__/request_context';
import { findAttackDiscoverySchedulesRequest } from '../../../__mocks__/request';
import {
  getAttackDiscoveryScheduleMock,
  getFindAttackDiscoverySchedulesMock,
} from '../../../__mocks__/attack_discovery_schedules.mock';
import { AttackDiscoveryScheduleDataClient } from '../../../lib/attack_discovery/schedules/data_client';

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const findAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: findAttackDiscoverySchedule,
  getSchedule: jest.fn(),
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

describe('findAttackDiscoverySchedulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    context.core.featureFlags.getBooleanValue.mockResolvedValue(true);
    findAttackDiscoverySchedulesRoute(server.router);
    findAttackDiscoverySchedule.mockResolvedValue(
      getFindAttackDiscoverySchedulesMock([
        getAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock),
      ])
    );
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      findAttackDiscoverySchedulesRequest(),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      total: 1,
      data: [expect.objectContaining(basicAttackDiscoveryScheduleMock)],
    });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      findAttackDiscoverySchedulesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.findSchedules` error', async () => {
    (findAttackDiscoverySchedule as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      findAttackDiscoverySchedulesRequest(),
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

  describe('Disabled feature flag', () => {
    it('should return a 404 if scheduling feature is not registered', async () => {
      context.core.featureFlags.getBooleanValue.mockResolvedValue(false);
      const response = await server.inject(
        findAttackDiscoverySchedulesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(404);
    });
  });
});
