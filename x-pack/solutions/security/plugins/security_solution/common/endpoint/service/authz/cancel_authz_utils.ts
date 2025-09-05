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
import { isActionSupportedByAgentType } from '../response_actions/is_response_action_supported';

/**
 * Determines if a user can cancel a response action based on authorization, agent type,
 * and optionally specific command permissions.
 *
 * This function follows the established Kibana Security Solution pattern of using utility
 * functions for dynamic permission evaluation rather than custom authorization middleware.
 *
 * @param authz - The user's endpoint authorization permissions
 * @param featureFlags - Experimental features configuration
 * @param agentType - The agent type (endpoint, sentinel_one, crowdstrike, microsoft_defender_endpoint)
 * @param command - Optional specific command being cancelled for granular permission checking
 * @returns true if the user can cancel the response action, false otherwise
 */
export const canCancelResponseAction = (
  authz: EndpointAuthz,
  featureFlags: ExperimentalFeatures,
  agentType: ResponseActionAgentType,
  command?: ResponseActionsApiCommandNames
): boolean => {
  // 1. Check base access to security solution
  if (!authz.canWriteSecuritySolution) {
    return false;
  }

  // 2. Check if Microsoft Defender Endpoint cancel feature is enabled
  // (Currently only MDE supports cancel operations)
  if (!featureFlags.microsoftDefenderEndpointCancelEnabled) {
    return false;
  }

  // 3. Check if agent type supports cancel operations
  if (!doesAgentTypeSupportCancel(agentType)) {
    return false;
  }

  // 4. If specific command provided, check command-specific authorization
  if (command) {
    return canUserCancelCommand(authz, command);
  }

  // 5. General cancel capability (for UI visibility without specific command)
  return true;
};

/**
 * Checks if the specified agent type supports cancel operations.
 * This function follows the same pattern as other agent type support checks
 * in the Security Solution codebase.
 *
 * @param agentType - The agent type to check
 * @returns true if the agent type supports cancel operations
 */
export const doesAgentTypeSupportCancel = (agentType: ResponseActionAgentType): boolean => {
  // Use existing pattern from is_response_action_supported.ts
  // Currently only Microsoft Defender Endpoint supports cancel in manual mode
  return isActionSupportedByAgentType(agentType, 'cancel', 'manual');
};

/**
 * Determines if a user has the necessary permissions to cancel a specific response action command.
 * Maps each command to its required permission using the established authorization patterns.
 *
 * @param authz - The user's endpoint authorization permissions
 * @param command - The response action command being cancelled
 * @returns true if the user has permission to cancel the specified command
 */
export const canUserCancelCommand = (
  authz: EndpointAuthz,
  command: ResponseActionsApiCommandNames
): boolean => {
  // Map each command to its required permission
  // This mapping ensures users can only cancel commands they have permission to execute
  const permissionMapping: Record<ResponseActionsApiCommandNames, keyof EndpointAuthz> = {
    isolate: 'canIsolateHost',
    unisolate: 'canUnIsolateHost',
    'kill-process': 'canKillProcess',
    'suspend-process': 'canSuspendProcess',
    'running-processes': 'canGetRunningProcesses',
    'get-file': 'canWriteFileOperations',
    execute: 'canWriteExecuteOperations',
    upload: 'canWriteFileOperations',
    scan: 'canWriteScanOperations',
    runscript: 'canWriteExecuteOperations',
    cancel: 'canWriteSecuritySolution', // Cancel does not require any specific command access
  };

  const requiredPermission = permissionMapping[command];
  return requiredPermission ? (authz[requiredPermission] as boolean) : false;
};
