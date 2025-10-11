/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MicrosoftDefenderEndpointMachineAction } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import type {
  LogsEndpointAction,
  MicrosoftDefenderEndpointActionRequestCommonMeta,
} from '../../../../../../../../common/endpoint/types';
import {
  calculateMachineActionState,
  sortActionRequests,
  isPartialCancelScenario,
  processCancelAction,
} from './utils';

describe('MicrosoftDefenderEndpoint Utils', () => {
  describe('calculateMachineActionState', () => {
    const baseMachineAction: MicrosoftDefenderEndpointMachineAction = {
      id: '5382f7ea-7557-4ab7-9782-d50480024a4e',
      type: 'Isolate',
      scope: 'Selective',
      requestor: 'Analyst@TestPrd.onmicrosoft.com',
      requestorComment: 'test comment',
      requestSource: '',
      status: 'Succeeded',
      machineId: '1-2-3',
      computerDnsName: 'desktop-test',
      creationDateTimeUtc: '2019-01-02T14:39:38.2262283Z',
      lastUpdateDateTimeUtc: '2019-01-02T14:40:44.6596267Z',
      externalID: 'abc',
      commands: [],
      cancellationRequestor: '',
      cancellationComment: '',
      cancellationDateTimeUtc: '',
      title: '',
    };

    it('should return pending=false, error=true for Failed status', () => {
      const machineAction = { ...baseMachineAction, status: 'Failed' as const };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: false,
        isError: true,
        message:
          'Response action Failed (Microsoft Defender for Endpoint machine action ID: 5382f7ea-7557-4ab7-9782-d50480024a4e)',
      });
    });

    it('should return pending=false, error=true for TimeOut status', () => {
      const machineAction = { ...baseMachineAction, status: 'TimeOut' as const };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: false,
        isError: true,
        message:
          'Response action TimeOut (Microsoft Defender for Endpoint machine action ID: 5382f7ea-7557-4ab7-9782-d50480024a4e)',
      });
    });

    it('should return pending=false, error=true for Cancelled status with cancellation info', () => {
      const machineAction = {
        ...baseMachineAction,
        status: 'Cancelled' as const,
        cancellationRequestor: 'admin@example.com',
        cancellationComment: 'Action was cancelled by administrator',
      };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: false,
        isError: true,
        message:
          'Response action was canceled by [admin@example.com] (Microsoft Defender for Endpoint machine action ID: 5382f7ea-7557-4ab7-9782-d50480024a4e): Action was cancelled by administrator',
      });
    });

    it('should return pending=false, error=true for Cancelled status without cancellation comment', () => {
      const machineAction = {
        ...baseMachineAction,
        status: 'Cancelled' as const,
        cancellationRequestor: 'admin@example.com',
        cancellationComment: '',
      };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: false,
        isError: true,
        message:
          'Response action was canceled by [admin@example.com] (Microsoft Defender for Endpoint machine action ID: 5382f7ea-7557-4ab7-9782-d50480024a4e)',
      });
    });

    it('should return pending=false, error=false for Succeeded status', () => {
      const machineAction = { ...baseMachineAction, status: 'Succeeded' as const };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: false,
        isError: false,
        message: '',
      });
    });

    it('should return pending=true, error=false for Pending status', () => {
      const machineAction = { ...baseMachineAction, status: 'Pending' as const };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: true,
        isError: false,
        message: '',
      });
    });

    it('should return pending=true, error=false for InProgress status', () => {
      const machineAction = { ...baseMachineAction, status: 'InProgress' as const };
      const result = calculateMachineActionState(machineAction);

      expect(result).toEqual({
        isPending: true,
        isError: false,
        message: '',
      });
    });

    it('should handle empty cancellationRequestor gracefully', () => {
      const machineAction = {
        ...baseMachineAction,
        status: 'Cancelled' as const,
        cancellationRequestor: '',
        cancellationComment: 'Test comment',
      };
      const result = calculateMachineActionState(machineAction);

      expect(result.isPending).toBe(false);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('was canceled by []');
    });
  });

  describe('sortActionRequests', () => {
    const createMockAction = (
      command: 'isolate' | 'cancel',
      actionId: string
    ): LogsEndpointAction<undefined, {}, MicrosoftDefenderEndpointActionRequestCommonMeta> => ({
      '@timestamp': '2023-07-07T12:00:00.000Z',
      agent: {
        id: ['agent-1'],
        policy: [],
      },
      EndpointActions: {
        action_id: actionId,
        data: {
          command,
          comment: 'test comment',
          hosts: {},
          parameters: undefined,
        },
        expiration: '2023-07-08T12:00:00.000Z',
        input_type: 'microsoft_defender_endpoint',
        type: 'INPUT_ACTION',
      },
      user: { id: 'test-user' },
      originSpaceId: 'default',
      tags: [],
      meta: { machineActionId: 'test-machine-action-id' },
    });

    it('should put original actions before cancel actions', () => {
      const cancelAction = createMockAction('cancel', 'cancel-action-1');
      const isolateAction = createMockAction('isolate', 'isolate-action-1');
      const anotherCancelAction = createMockAction('cancel', 'cancel-action-2');

      const input = [cancelAction, isolateAction, anotherCancelAction];
      const result = sortActionRequests(input);

      expect(result).toEqual([isolateAction, cancelAction, anotherCancelAction]);
    });

    it('should maintain order among same action types', () => {
      const isolateAction1 = createMockAction('isolate', 'isolate-action-1');
      const isolateAction2 = createMockAction('isolate', 'isolate-action-2');
      const cancelAction1 = createMockAction('cancel', 'cancel-action-1');
      const cancelAction2 = createMockAction('cancel', 'cancel-action-2');

      const input = [cancelAction1, isolateAction1, cancelAction2, isolateAction2];
      const result = sortActionRequests(input);

      expect(result).toEqual([isolateAction1, isolateAction2, cancelAction1, cancelAction2]);
    });

    it('should handle empty array', () => {
      const result = sortActionRequests([]);
      expect(result).toEqual([]);
    });

    it('should handle array with only cancel actions', () => {
      const cancelAction1 = createMockAction('cancel', 'cancel-action-1');
      const cancelAction2 = createMockAction('cancel', 'cancel-action-2');

      const input = [cancelAction1, cancelAction2];
      const result = sortActionRequests(input);

      expect(result).toEqual([cancelAction1, cancelAction2]);
    });

    it('should handle array with only original actions', () => {
      const isolateAction1 = createMockAction('isolate', 'isolate-action-1');
      const isolateAction2 = createMockAction('isolate', 'isolate-action-2');

      const input = [isolateAction1, isolateAction2];
      const result = sortActionRequests(input);

      expect(result).toEqual([isolateAction1, isolateAction2]);
    });
  });

  describe('isPartialCancelScenario', () => {
    const baseMachineAction: MicrosoftDefenderEndpointMachineAction = {
      id: '5382f7ea-7557-4ab7-9782-d50480024a4e',
      type: 'LiveResponse',
      scope: 'Selective',
      requestor: 'Analyst@TestPrd.onmicrosoft.com',
      requestorComment: 'test comment',
      requestSource: '',
      status: 'Cancelled',
      machineId: '1-2-3',
      computerDnsName: 'desktop-test',
      creationDateTimeUtc: '2019-01-02T14:39:38.2262283Z',
      lastUpdateDateTimeUtc: '2019-01-02T14:40:44.6596267Z',
      externalID: 'abc',
      commands: [],
      cancellationRequestor: 'admin@example.com',
      cancellationComment: 'cancelled via API',
      cancellationDateTimeUtc: '2019-01-02T14:40:00.0000000Z',
      title: '',
    };

    it('should return true when command is Completed and has endTime', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [
          {
            index: 0,
            startTime: '2025-07-07T18:50:10.186354Z',
            endTime: '2025-07-07T18:50:21.811356Z',
            commandStatus: 'Completed' as const,
            errors: [],
            command: {
              type: 'RunScript' as const,
              params: [],
            },
          },
        ],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(true);
    });

    it('should return false when command is Completed but has no endTime', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [
          {
            index: 0,
            startTime: '2025-07-07T18:50:10.186354Z',
            endTime: '', // No end time
            commandStatus: 'Completed' as const,
            errors: [],
            command: {
              type: 'RunScript' as const,
              params: [],
            },
          },
        ],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(false);
    });

    it('should return false when command is not Completed', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [
          {
            index: 0,
            startTime: '2025-07-07T18:50:10.186354Z',
            endTime: '2025-07-07T18:50:21.811356Z',
            commandStatus: 'InProgress' as const,
            errors: [],
            command: {
              type: 'RunScript' as const,
              params: [],
            },
          },
        ],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(false);
    });

    it('should return false when no commands exist', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(false);
    });

    it('should return false when commands array is empty', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(false);
    });

    it('should handle empty endTime gracefully', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [
          {
            index: 0,
            startTime: '2025-07-07T18:50:10.186354Z',
            endTime: '',
            commandStatus: 'Completed' as const,
            errors: [],
            command: {
              type: 'RunScript' as const,
              params: [],
            },
          },
        ],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(false);
    });

    it('should handle missing endTime gracefully', () => {
      const machineAction = {
        ...baseMachineAction,
        commands: [
          {
            index: 0,
            startTime: '2025-07-07T18:50:10.186354Z',
            endTime: '',
            commandStatus: 'InProgress' as const,
            errors: [],
            command: {
              type: 'RunScript' as const,
              params: [],
            },
          },
        ],
      };

      const result = isPartialCancelScenario(machineAction);
      expect(result).toBe(false);
    });
  });

  describe('processCancelAction', () => {
    const baseMachineAction: MicrosoftDefenderEndpointMachineAction = {
      id: '5382f7ea-7557-4ab7-9782-d50480024a4e',
      type: 'LiveResponse',
      scope: 'Selective',
      requestor: 'Analyst@TestPrd.onmicrosoft.com',
      requestorComment: 'test comment',
      requestSource: '',
      status: 'Cancelled',
      machineId: '1-2-3',
      computerDnsName: 'desktop-test',
      creationDateTimeUtc: '2019-01-02T14:39:38.2262283Z',
      lastUpdateDateTimeUtc: '2019-01-02T14:40:44.6596267Z',
      externalID: 'abc',
      commands: [],
      cancellationRequestor: 'admin@example.com',
      cancellationComment: 'cancelled via API',
      cancellationDateTimeUtc: '2019-01-02T14:40:00.0000000Z',
      title: '',
    };

    describe('when cancelAlreadyProcessed is true', () => {
      it('should return error for duplicate cancel attempt', () => {
        const result = processCancelAction(baseMachineAction, true);

        expect(result).toEqual({
          actionError: {
            message:
              'Cancel request failed because the target action has already been cancelled or completed.',
          },
          cancelProcessed: false,
        });
      });
    });

    describe('when status is Cancelled with cancellationRequestor', () => {
      it('should return success for successful cancel without partial scenario', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Cancelled' as const,
          cancellationRequestor: 'admin@example.com',
          commands: [
            {
              index: 0,
              startTime: '2025-07-07T18:50:10.186354Z',
              endTime: '', // No end time - not completed
              commandStatus: 'InProgress' as const,
              errors: [],
              command: {
                type: 'RunScript' as const,
                params: [],
              },
            },
          ],
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });

      it('should return error for partial cancel scenario (action completed despite cancel)', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Cancelled' as const,
          cancellationRequestor: 'admin@example.com',
          commands: [
            {
              index: 0,
              startTime: '2025-07-07T18:50:10.186354Z',
              endTime: '2025-07-07T18:50:21.811356Z', // Has end time - completed
              commandStatus: 'Completed' as const,
              errors: [],
              command: {
                type: 'RunScript' as const,
                params: [],
              },
            },
          ],
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: {
            message:
              'Cancel request was processed but the action had already completed. The action finished before it could be cancelled.',
          },
          cancelProcessed: true,
        });
      });
    });

    describe('when status is Succeeded', () => {
      it('should return error for action already completed', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Succeeded' as const,
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: {
            message:
              'Cannot cancel action because it has already completed. The action finished before the cancel request could be processed.',
          },
          cancelProcessed: false,
        });
      });
    });

    describe('when status is Failed', () => {
      it('should return error for action already failed', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Failed' as const,
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: {
            message:
              'Cannot cancel action because it has already completed. The action finished before the cancel request could be processed.',
          },
          cancelProcessed: false,
        });
      });
    });

    describe('when status is Pending or InProgress', () => {
      it('should return success for pending action', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Pending' as const,
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });

      it('should return success for in-progress action', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'InProgress' as const,
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });
    });

    describe('edge cases', () => {
      it('should handle missing cancellationRequestor for Cancelled status', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Cancelled' as const,
          cancellationRequestor: '',
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });

      it('should handle empty cancellationRequestor for Cancelled status', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Cancelled' as const,
          cancellationRequestor: '',
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });

      it('should handle default case for unhandled status', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'Pending' as const,
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });

      it('should handle TimeOut status like other completed statuses', () => {
        const machineAction = {
          ...baseMachineAction,
          status: 'TimeOut' as const,
        };

        const result = processCancelAction(machineAction, false);

        expect(result).toEqual({
          actionError: undefined,
          cancelProcessed: true,
        });
      });
    });

    describe('integration scenarios', () => {
      it('should handle multiple cancel attempts on same machine action', () => {
        // First cancel attempt
        const firstResult = processCancelAction(baseMachineAction, false);
        expect(firstResult.cancelProcessed).toBe(true);

        // Second cancel attempt (should be rejected)
        const secondResult = processCancelAction(baseMachineAction, true);
        expect(secondResult).toEqual({
          actionError: {
            message:
              'Cancel request failed because the target action has already been cancelled or completed.',
          },
          cancelProcessed: false,
        });
      });

      it('should correctly identify race condition scenarios', () => {
        // Cancel was requested but action completed anyway
        const partialCancelMachineAction = {
          ...baseMachineAction,
          status: 'Cancelled' as const,
          cancellationRequestor: 'admin@example.com',
          commands: [
            {
              index: 0,
              startTime: '2025-07-07T18:50:10.186354Z',
              endTime: '2025-07-07T18:50:21.811356Z',
              commandStatus: 'Completed' as const,
              errors: [],
              command: {
                type: 'RunScript' as const,
                params: [],
              },
            },
          ],
        };

        const result = processCancelAction(partialCancelMachineAction, false);

        expect(result.actionError?.message).toContain(
          'Cancel request was processed but the action had already completed'
        );
        expect(result.cancelProcessed).toBe(true);
      });
    });
  });
});
