/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { ActionDetails } from '../../../common/endpoint/types';
import { createMockEndpointAppContextService } from '../../endpoint/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../common/endpoint/service/authz/mocks';
import { getActionDetailsById } from '../../endpoint/services/actions';
import {
  getAuthorizedResponseActionsClient,
  pollResponseAction,
} from './response_actions_step_utils';

jest.mock('../../endpoint/services/actions', () => ({
  getActionDetailsById: jest.fn(),
}));

const mockGetActionDetailsById = getActionDetailsById as jest.MockedFunction<
  typeof getActionDetailsById
>;

const SPACE_ID = 'default';
const ACTION_ID = 'test-action-id';

const makeContext = () =>
  ({
    contextManager: {
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: SPACE_ID } }),
      getFakeRequest: jest.fn().mockReturnValue({}),
    },
  } as unknown as Parameters<typeof getAuthorizedResponseActionsClient>[1]);

const makePollContext = (state: unknown) =>
  ({
    state,
    attempt: 0,
    contextManager: {
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: SPACE_ID } }),
    },
  } as unknown as Parameters<typeof pollResponseAction>[1]);

const makeActionDetails = (
  overrides: Pick<ActionDetails, 'status' | 'isCompleted' | 'wasSuccessful'>
): ActionDetails => ({
  id: ACTION_ID,
  agents: ['agent-1'],
  hosts: { 'agent-1': { name: 'test-host' } },
  command: 'isolate',
  isExpired: false,
  wasCanceled: false,
  errors: undefined,
  startedAt: '2024-01-01T00:00:00.000Z',
  completedAt: undefined,
  agentState: {},
  createdBy: 'test-user',
  agentType: 'endpoint',
  ...overrides,
});

describe('getAuthorizedResponseActionsClient', () => {
  let mockEndpointService: ReturnType<typeof createMockEndpointAppContextService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndpointService = createMockEndpointAppContextService();
  });

  it('returns the client when the user holds the required privilege', async () => {
    const mockClient = { isolate: jest.fn() };
    (mockEndpointService.getInternalResponseActionsClient as jest.Mock).mockReturnValue(mockClient);

    const result = await getAuthorizedResponseActionsClient(
      mockEndpointService,
      makeContext(),
      'canIsolateHost'
    );

    expect(result.client).toBe(mockClient);
  });

  it('builds the client with the correct options', async () => {
    const mockUsername = 'test-user';
    (mockEndpointService.getCurrentUsername as jest.Mock).mockReturnValue(mockUsername);

    await getAuthorizedResponseActionsClient(mockEndpointService, makeContext(), 'canIsolateHost');

    expect(mockEndpointService.getInternalResponseActionsClient).toHaveBeenCalledWith({
      spaceId: SPACE_ID,
      username: mockUsername,
      agentType: 'endpoint',
      isAutomated: false,
    });
  });

  it('throws ExecutionError with PermissionError when the user lacks the privilege', async () => {
    (mockEndpointService.getEndpointAuthz as jest.Mock).mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canIsolateHost: false })
    );

    await expect(
      getAuthorizedResponseActionsClient(mockEndpointService, makeContext(), 'canIsolateHost')
    ).rejects.toThrow(ExecutionError);

    await expect(
      getAuthorizedResponseActionsClient(mockEndpointService, makeContext(), 'canIsolateHost')
    ).rejects.toMatchObject({ type: 'PermissionError' });
  });

  it('includes the authzKey in the PermissionError message', async () => {
    (mockEndpointService.getEndpointAuthz as jest.Mock).mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canKillProcess: false })
    );

    let thrown: ExecutionError | undefined;
    try {
      await getAuthorizedResponseActionsClient(
        mockEndpointService,
        makeContext(),
        'canKillProcess'
      );
    } catch (e) {
      thrown = e as ExecutionError;
    }

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown?.message).toContain('canKillProcess');
  });
});

describe('pollResponseAction', () => {
  let mockEndpointService: ReturnType<typeof createMockEndpointAppContextService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndpointService = createMockEndpointAppContextService();
  });

  it('throws ExecutionError with ValidationError when action_id is missing', async () => {
    await expect(
      pollResponseAction(mockEndpointService, makePollContext(undefined), 'Test action')
    ).rejects.toThrow(ExecutionError);

    await expect(
      pollResponseAction(mockEndpointService, makePollContext({}), 'Test action')
    ).rejects.toMatchObject({ type: 'ValidationError' });
  });

  it('returns undefined when the action has not completed yet', async () => {
    mockGetActionDetailsById.mockResolvedValue(
      makeActionDetails({ status: 'pending', isCompleted: false, wasSuccessful: false })
    );

    const result = await pollResponseAction(
      mockEndpointService,
      makePollContext({ action_id: ACTION_ID }),
      'Test action'
    );

    expect(result).toBeUndefined();
  });

  it('returns the output shape with a success message when the action succeeds', async () => {
    mockGetActionDetailsById.mockResolvedValue(
      makeActionDetails({ status: 'successful', isCompleted: true, wasSuccessful: true })
    );

    const result = await pollResponseAction(
      mockEndpointService,
      makePollContext({ action_id: ACTION_ID }),
      'Host isolation'
    );

    expect(result).toEqual({
      output: {
        action_id: ACTION_ID,
        status: 'successful',
        was_successful: true,
        message: expect.stringContaining('Host isolation'),
      },
    });
    expect(result?.output.message).toContain('completed successfully');
  });

  it('returns the output shape with a failure message when the action fails', async () => {
    mockGetActionDetailsById.mockResolvedValue(
      makeActionDetails({ status: 'failed', isCompleted: true, wasSuccessful: false })
    );

    const result = await pollResponseAction(
      mockEndpointService,
      makePollContext({ action_id: ACTION_ID }),
      'Kill-process action'
    );

    expect(result).toEqual({
      output: {
        action_id: ACTION_ID,
        status: 'failed',
        was_successful: false,
        message: expect.stringContaining('Kill-process action'),
      },
    });
    expect(result?.output.message).toContain('failed');
  });

  it('interpolates the actionLabel into the message', async () => {
    mockGetActionDetailsById.mockResolvedValue(
      makeActionDetails({ status: 'successful', isCompleted: true, wasSuccessful: true })
    );

    const result = await pollResponseAction(
      mockEndpointService,
      makePollContext({ action_id: ACTION_ID }),
      'Suspend-process action'
    );

    expect(result?.output.message).toContain('Suspend-process action');
    expect(result?.output.message).toContain(ACTION_ID);
  });

  it('passes the correct spaceId and actionId to getActionDetailsById', async () => {
    mockGetActionDetailsById.mockResolvedValue(
      makeActionDetails({ status: 'successful', isCompleted: true, wasSuccessful: true })
    );

    await pollResponseAction(
      mockEndpointService,
      makePollContext({ action_id: ACTION_ID }),
      'Test action'
    );

    expect(mockGetActionDetailsById).toHaveBeenCalledWith(mockEndpointService, SPACE_ID, ACTION_ID);
  });
});
