/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';

import { getWorkflowExecutionsTracking } from '../pipeline_data/helpers/get_workflow_executions_tracking';
import type { GetExecutionTrackingResponse } from './get_execution_tracking';

jest.mock('../pipeline_data/helpers/get_workflow_executions_tracking');
const mockGetWorkflowExecutionsTracking = getWorkflowExecutionsTracking as jest.MockedFunction<
  typeof getWorkflowExecutionsTracking
>;

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';

const validTracking: WorkflowExecutionsTracking = {
  alertRetrieval: [
    {
      workflowId: 'workflow-default-alert-retrieval',
      workflowRunId: 'alert-retrieval-run-id',
    },
  ],
  generation: {
    workflowId: 'workflow-generation',
    workflowRunId: 'generation-run-id',
  },
  validation: {
    workflowId: 'workflow-validate',
    workflowRunId: 'validation-run-id',
  },
};

describe('getExecutionTracking response transformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transforms camelCase WorkflowExecutionsTracking to snake_case response', () => {
    const expected: GetExecutionTrackingResponse = {
      alert_retrieval: [
        {
          workflow_id: 'workflow-default-alert-retrieval',
          workflow_run_id: 'alert-retrieval-run-id',
        },
      ],
      generation: {
        workflow_id: 'workflow-generation',
        workflow_run_id: 'generation-run-id',
      },
      validation: {
        workflow_id: 'workflow-validate',
        workflow_run_id: 'validation-run-id',
      },
    };

    const result: GetExecutionTrackingResponse = {
      alert_retrieval:
        validTracking.alertRetrieval?.map((entry) => ({
          workflow_id: entry.workflowId,
          workflow_run_id: entry.workflowRunId,
        })) ?? null,
      generation:
        validTracking.generation != null
          ? {
              workflow_id: validTracking.generation.workflowId,
              workflow_run_id: validTracking.generation.workflowRunId,
            }
          : null,
      validation:
        validTracking.validation != null
          ? {
              workflow_id: validTracking.validation.workflowId,
              workflow_run_id: validTracking.validation.workflowRunId,
            }
          : null,
    };

    expect(result).toEqual(expected);
  });

  it('handles null alertRetrieval, generation, and validation', () => {
    const trackingWithNulls: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      generation: null,
      validation: null,
    };

    const result: GetExecutionTrackingResponse = {
      alert_retrieval:
        trackingWithNulls.alertRetrieval?.map((entry) => ({
          workflow_id: entry.workflowId,
          workflow_run_id: entry.workflowRunId,
        })) ?? null,
      generation: null,
      validation: null,
    };

    expect(result).toEqual({
      alert_retrieval: null,
      generation: null,
      validation: null,
    });
  });

  it('delegates to getWorkflowExecutionsTracking', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue(validTracking);

    const result = await getWorkflowExecutionsTracking({
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      executionId: 'test-execution-id',
    });

    expect(mockGetWorkflowExecutionsTracking).toHaveBeenCalledWith({
      esClient: expect.anything(),
      eventLogIndex: '.kibana-event-log-test',
      executionId: 'test-execution-id',
    });
    expect(result).toEqual(validTracking);
  });

  it('returns null when tracking is not found', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue(null);

    const result = await getWorkflowExecutionsTracking({
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      executionId: 'nonexistent-execution-id',
    });

    expect(result).toBeNull();
  });
});

describe('registerGetExecutionTrackingRoute feature flag', () => {
  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const { registerGetExecutionTrackingRoute } = await import('./get_execution_tracking');

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetExecutionTrackingRoute(router, {} as never, {
      getEventLogIndex: jest.fn().mockResolvedValue('.kibana-event-log-test'),
      getStartServices: jest.fn().mockResolvedValue({ coreStart: {}, pluginsStart: {} }),
    });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ params: { execution_id: 'test-id' } });
    const response = httpServerMock.createResponseFactory();

    const result = await handler({}, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });
});
