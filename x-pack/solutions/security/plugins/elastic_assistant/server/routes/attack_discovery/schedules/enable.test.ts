/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { enableAttackDiscoverySchedulesRoute } from './enable';
import { serverMock } from '../../../__mocks__/server';
import { requestContextMock } from '../../../__mocks__/request_context';
import { enableAttackDiscoverySchedulesRequest } from '../../../__mocks__/request';
import { AttackDiscoveryScheduleDataClient } from '../../../lib/attack_discovery/schedules/data_client';

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const enableAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  enableSchedule: enableAttackDiscoverySchedule,
  disableSchedule: jest.fn(),
} as unknown as AttackDiscoveryScheduleDataClient;

describe('enableAttackDiscoverySchedulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    context.core.featureFlags.getBooleanValue.mockResolvedValue(true);
    enableAttackDiscoverySchedulesRoute(server.router);
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      enableAttackDiscoverySchedulesRequest('schedule-1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ id: 'schedule-1' });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      enableAttackDiscoverySchedulesRequest('schedule-2'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.enableSchedule` error', async () => {
    (enableAttackDiscoverySchedule as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      enableAttackDiscoverySchedulesRequest('schedule-3'),
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
        enableAttackDiscoverySchedulesRequest('schedule-4'),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(404);
    });
  });
});
