/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointAuthz } from '../../types/authz';
import type { ExperimentalFeatures } from '../../../experimental_features';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../response_actions/constants';
import {
  canCancelResponseAction,
  doesAgentTypeSupportCancel,
  canUserCancelCommand,
} from './cancel_authz_utils';
import { getEndpointAuthzInitialState } from './authz';
import { allowedExperimentalValues } from '../../../experimental_features';

describe('cancel authorization utilities', () => {
  let mockAuthz: EndpointAuthz;
  let mockExperimentalFeatures: ExperimentalFeatures;

  beforeEach(() => {
    mockAuthz = {
      ...getEndpointAuthzInitialState(),
      canWriteSecuritySolution: true,
      canIsolateHost: true,
      canUnIsolateHost: true,
      canKillProcess: true,
      canSuspendProcess: true,
      canGetRunningProcesses: true,
      canWriteFileOperations: true,
      canWriteExecuteOperations: true,
      canWriteScanOperations: true,
    };

    mockExperimentalFeatures = {
      ...allowedExperimentalValues,
      microsoftDefenderEndpointCancelEnabled: true,
    } as ExperimentalFeatures;
  });

  describe('canCancelResponseAction', () => {
    it('should return true when user has permissions and feature is enabled for MDE agent', () => {
      const result = canCancelResponseAction(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(true);
    });

    it('should return false when user lacks base security solution access', () => {
      mockAuthz.canWriteSecuritySolution = false;

      const result = canCancelResponseAction(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(false);
    });

    it('should return false when Microsoft Defender Endpoint cancel feature is disabled', () => {
      const disabledFeatures = {
        ...allowedExperimentalValues,
        microsoftDefenderEndpointCancelEnabled: false,
      } as ExperimentalFeatures;

      const result = canCancelResponseAction(
        mockAuthz,
        disabledFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(false);
    });

    it('should return false for agent types that do not support cancel', () => {
      const unsupportedAgentTypes: ResponseActionAgentType[] = [
        'endpoint',
        'sentinel_one',
        'crowdstrike',
      ];

      unsupportedAgentTypes.forEach((agentType) => {
        const result = canCancelResponseAction(
          mockAuthz,
          mockExperimentalFeatures,
          agentType
        );

        expect(result).toBe(false);
      });
    });

    it('should check specific command permissions when command is provided', () => {
      mockAuthz.canIsolateHost = false;

      const result = canCancelResponseAction(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );

      expect(result).toBe(false);
    });

    it('should allow cancel when user has permission for the specific command', () => {
      const result = canCancelResponseAction(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );

      expect(result).toBe(true);
    });
  });

  describe('doesAgentTypeSupportCancel', () => {
    it('should return true for microsoft_defender_endpoint', () => {
      const result = doesAgentTypeSupportCancel('microsoft_defender_endpoint');
      expect(result).toBe(true);
    });

    it('should return false for endpoint agent', () => {
      const result = doesAgentTypeSupportCancel('endpoint');
      expect(result).toBe(false);
    });

    it('should return false for sentinel_one agent', () => {
      const result = doesAgentTypeSupportCancel('sentinel_one');
      expect(result).toBe(false);
    });

    it('should return false for crowdstrike agent', () => {
      const result = doesAgentTypeSupportCancel('crowdstrike');
      expect(result).toBe(false);
    });
  });

  describe('canUserCancelCommand', () => {
    const commandPermissionTests: Array<{
      command: ResponseActionsApiCommandNames;
      permission: keyof EndpointAuthz;
    }> = [
      { command: 'isolate', permission: 'canIsolateHost' },
      { command: 'unisolate', permission: 'canUnIsolateHost' },
      { command: 'kill-process', permission: 'canKillProcess' },
      { command: 'suspend-process', permission: 'canSuspendProcess' },
      { command: 'running-processes', permission: 'canGetRunningProcesses' },
      { command: 'get-file', permission: 'canWriteFileOperations' },
      { command: 'execute', permission: 'canWriteExecuteOperations' },
      { command: 'upload', permission: 'canWriteFileOperations' },
      { command: 'scan', permission: 'canWriteScanOperations' },
      { command: 'runscript', permission: 'canWriteExecuteOperations' },
      { command: 'cancel', permission: 'canWriteSecuritySolution' },
    ];

    commandPermissionTests.forEach(({ command, permission }) => {
      it(`should return true when user has ${permission} for ${command}`, () => {
        const result = canUserCancelCommand(mockAuthz, command);
        expect(result).toBe(true);
      });

      it(`should return false when user lacks ${permission} for ${command}`, () => {
        const restrictedAuthz = {
          ...mockAuthz,
          [permission]: false,
        };

        const result = canUserCancelCommand(restrictedAuthz, command);
        expect(result).toBe(false);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow for valid cancel request', () => {
      // Scenario: User wants to cancel an isolate command for MDE agent
      const agentType = 'microsoft_defender_endpoint';
      const command = 'isolate';

      // Check overall permission
      const canCancel = canCancelResponseAction(
        mockAuthz,
        mockExperimentalFeatures,
        agentType,
        command
      );

      // Verify individual checks
      const hasBaseAccess = mockAuthz.canWriteSecuritySolution;
      const featureEnabled = mockExperimentalFeatures.microsoftDefenderEndpointCancelEnabled;
      const agentSupportsCancel = doesAgentTypeSupportCancel(agentType);
      const hasCommandPermission = canUserCancelCommand(mockAuthz, command);

      expect(hasBaseAccess).toBe(true);
      expect(featureEnabled).toBe(true);
      expect(agentSupportsCancel).toBe(true);
      expect(hasCommandPermission).toBe(true);
      expect(canCancel).toBe(true);
    });

    it('should deny cancel when any condition fails', () => {
      const scenarios = [
        {
          name: 'no base access',
          setup: () => {
            mockAuthz.canWriteSecuritySolution = false;
          },
        },
        {
          name: 'feature disabled',
          setup: () => {
            mockExperimentalFeatures = {
              ...allowedExperimentalValues,
              microsoftDefenderEndpointCancelEnabled: false,
            } as ExperimentalFeatures;
          },
        },
        {
          name: 'unsupported agent type',
          setup: () => {
            // Will use 'endpoint' instead of 'microsoft_defender_endpoint'
          },
        },
        {
          name: 'insufficient command permission',
          setup: () => {
            mockAuthz.canIsolateHost = false;
          },
        },
      ];

      scenarios.forEach(({ name, setup }) => {
        // Reset to clean state
        mockAuthz = {
          ...getEndpointAuthzInitialState(),
          canWriteSecuritySolution: true,
          canIsolateHost: true,
        };
        mockExperimentalFeatures = {
          ...allowedExperimentalValues,
          microsoftDefenderEndpointCancelEnabled: true,
        };

        setup();

        const agentType = name === 'unsupported agent type' ? 'endpoint' : 'microsoft_defender_endpoint';
        const result = canCancelResponseAction(
          mockAuthz,
          mockExperimentalFeatures,
          agentType as ResponseActionAgentType,
          'isolate'
        );

        expect(result).toBe(false);
      });
    });

    it('should allow general cancel capability check without specific command', () => {
      const result = canCancelResponseAction(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(true);
    });

    it('should handle edge case with minimal permissions', () => {
      const minimalAuthz: EndpointAuthz = {
        ...getEndpointAuthzInitialState(),
        canWriteSecuritySolution: true, // Only base permission
      };

      const result = canCancelResponseAction(
        minimalAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(true); // Should pass without specific command
    });

    it('should deny specific command cancel with minimal permissions', () => {
      const minimalAuthz: EndpointAuthz = {
        ...getEndpointAuthzInitialState(),
        canWriteSecuritySolution: true, // Only base permission
        canIsolateHost: false, // No isolate permission
      };

      const result = canCancelResponseAction(
        minimalAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );

      expect(result).toBe(false); // Should fail for isolate command
    });
  });
});