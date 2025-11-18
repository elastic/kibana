/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { CreateAttackDiscoverySchedulesRequestBody } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { createAttackDiscoverySchedulesRoute } from './create';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { createAttackDiscoverySchedulesPublicRequest } from '../../../../../__mocks__/request';
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
const mockRequestBody: CreateAttackDiscoverySchedulesRequestBody = {
  name: 'Test Schedule 1',
  schedule: {
    interval: '10m',
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

describe('createAttackDiscoverySchedulesRoute', () => {
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
    createAttackDiscoverySchedulesRoute(server.router);
    createAttackDiscoverySchedule.mockResolvedValue(getAttackDiscoveryScheduleMock());
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      createAttackDiscoverySchedulesPublicRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        created_by: expect.any(String),
        updated_by: expect.any(String),
        enabled: expect.any(Boolean),
        params: expect.objectContaining({
          alerts_index_pattern: expect.any(String),
          api_config: expect.any(Object),
          end: expect.any(String),
          start: expect.any(String),
          size: expect.any(Number),
        }),
        schedule: expect.objectContaining({
          interval: expect.any(String),
        }),
        actions: expect.any(Array),
      })
    );
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      createAttackDiscoverySchedulesPublicRequest(mockRequestBody),
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
      createAttackDiscoverySchedulesPublicRequest(mockRequestBody),
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

        createAttackDiscoverySchedulesRoute(featureFlagServer.router);
      });

      it('returns a 403 response when the public API is disabled', async () => {
        const response = await featureFlagServer.inject(
          createAttackDiscoverySchedulesPublicRequest(mockRequestBody),
          requestContextMock.convertContext(featureFlagContext)
        );

        expect(response.status).toEqual(403);
        expect(response.body).toEqual({
          message: {
            error: 'Attack discovery public API is disabled',
            success: false,
          },
          status_code: 403,
        });
      });

      it('responds with status code 403 in the body when disabled', async () => {
        const response = await featureFlagServer.inject(
          createAttackDiscoverySchedulesPublicRequest(mockRequestBody),
          requestContextMock.convertContext(featureFlagContext)
        );

        expect(response.status).toEqual(403);
        expect(response.body).toHaveProperty('status_code', 403);
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

        createAttackDiscoverySchedule.mockResolvedValue(getAttackDiscoveryScheduleMock());

        featureFlagContext.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(
          mockSchedulingDataClient
        );
        (performChecks as jest.Mock).mockResolvedValue({
          isSuccess: true,
        });
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
          attackDiscoveryPublicApiEnabled: true,
        });

        createAttackDiscoverySchedulesRoute(featureFlagServer.router);
      });

      it('proceeds with normal execution when the public API is enabled', async () => {
        const response = await featureFlagServer.inject(
          createAttackDiscoverySchedulesPublicRequest(mockRequestBody),
          requestContextMock.convertContext(featureFlagContext)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            created_at: expect.any(String),
            updated_at: expect.any(String),
            created_by: expect.any(String),
            updated_by: expect.any(String),
            enabled: expect.any(Boolean),
            params: expect.objectContaining({
              alerts_index_pattern: expect.any(String),
              api_config: expect.any(Object),
              end: expect.any(String),
              start: expect.any(String),
              size: expect.any(Number),
            }),
            schedule: expect.objectContaining({
              interval: expect.any(String),
            }),
            actions: expect.any(Array),
          })
        );
      });
    });
  });
});
