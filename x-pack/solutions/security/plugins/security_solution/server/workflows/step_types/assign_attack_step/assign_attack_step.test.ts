/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignAttackStepDefinition } from './assign_attack_step';
import { assignAttackInputSchema } from '../../../../common/workflows/step_types/assign_attack_step/assign_attack_step_common';
import { ExecutionError } from '@kbn/workflows/server';
import { DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL } from '../../../../common/constants';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

const createMockContext = (input: Record<string, unknown>) => {
  return {
    input: assignAttackInputSchema.parse(input),
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
    stepType: 'security.assignAttack',
  } as unknown as StepHandlerContext<unknown, unknown>;
};

describe('assignAttackStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should call Kibana API successfully with single attack ID and assign users with array', async () => {
      const mockContext = createMockContext({
        ids: 'attack-1',
        assignees_to_add: ['user1'],
        assignees_to_remove: [],
        update_related_alerts: true,
      });
      (mockContext.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
        status: 200,
        body: {},
      });

      const result = await assignAttackStepDefinition.handler(mockContext);

      expect(mockContext.contextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
        body: {
          ids: ['attack-1'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
          update_related_alerts: true,
        },
      });
      expect(result).toEqual({
        output: {
          success: true,
          message: 'Successfully updated assignees for 1 attack(s)',
        },
      });
    });

    it('should call Kibana API successfully with multiple attack IDs and unassign users with array', async () => {
      const mockContext = createMockContext({
        ids: ['attack-1', 'attack-2'],
        assignees_to_add: [],
        assignees_to_remove: ['user2'],
      });
      (mockContext.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
        status: 200,
        body: {},
      });

      const result = await assignAttackStepDefinition.handler(mockContext);

      expect(mockContext.contextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
        body: {
          ids: ['attack-1', 'attack-2'],
          assignees: {
            add: [],
            remove: ['user2'],
          },
          update_related_alerts: false,
        },
      });
      expect(result).toEqual({
        output: {
          success: true,
          message: 'Successfully updated assignees for 2 attack(s)',
        },
      });
    });

    it('should throw ExecutionError if API returns >= 400', async () => {
      const mockContext = createMockContext({
        ids: 'attack-1',
        assignees_to_add: ['user1'],
        assignees_to_remove: [],
      });
      (mockContext.contextManager.callKibanaApi as jest.Mock).mockResolvedValue({
        status: 404,
        body: { error: 'Not found' },
      });

      await expect(assignAttackStepDefinition.handler(mockContext)).rejects.toThrow(ExecutionError);
    });

    it('should throw ExecutionError if API call throws an error', async () => {
      const mockContext = createMockContext({
        ids: 'attack-1',
        assignees_to_add: ['user1'],
        assignees_to_remove: [],
      });
      (mockContext.contextManager.callKibanaApi as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(assignAttackStepDefinition.handler(mockContext)).rejects.toThrow(ExecutionError);
    });
  });
});
