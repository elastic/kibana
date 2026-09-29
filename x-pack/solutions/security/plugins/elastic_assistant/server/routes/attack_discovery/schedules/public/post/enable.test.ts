/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { performChecks } from '../../../../helpers';

vi.mock('../../../../helpers', () => {
  const mocked = {
    performChecks: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { enableAttackDiscoverySchedulesRoute } from './enable';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { enableAttackDiscoverySchedulesRequest } from '../../../../../__mocks__/request';
import type { AttackDiscoveryScheduleDataClient } from '@kbn/attack-discovery-schedules-common';

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const enableAttackDiscoverySchedule = vi.fn();
const mockSchedulingDataClient = {
  findSchedules: vi.fn(),
  getSchedule: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  enableSchedule: enableAttackDiscoverySchedule,
  disableSchedule: vi.fn(),
} as unknown as AttackDiscoveryScheduleDataClient;

describe('enableAttackDiscoverySchedulesRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    // Mock performChecks to return success by default
    (performChecks as Mock).mockResolvedValue({
      isSuccess: true,
    });
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
    (enableAttackDiscoverySchedule as Mock).mockRejectedValue(new Error('Oh no!'));
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
});
