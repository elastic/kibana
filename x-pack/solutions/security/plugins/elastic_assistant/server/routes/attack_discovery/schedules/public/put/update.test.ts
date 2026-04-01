/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { UpdateAttackDiscoverySchedulesRequestBody } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai/constants';

import { updateAttackDiscoverySchedulesRoute } from './update';
import { serverMock } from '../../../../../__mocks__/server';
import { requestContextMock } from '../../../../../__mocks__/request_context';
import { updateAttackDiscoverySchedulesRequest } from '../../../../../__mocks__/request';
import { getAttackDiscoveryScheduleMock } from '../../../../../__mocks__/attack_discovery_schedules.mock';
import type { AttackDiscoveryScheduleDataClient } from '@kbn/attack-discovery-schedules-common';
import { performChecks } from '../../../../helpers';

jest.mock('../../../../helpers', () => ({
  performChecks: jest.fn(),
}));

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const getAttackDiscoverySchedule = jest.fn();
const updateAttackDiscoverySchedule = jest.fn();
const mockSchedulingDataClient = {
  findSchedules: jest.fn(),
  getSchedule: getAttackDiscoverySchedule,
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
    // Mock performChecks to return success by default
    (performChecks as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
    updateAttackDiscoverySchedulesRoute(server.router);
    // Default: existing schedule has no workflowConfig (pre-FF schedule)
    getAttackDiscoverySchedule.mockResolvedValue(getAttackDiscoveryScheduleMock());
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
      updateAttackDiscoverySchedulesRequest('schedule-1', mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(expect.objectContaining({ ...mockRequestBody }));
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoverySchedulingDataClient.mockResolvedValue(null);
    const response = await server.inject(
      updateAttackDiscoverySchedulesRequest('schedule-2', mockRequestBody),
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
      updateAttackDiscoverySchedulesRequest('schedule-3', mockRequestBody),
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

  it('calls getSchedule before updateSchedule to read existing workflowConfig', async () => {
    await server.inject(
      updateAttackDiscoverySchedulesRequest('schedule-4', mockRequestBody),
      requestContextMock.convertContext(context)
    );

    const getOrder = getAttackDiscoverySchedule.mock.invocationCallOrder[0];
    const updateOrder = updateAttackDiscoverySchedule.mock.invocationCallOrder[0];
    expect(getAttackDiscoverySchedule).toHaveBeenCalledWith('schedule-4');
    expect(getOrder).toBeLessThan(updateOrder);
  });

  it('preserves existing workflowConfig when updating a workflow-mode schedule', async () => {
    const mockWorkflowConfig = {
      alertRetrievalWorkflowIds: ['workflow-id-1'],
      defaultAlertRetrievalMode: 'esql' as const,
      validationWorkflowId: 'validation-1',
    };
    getAttackDiscoverySchedule.mockResolvedValue(
      getAttackDiscoveryScheduleMock({
        params: {
          alertsIndexPattern: '.alerts-security.alerts-default',
          apiConfig: {
            actionTypeId: '.gen-ai',
            connectorId: 'gpt-4o',
            name: 'Mock GPT-4o',
          },
          end: 'now',
          size: 100,
          start: 'now-24h',
          workflowConfig: mockWorkflowConfig,
        },
      })
    );

    await server.inject(
      updateAttackDiscoverySchedulesRequest('schedule-5', mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(updateAttackDiscoverySchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          workflowConfig: mockWorkflowConfig,
        }),
      })
    );
  });

  it('does not set workflowConfig when updating a pre-FF schedule without workflowConfig', async () => {
    // Default mock returns schedule without workflowConfig (set in beforeEach)
    await server.inject(
      updateAttackDiscoverySchedulesRequest('schedule-6', mockRequestBody),
      requestContextMock.convertContext(context)
    );

    const updateCall = updateAttackDiscoverySchedule.mock.calls[0][0];
    expect(updateCall.params.workflowConfig).toBeUndefined();
  });

  it('returns 200 and does not expose workflowConfig in the response body', async () => {
    const mockWorkflowConfig = {
      alertRetrievalWorkflowIds: ['workflow-id-2'],
      defaultAlertRetrievalMode: 'esql' as const,
      validationWorkflowId: 'validation-2',
    };
    getAttackDiscoverySchedule.mockResolvedValue(
      getAttackDiscoveryScheduleMock({
        params: {
          alertsIndexPattern: '.alerts-security.alerts-default',
          apiConfig: {
            actionTypeId: '.gen-ai',
            connectorId: 'gpt-4o',
            name: 'Mock GPT-4o',
          },
          end: 'now',
          size: 100,
          start: 'now-24h',
          workflowConfig: mockWorkflowConfig,
        },
      })
    );

    const response = await server.inject(
      updateAttackDiscoverySchedulesRequest('schedule-7', mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).not.toHaveProperty('params.workflowConfig');
    expect(response.body).not.toHaveProperty('params.workflow_config');
  });
});
