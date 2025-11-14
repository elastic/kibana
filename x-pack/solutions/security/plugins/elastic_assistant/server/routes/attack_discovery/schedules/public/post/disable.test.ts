/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { disableAttackDiscoverySchedulesRoute } from './disable';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { disableAttackDiscoverySchedulesRequest } from '../../../../../__mocks__/request';
import type { AttackDiscoveryScheduleDataClient } from '../../../../../lib/attack_discovery/schedules/data_client';
import { performChecks } from '../../../../helpers';
import { getKibanaFeatureFlags } from '../../../helpers/get_kibana_feature_flags';

jest.mock('../../../helpers/get_kibana_feature_flags', () => ({
  getKibanaFeatureFlags: jest.fn(),
}));

jest.mock('../../../../helpers', () => ({
  performChecks: jest.fn(),
}));

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const disableAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  enableSchedule: jest.fn(),
  disableSchedule: disableAttackDiscoverySchedule,
} as unknown as AttackDiscoveryScheduleDataClient;

describe('disableAttackDiscoverySchedulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
      mockSchedulingDataClient
    );
    (performChecks as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
    (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
      attackDiscoveryPublicApiEnabled: true,
    });
    disableAttackDiscoverySchedulesRoute(server.router);
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      disableAttackDiscoverySchedulesRequest('schedule-1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ id: 'schedule-1' });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      disableAttackDiscoverySchedulesRequest('schedule-2'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.disableSchedule` error', async () => {
    (disableAttackDiscoverySchedule as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      disableAttackDiscoverySchedulesRequest('schedule-3'),
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
      let featureFlagServer: ReturnType<typeof serverMock.create>;
      let featureFlagContext: ReturnType<typeof requestContextMock.createTools>['context'];

      beforeEach(() => {
        jest.clearAllMocks();
        featureFlagServer = serverMock.create();
        const { context: freshContext } = requestContextMock.createTools();
        featureFlagContext = freshContext;

        featureFlagContext.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
          mockSchedulingDataClient
        );

        (performChecks as jest.Mock).mockResolvedValue({
          isSuccess: true,
        });
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
          attackDiscoveryPublicApiEnabled: false,
        });

        disableAttackDiscoverySchedulesRoute(featureFlagServer.router);
      });

      it('returns a 403 response when the public API is disabled', async () => {
        const response = await featureFlagServer.inject(
          disableAttackDiscoverySchedulesRequest('schedule-1'),
          requestContextMock.convertContext(featureFlagContext)
        );

        expect(response.status).toEqual(403);
        expect(response.body).toEqual({
          message: { error: 'Attack discovery public API is disabled', success: false },
          status_code: 403,
        });
      });
    });

    describe('when the public API is enabled', () => {
      let featureFlagServer: ReturnType<typeof serverMock.create>;
      let featureFlagContext: ReturnType<typeof requestContextMock.createTools>['context'];

      beforeEach(() => {
        jest.clearAllMocks();
        featureFlagServer = serverMock.create();
        const { context: freshContext } = requestContextMock.createTools();
        featureFlagContext = freshContext;

        disableAttackDiscoverySchedule.mockResolvedValue({ id: 'schedule-1' });

        featureFlagContext.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
          mockSchedulingDataClient
        );
        (performChecks as jest.Mock).mockResolvedValue({
          isSuccess: true,
        });
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
          attackDiscoveryPublicApiEnabled: true,
        });

        disableAttackDiscoverySchedulesRoute(featureFlagServer.router);
      });

      it('proceeds with normal execution when the public API is enabled', async () => {
        const response = await featureFlagServer.inject(
          disableAttackDiscoverySchedulesRequest('schedule-1'),
          requestContextMock.convertContext(featureFlagContext)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ id: 'schedule-1' });
      });
    });
  });
});
