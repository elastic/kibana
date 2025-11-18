/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { UpdateAttackDiscoverySchedulesRequestBody } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { updateAttackDiscoverySchedulesRoute } from './update';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { updateAttackDiscoverySchedulesPublicRequest } from '../../../../../__mocks__/request';
import { getAttackDiscoveryScheduleMock } from '../../../../../__mocks__/attack_discovery_schedules.mock';
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

const updateAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: updateAttackDiscoverySchedule,
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
const mockRequestBody: UpdateAttackDiscoverySchedulesRequestBody = {
  name: 'Test Schedule 2',
  schedule: {
    interval: '15m',
  },
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: mockApiConfig,
    end: 'now',
    size: 50,
    start: 'now-24h',
  },
  actions: [],
};

describe('updateAttackDiscoverySchedulesRoute', () => {
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
    updateAttackDiscoverySchedulesRoute(server.router);
    updateAttackDiscoverySchedule.mockResolvedValue(
      getAttackDiscoveryScheduleMock({
        params: {
          alertsIndexPattern: mockRequestBody.params.alerts_index_pattern,
          apiConfig: mockRequestBody.params.api_config,
          end: mockRequestBody.params.end,
          size: mockRequestBody.params.size,
          start: mockRequestBody.params.start,
        },
        name: mockRequestBody.name,
        schedule: mockRequestBody.schedule,
      })
    );
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      updateAttackDiscoverySchedulesPublicRequest('schedule-1', mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(expect.objectContaining({ ...mockRequestBody }));
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      updateAttackDiscoverySchedulesPublicRequest('schedule-2', mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle `dataClient.updateSchedule` error', async () => {
    (updateAttackDiscoverySchedule as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      updateAttackDiscoverySchedulesPublicRequest('schedule-3', mockRequestBody),
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
          updateAttackDiscoverySchedulesPublicRequest('schedule-1', mockRequestBody),
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
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValueOnce({
          attackDiscoveryPublicApiEnabled: true,
        });
      });

      it('proceeds with normal execution when the public API is enabled', async () => {
        const response = await server.inject(
          updateAttackDiscoverySchedulesPublicRequest('schedule-1', mockRequestBody),
          requestContextMock.convertContext(context)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual(expect.objectContaining({ ...mockRequestBody }));
      });
    });
  });
});
