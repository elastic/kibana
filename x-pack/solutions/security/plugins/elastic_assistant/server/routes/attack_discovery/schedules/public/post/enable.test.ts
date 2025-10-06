/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performChecks } from '../../../../helpers';
import { getKibanaFeatureFlags } from '../../../helpers/get_kibana_feature_flags';

jest.mock('../../../helpers/get_kibana_feature_flags', () => ({
  getKibanaFeatureFlags: jest.fn(),
}));

jest.mock('../../../../helpers', () => ({
  performChecks: jest.fn(),
}));

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { enableAttackDiscoverySchedulesRoute } from './enable';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { enableAttackDiscoverySchedulesRequest } from '../../../../../__mocks__/request';
import type { AttackDiscoveryScheduleDataClient } from '../../../../../lib/attack_discovery/schedules/data_client';

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
    // Mock getKibanaFeatureFlags to be enabled by default
    (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
      attackDiscoveryPublicApiEnabled: true,
    });
    // Mock performChecks to return success by default
    (performChecks as jest.Mock).mockResolvedValue({
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

  describe('public API feature flag behavior', () => {
    describe('when the public API is disabled', () => {
      beforeEach(() => {
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValueOnce({
          attackDiscoveryPublicApiEnabled: false,
        });
      });

      it('returns a 403 response when the public API is disabled', async () => {
        const response = await server.inject(
          enableAttackDiscoverySchedulesRequest('schedule-1'),
          requestContextMock.convertContext(context)
        );

        expect(response.status).toEqual(403);
        expect(response.body).toEqual({
          message: { error: 'Attack discovery public API is disabled', success: false },
          status_code: 403,
        });
      });
    });

    describe('when the public API is enabled', () => {
      beforeEach(() => {
        (enableAttackDiscoverySchedule as jest.Mock).mockResolvedValue({ id: 'schedule-1' });
        jest.clearAllMocks();
        (getKibanaFeatureFlags as jest.Mock).mockReset();
        (performChecks as jest.Mock).mockReset();
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
          attackDiscoveryPublicApiEnabled: true,
        });
        (performChecks as jest.Mock).mockResolvedValue({
          isSuccess: true,
        });
        context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
          mockSchedulingDataClient
        );
        enableAttackDiscoverySchedulesRoute(server.router);
      });

      it('proceeds with normal execution when the public API is enabled', async () => {
        const response = await server.inject(
          enableAttackDiscoverySchedulesRequest('schedule-1'),
          requestContextMock.convertContext(context)
        );
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ id: 'schedule-1' });
      });
    });
  });
});
