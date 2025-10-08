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
  canUserCancelCommand,
  isCancelFeatureAvailable,
  checkCancelPermission,
} from './cancel_authz_utils';
import { isActionSupportedByAgentType } from '../response_actions/is_response_action_supported';
import { getEndpointAuthzInitialState } from './authz';
import { allowedExperimentalValues } from '../../../experimental_features';

describe('cancel authorization utilities', () => {
  let mockAuthz: EndpointAuthz;
  let mockExperimentalFeatures: ExperimentalFeatures;

  beforeEach(() => {
    mockAuthz = {
      ...getEndpointAuthzInitialState(),
      canReadSecuritySolution: true,
      canWriteSecuritySolution: true,
      canIsolateHost: true,
      canUnIsolateHost: true,
      canKillProcess: true,
      canSuspendProcess: true,
      canGetRunningProcesses: true,
      canWriteFileOperations: true,
      canWriteExecuteOperations: true,
      canWriteScanOperations: true,
      canAccessResponseConsole: true, // Response action permissions
      canCancelAction: true, // Response action permissions
    };

    mockExperimentalFeatures = {
      ...allowedExperimentalValues,
      microsoftDefenderEndpointCancelEnabled: true,
    } as ExperimentalFeatures;
  });

  describe('isCancelFeatureAvailable', () => {
    it('should return true when all conditions are met', () => {
      const result = isCancelFeatureAvailable(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );
      expect(result).toBe(true);
    });

    it('should return false when user lacks base response console access', () => {
      // Remove all response action permissions to make canCancelAction false
      const restrictedAuthz = {
        ...getEndpointAuthzInitialState(),
        canReadSecuritySolution: true, // Basic read access only
        // No response action permissions means canCancelAction would be false
      };
      const result = isCancelFeatureAvailable(
        restrictedAuthz,
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
      const result = isCancelFeatureAvailable(
        mockAuthz,
        disabledFeatures,
        'microsoft_defender_endpoint'
      );
      expect(result).toBe(false);
    });

    it('should return false for unsupported agent types', () => {
      const unsupportedAgentTypes: ResponseActionAgentType[] = [
        'endpoint',
        'sentinel_one',
        'crowdstrike',
      ];
      unsupportedAgentTypes.forEach((agentType) => {
        const result = isCancelFeatureAvailable(mockAuthz, mockExperimentalFeatures, agentType);
        expect(result).toBe(false);
      });
    });
  });

  describe('checkCancelPermission', () => {
    it('should return true when all conditions are met', () => {
      const result = checkCancelPermission(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );
      expect(result).toBe(true);
    });

    it('should return false when feature is not available', () => {
      const disabledFeatures = {
        ...allowedExperimentalValues,
        microsoftDefenderEndpointCancelEnabled: false,
      } as ExperimentalFeatures;
      const result = checkCancelPermission(
        mockAuthz,
        disabledFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );
      expect(result).toBe(false);
    });

    it('should return false when user lacks command permission', () => {
      mockAuthz.canIsolateHost = false;
      const result = checkCancelPermission(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );
      expect(result).toBe(false);
    });
  });

  describe('agent type support (via isActionSupportedByAgentType)', () => {
    it('should return true for microsoft_defender_endpoint', () => {
      const result = isActionSupportedByAgentType(
        'microsoft_defender_endpoint',
        'cancel',
        'manual'
      );
      expect(result).toBe(true);
    });

    it('should return false for endpoint agent', () => {
      const result = isActionSupportedByAgentType('endpoint', 'cancel', 'manual');
      expect(result).toBe(false);
    });

    it('should return false for sentinel_one agent', () => {
      const result = isActionSupportedByAgentType('sentinel_one', 'cancel', 'manual');
      expect(result).toBe(false);
    });

    it('should return false for crowdstrike agent', () => {
      const result = isActionSupportedByAgentType('crowdstrike', 'cancel', 'manual');
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
      const result = checkCancelPermission(mockAuthz, mockExperimentalFeatures, agentType, command);
      const canCancel = result;

      // Verify individual checks
      const hasBaseAccess = mockAuthz.canCancelAction;
      const featureEnabled = mockExperimentalFeatures.microsoftDefenderEndpointCancelEnabled;
      const agentSupportsCancel = isActionSupportedByAgentType(agentType, 'cancel', 'manual');
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
          name: 'no response console access',
          setup: () => {
            // Remove all response action permissions to simulate no console access
            mockAuthz = {
              ...getEndpointAuthzInitialState(),
              canReadSecuritySolution: true, // Basic read access only
              canCancelAction: false,
            };
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
        // Reset to clean state with minimal permissions for console access
        mockAuthz = {
          ...getEndpointAuthzInitialState(),
          canIsolateHost: true, // Provides base response action capability
          canCancelAction: true, // Would be calculated as true
        };
        mockExperimentalFeatures = {
          ...allowedExperimentalValues,
          microsoftDefenderEndpointCancelEnabled: true,
        };

        setup();

        const agentType =
          name === 'unsupported agent type' ? 'endpoint' : 'microsoft_defender_endpoint';
        const result = checkCancelPermission(
          mockAuthz,
          mockExperimentalFeatures,
          agentType as ResponseActionAgentType,
          'isolate'
        );

        expect(result).toBe(false);
      });
    });

    it('should handle feature availability check separately', () => {
      const result = isCancelFeatureAvailable(
        mockAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(true);
    });

    it('should handle edge case with minimal permissions', () => {
      // Test with just enough permissions to enable response console access
      const minimalAuthz: EndpointAuthz = {
        ...getEndpointAuthzInitialState(),
        canIsolateHost: true, // Minimal response action permission
        canCancelAction: true, // Would be calculated as true due to canIsolateHost + Enterprise license
      };

      const result = isCancelFeatureAvailable(
        minimalAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint'
      );

      expect(result).toBe(true); // Feature should be available
    });

    it('should deny specific command cancel with minimal permissions', () => {
      // Test user with response console access but lacking specific command permission
      const minimalAuthz: EndpointAuthz = {
        ...getEndpointAuthzInitialState(),
        canKillProcess: true, // Has some response action permission (for console access)
        canCancelAction: true, // Would be true due to canKillProcess
        canIsolateHost: false, // No isolate permission
      };

      const result = checkCancelPermission(
        minimalAuthz,
        mockExperimentalFeatures,
        'microsoft_defender_endpoint',
        'isolate'
      );

      expect(result).toBe(false); // Should fail for isolate command
    });
  });
});
