/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionListApiResponse,
  ActionDetails,
  ResponseActionScript,
  EndpointAuthz,
} from '../../../../../common/endpoint/types';
import {
  transformPendingActionsToOptions,
  transformCustomScriptsToOptions,
  checkActionCancelPermission,
} from './utils';

describe('utils', () => {
  describe('transformPendingActionsToOptions', () => {
    const mockActionDetails: ActionDetails = {
      id: 'action-123-abc',
      command: 'isolate',
      agents: ['agent-1'],
      hosts: {
        'agent-1': { name: 'test-host' },
      },
      agentState: {
        'agent-1': {
          isCompleted: false,
          wasSuccessful: false,
          errors: undefined,
          completedAt: undefined,
        },
      },
      isExpired: false,
      isCompleted: false,
      wasSuccessful: false,
      startedAt: '2023-11-01T10:00:00.000Z',
      completedAt: undefined,
      status: 'pending',
      createdBy: 'test-user',
      agentType: 'endpoint',
      errors: undefined,
    };

    const mockApiResponse: ActionListApiResponse = {
      page: 1,
      pageSize: 10,
      total: 1,
      data: [mockActionDetails],
      agentTypes: [],
      elasticAgentIds: undefined,
      endDate: undefined,
      startDate: undefined,
      userIds: undefined,
      commands: undefined,
      statuses: undefined,
    };

    it('should return empty array when response is empty', () => {
      const result = transformPendingActionsToOptions([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when response is null/undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(transformPendingActionsToOptions(null as any)).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(transformPendingActionsToOptions(undefined as any)).toEqual([]);
    });

    it('should return empty array when response data is empty', () => {
      const emptyResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: [],
      };
      const result = transformPendingActionsToOptions([emptyResponse]);
      expect(result).toEqual([]);
    });

    it('should transform pending actions to options with correct label format', () => {
      const result = transformPendingActionsToOptions([mockApiResponse]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'isolate - action-123-abc',
        value: 'action-123-abc',
        checked: undefined,
      });
    });

    it('should include action details and description in options', () => {
      const result = transformPendingActionsToOptions([mockApiResponse]);

      expect(result[0]).toMatchObject({
        actionItem: mockActionDetails,
        description: expect.stringContaining('isolate on test-host by test-user at'),
      });
    });

    it('should handle selected value correctly', () => {
      const result = transformPendingActionsToOptions([mockApiResponse], 'action-123-abc');

      expect(result[0]).toMatchObject({
        label: 'isolate - action-123-abc',
        value: 'action-123-abc',
        checked: 'on',
      });
    });

    it('should handle multiple pending actions', () => {
      const secondAction: ActionDetails = {
        ...mockActionDetails,
        id: 'action-456-def',
        command: 'unisolate',
        startedAt: '2023-11-01T11:00:00.000Z',
      };

      const multipleActionsResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: [mockActionDetails, secondAction],
        total: 2,
      };

      const result = transformPendingActionsToOptions([multipleActionsResponse]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        label: 'isolate - action-123-abc',
        value: 'action-123-abc',
      });
      expect(result[1]).toMatchObject({
        label: 'release - action-456-def',
        value: 'action-456-def',
      });
    });

    it('should map unisolate command to release display name', () => {
      const unisolateAction: ActionDetails = {
        ...mockActionDetails,
        id: 'action-unisolate-123',
        command: 'unisolate',
      };

      const unisolateResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: [unisolateAction],
      };

      const result = transformPendingActionsToOptions([unisolateResponse]);

      expect(result[0]).toMatchObject({
        label: 'release - action-unisolate-123',
        value: 'action-unisolate-123',
      });
      expect(result[0].description).toContain('release on test-host by test-user at');
    });

    it('should handle unknown host gracefully', () => {
      const actionWithoutHost: ActionDetails = {
        ...mockActionDetails,
        hosts: {},
      };

      const responseWithUnknownHost: ActionListApiResponse = {
        ...mockApiResponse,
        data: [actionWithoutHost],
      };

      const result = transformPendingActionsToOptions([responseWithUnknownHost]);

      expect(result[0].description).toContain('isolate on Unknown host by test-user at');
    });

    it('should handle edge cases with command names', () => {
      const edgeCaseActions: ActionDetails[] = [
        {
          ...mockActionDetails,
          id: 'short',
          command: 'get-file',
        },
        {
          ...mockActionDetails,
          id: 'very-long-action-id-that-might-cause-ui-issues-123456789',
          command: 'execute',
        },
      ];

      const edgeCaseResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: edgeCaseActions,
        total: 2,
      };

      const result = transformPendingActionsToOptions([edgeCaseResponse]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        label: 'get-file - short',
        value: 'short',
      });
      expect(result[1]).toMatchObject({
        label: 'execute - very-long-action-id-that-might-cause-ui-issues-123456789',
        value: 'very-long-action-id-that-might-cause-ui-issues-123456789',
      });
    });

    it('should format timestamp correctly in description', () => {
      const result = transformPendingActionsToOptions([mockApiResponse]);

      // The timestamp should be formatted as a locale string
      expect(result[0].description).toMatch(/isolate on test-host by test-user at \d+\/\d+\/\d+/);
    });

    describe('with privilege checking', () => {
      const privilegeCheckerAllowed = () => ({ canCancel: true });
      const privilegeCheckerDenied = (command: string) => ({
        canCancel: false,
        reason: `No permission to cancel ${command}`,
      });

      it('should set disabled: false and no tooltip for allowed actions', () => {
        const result = transformPendingActionsToOptions(
          [mockApiResponse],
          undefined,
          privilegeCheckerAllowed
        );

        expect(result[0]).toMatchObject({
          label: 'isolate - action-123-abc',
          value: 'action-123-abc',
          disabled: false,
          toolTipContent: undefined,
        });
      });

      it('should set disabled: true and tooltip for denied actions', () => {
        const result = transformPendingActionsToOptions(
          [mockApiResponse],
          undefined,
          privilegeCheckerDenied
        );

        expect(result[0]).toMatchObject({
          label: 'isolate - action-123-abc',
          value: 'action-123-abc',
          disabled: true,
          toolTipContent: 'No permission to cancel isolate',
        });
      });

      it('should work without privilege checker (defaults to enabled)', () => {
        const result = transformPendingActionsToOptions([mockApiResponse]);

        expect(result[0]).toMatchObject({
          label: 'isolate - action-123-abc',
          value: 'action-123-abc',
          disabled: false,
          toolTipContent: undefined,
        });
      });
    });
  });

  describe('transformCustomScriptsToOptions', () => {
    const mockScript: ResponseActionScript = {
      id: 'script-1',
      name: 'Test Script',
      description: 'A test script for validation',
    };

    it('should transform scripts to options correctly', () => {
      const result = transformCustomScriptsToOptions([mockScript]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'Test Script',
        description: 'A test script for validation',
        data: mockScript,
        checked: undefined,
      });
    });

    it('should mark selected script as checked', () => {
      const result = transformCustomScriptsToOptions([mockScript], 'Test Script');

      expect(result[0]).toMatchObject({
        label: 'Test Script',
        checked: 'on',
      });
    });

    it('should handle empty scripts array', () => {
      const result = transformCustomScriptsToOptions([]);
      expect(result).toEqual([]);
    });
  });

  describe('checkActionCancelPermission', () => {
    const mockEndpointPrivileges: EndpointAuthz = {
      canWriteSecuritySolution: true,
      canReadSecuritySolution: true,
      canAccessFleet: true,
      canReadFleetAgentPolicies: true,
      canReadFleetAgents: true,
      canWriteFleetAgents: true,
      canWriteIntegrationPolicies: true,
      canAccessEndpointManagement: true,
      canAccessEndpointActionsLogManagement: true,
      canCreateArtifactsByPolicy: true,
      canWriteEndpointList: true,
      canReadEndpointList: true,
      canWritePolicyManagement: true,
      canReadPolicyManagement: true,
      canWriteActionsLogManagement: true,
      canReadActionsLogManagement: true,
      canIsolateHost: true,
      canUnIsolateHost: true,
      canKillProcess: true,
      canSuspendProcess: true,
      canGetRunningProcesses: true,
      canAccessResponseConsole: true,
      canWriteExecuteOperations: true,
      canWriteFileOperations: true,
      canWriteScanOperations: true,
      canWriteTrustedApplications: true,
      canReadTrustedApplications: true,
      canWriteTrustedDevices: true,
      canReadTrustedDevices: true,
      canWriteHostIsolationExceptions: true,
      canReadHostIsolationExceptions: true,
      canAccessHostIsolationExceptions: true,
      canDeleteHostIsolationExceptions: true,
      canWriteBlocklist: true,
      canReadBlocklist: true,
      canWriteEventFilters: true,
      canReadEventFilters: true,
      canReadEndpointExceptions: true,
      canWriteEndpointExceptions: true,
      canManageGlobalArtifacts: true,
      canWriteWorkflowInsights: true,
      canReadWorkflowInsights: true,
      canReadAdminData: true,
      canWriteAdminData: true,
    };

    describe('with valid permissions', () => {
      test('returns canCancel: true for isolate command when user has canIsolateHost permission', () => {
        const result = checkActionCancelPermission('isolate', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });

      test('returns canCancel: true for unisolate command when user has canUnIsolateHost permission', () => {
        const result = checkActionCancelPermission('unisolate', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });

      test('returns canCancel: true for kill-process command when user has canKillProcess permission', () => {
        const result = checkActionCancelPermission('kill-process', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });

      test('returns canCancel: true for execute command when user has canWriteExecuteOperations permission', () => {
        const result = checkActionCancelPermission('execute', mockEndpointPrivileges);
        expect(result).toEqual({ canCancel: true });
      });
    });

    describe('without required permissions', () => {
      test('returns canCancel: false for isolate command when user lacks canIsolateHost permission', () => {
        const privilegesWithoutIsolate = {
          ...mockEndpointPrivileges,
          canIsolateHost: false,
        };

        const result = checkActionCancelPermission('isolate', privilegesWithoutIsolate);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run isolate action");
      });

      test('returns canCancel: false for kill-process command when user lacks canKillProcess permission', () => {
        const privilegesWithoutKillProcess = {
          ...mockEndpointPrivileges,
          canKillProcess: false,
        };

        const result = checkActionCancelPermission('kill-process', privilegesWithoutKillProcess);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run kill-process action");
      });

      test('returns canCancel: false for get-file command when user lacks canWriteFileOperations permission', () => {
        const privilegesWithoutFileOps = {
          ...mockEndpointPrivileges,
          canWriteFileOperations: false,
        };

        const result = checkActionCancelPermission('get-file', privilegesWithoutFileOps);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain("You don't have permission to run get-file action");
      });
    });

    describe('with unknown commands', () => {
      test('returns canCancel: false for unknown command', () => {
        const result = checkActionCancelPermission('unknown-command', mockEndpointPrivileges);

        expect(result.canCancel).toBe(false);
        expect(result.reason).toContain(
          'Unable to verify permissions for unknown-command action cancellation'
        );
      });
    });
  });
});
