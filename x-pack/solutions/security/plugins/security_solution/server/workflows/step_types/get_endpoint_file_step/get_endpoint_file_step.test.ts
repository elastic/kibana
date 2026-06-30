/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { PollHandlerContext, StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  ACTION_DETAILS_ROUTE,
  CANCEL_ROUTE,
  GET_FILE_ROUTE,
} from '../../../../common/endpoint/constants';
import {
  getEndpointFileInputSchema,
  GetEndpointFileStepId,
} from '../../../../common/workflows/step_types/get_endpoint_file_step/get_endpoint_file_step_common';
import { getEndpointFileStepDefinition } from './get_endpoint_file_step';

const getActionDetailsPath = (actionId: string): string =>
  ACTION_DETAILS_ROUTE.replace('{action_id}', actionId);

const createMockContext = (
  input: Record<string, unknown>,
  state?: Record<string, unknown>
): PollHandlerContext<unknown, unknown, unknown> => {
  return {
    input: getEndpointFileInputSchema.parse(input),
    config: {},
    rawInput: input,
    contextManager: {
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn(),
      callKibanaApi: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: GetEndpointFileStepId,
    state,
    attempt: 0,
  } as unknown as PollHandlerContext<unknown, unknown, unknown>;
};

const createCompletedActionDetails = (overrides: Record<string, unknown> = {}) => ({
  id: 'action-1',
  agents: ['endpoint-1'],
  hosts: { 'endpoint-1': { name: 'host-1' } },
  command: 'get-file',
  isExpired: false,
  isCompleted: true,
  wasSuccessful: true,
  wasCanceled: false,
  errors: undefined,
  startedAt: '2026-06-23T12:36:30.196Z',
  completedAt: '2026-06-23T12:36:36.000Z',
  status: 'successful',
  createdBy: 'elastic',
  agentType: 'endpoint',
  parameters: { path: '/tmp/malware.bin' },
  agentState: {
    'endpoint-1': {
      isCompleted: true,
      wasSuccessful: true,
      wasCanceled: false,
      completedAt: '2026-06-23T12:36:36.000Z',
    },
  },
  outputs: {
    'endpoint-1': {
      type: 'json',
      content: {
        code: 'ra_get-file_success_done',
        zip_size: 2097,
        downloadUri: '/api/endpoint/action/action-1/file/action-1.endpoint-1/download',
        contents: [
          {
            path: '/tmp/malware.bin',
            sha256: 'abc123',
            size: 1234,
            file_name: 'malware.bin',
            type: 'file',
          },
        ],
      },
    },
  },
  ...overrides,
});

describe('getEndpointFileStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts a get-file response action and persists durable state', async () => {
    const context = createMockContext({
      endpoint_id: 'endpoint-1',
      file_path: '/tmp/malware.bin',
      alert_ids: 'alert-1',
      case_ids: ['case-1'],
      comment: 'Retrieve file',
    });

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: { data: { id: 'action-1' } },
    });

    const result = await getEndpointFileStepDefinition.start!(
      context as StepHandlerContext<unknown, unknown>
    );

    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: GET_FILE_ROUTE,
      body: {
        endpoint_ids: ['endpoint-1'],
        parameters: {
          path: '/tmp/malware.bin',
        },
        alert_ids: ['alert-1'],
        case_ids: ['case-1'],
        comment: 'Retrieve file',
      },
    });
    expect(result).toEqual({
      state: {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      },
    });
  });

  it('returns an ExecutionError when the get-file request fails', async () => {
    const context = createMockContext({
      endpoint_id: 'endpoint-1',
      file_path: '/tmp/malware.bin',
    });

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 403,
      body: { message: 'forbidden' },
    });

    const result = await getEndpointFileStepDefinition.start!(
      context as StepHandlerContext<unknown, unknown>
    );

    expect(result).toEqual({ error: expect.any(ExecutionError) });
  });

  it('returns an ExecutionError when the get-file response has no action id', async () => {
    const context = createMockContext({
      endpoint_id: 'endpoint-1',
      file_path: '/tmp/malware.bin',
    });

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: { data: {} },
    });

    const result = await getEndpointFileStepDefinition.start!(
      context as StepHandlerContext<unknown, unknown>
    );

    expect(result).toEqual({ error: expect.any(ExecutionError) });
  });

  it('continues polling while the response action is incomplete', async () => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: {
        data: createCompletedActionDetails({
          isCompleted: false,
          wasSuccessful: false,
          completedAt: undefined,
          status: 'pending',
          outputs: undefined,
        }),
      },
    });

    const result = await getEndpointFileStepDefinition.poll(context);

    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: getActionDetailsPath('action-1'),
    });
    expect(result).toEqual({
      state: {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      },
    });
  });

  it('returns an ExecutionError when fetching action details fails', async () => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 500,
      body: { message: 'server error' },
    });

    const result = await getEndpointFileStepDefinition.poll(context);

    expect(result).toEqual({ error: expect.any(ExecutionError) });
  });

  it.each([
    ['expired', { isExpired: true }],
    ['canceled', { wasCanceled: true, status: 'canceled' }],
  ])('returns an ExecutionError when the response action is %s', async (_, overrides) => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: {
        data: createCompletedActionDetails(overrides),
      },
    });

    const result = await getEndpointFileStepDefinition.poll(context);

    expect(result).toEqual({ error: expect.any(ExecutionError) });
  });

  it('returns the download URI and file metadata when the response action succeeds', async () => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: { data: createCompletedActionDetails() },
    });

    await expect(getEndpointFileStepDefinition.poll(context)).resolves.toEqual({
      output: {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
        download_uri: '/api/endpoint/action/action-1/file/action-1.endpoint-1/download',
        status: 'successful',
        completed_at: '2026-06-23T12:36:36.000Z',
        zip_size: 2097,
        contents: [
          {
            path: '/tmp/malware.bin',
            sha256: 'abc123',
            size: 1234,
            file_name: 'malware.bin',
            type: 'file',
          },
        ],
      },
    });
  });

  it('returns an ExecutionError when the response action fails', async () => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: {
        data: createCompletedActionDetails({
          wasSuccessful: false,
          status: 'failed',
          errors: ['file not found'],
        }),
      },
    });

    const result = await getEndpointFileStepDefinition.poll(context);

    expect(result).toEqual({ error: expect.any(ExecutionError) });
  });

  it('returns an ExecutionError when the completed action has no download URI', async () => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    (context.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
      status: 200,
      body: {
        data: createCompletedActionDetails({
          outputs: {
            'endpoint-1': {
              type: 'json',
              content: {
                code: 'ra_get-file_success_done',
                zip_size: 2097,
                contents: [],
              },
            },
          },
        }),
      },
    });

    const result = await getEndpointFileStepDefinition.poll(context);

    expect(result).toEqual({ error: expect.any(ExecutionError) });
  });

  it('cancels the response action when the workflow is canceled', async () => {
    const context = createMockContext(
      {
        endpoint_id: 'endpoint-1',
        file_path: '/tmp/malware.bin',
      },
      {
        action_id: 'action-1',
        endpoint_id: 'endpoint-1',
      }
    );

    await getEndpointFileStepDefinition.onCancel!(context);

    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: CANCEL_ROUTE,
      body: {
        endpoint_ids: ['endpoint-1'],
        agent_type: 'endpoint',
        parameters: {
          id: 'action-1',
        },
      },
    });
  });

  it('does not cancel when the workflow is canceled before durable state is seeded', async () => {
    const context = createMockContext({
      endpoint_id: 'endpoint-1',
      file_path: '/tmp/malware.bin',
    });

    await getEndpointFileStepDefinition.onCancel!(context);

    expect(context.contextManager.callKibanaApi).not.toHaveBeenCalled();
  });
});
