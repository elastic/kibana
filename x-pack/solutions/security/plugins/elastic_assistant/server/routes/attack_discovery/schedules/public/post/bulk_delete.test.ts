/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { bulkDeleteAttackDiscoverySchedulesRoute } from './bulk_delete';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { bulkDeleteAttackDiscoverySchedulesRequest } from '../../../../../__mocks__/request';
import type { AttackDiscoveryScheduleDataClient } from '@kbn/attack-discovery-schedules-common';
import { performChecks } from '../../../../helpers';

jest.mock('../../../../helpers', () => ({
  performChecks: jest.fn(),
}));

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const bulkDeleteAttackDiscoverySchedules = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  enableSchedule: jest.fn(),
  disableSchedule: jest.fn(),
  bulkDeleteSchedules: bulkDeleteAttackDiscoverySchedules,
} as unknown as AttackDiscoveryScheduleDataClient;

describe('bulkDeleteAttackDiscoverySchedulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bulkDeleteAttackDiscoverySchedules.mockResolvedValue({
      ids: ['schedule-1', 'schedule-2'],
      errors: [],
      total: 2,
    });
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    (performChecks as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
    bulkDeleteAttackDiscoverySchedulesRoute(server.router);
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      bulkDeleteAttackDiscoverySchedulesRequest({ ids: ['schedule-1', 'schedule-2'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ ids: ['schedule-1', 'schedule-2'], errors: [], total: 2 });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      bulkDeleteAttackDiscoverySchedulesRequest({ ids: ['schedule-1'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.bulkDeleteSchedules` error', async () => {
    bulkDeleteAttackDiscoverySchedules.mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      bulkDeleteAttackDiscoverySchedulesRequest({ ids: ['schedule-1'] }),
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
