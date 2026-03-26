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
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
} from '../response_actions/constants';
import { isActionSupportedByAgentType } from '../response_actions/is_response_action_supported';

/**
 * Checks if cancel operations are available for the given agent type and environment.
 * This is a general capability check, not command-specific.
 *
 * Uses `canCancelAction` as the base permission because cancel operations require
 * meaningful response action capabilities (not just read access). This permission is calculated
 * based on having least one non-release/non-cancel response action permission.
 *
 * @param authz - The user's endpoint authorization permissions
 * @param featureFlags - Experimental features configuration
 * @param agentType - The agent type (endpoint, sentinel_one, crowdstrike, microsoft_defender_endpoint)
 * @returns true if cancel feature is available for the agent type
 */
export const isCancelFeatureAvailable = (
  authz: EndpointAuthz,
  featureFlags: ExperimentalFeatures,
  agentType: ResponseActionAgentType
): boolean => {
  // Check base access to security solution
  if (!authz.canCancelAction) {
    return false;
  }

  // Check agent type
  if (agentType !== 'microsoft_defender_endpoint') {
    return false;
  }

  // Check if Microsoft Defender Endpoint cancel feature is enabled
  if (!featureFlags.microsoftDefenderEndpointCancelEnabled) {
    return false;
  }

  // Check if agent type supports cancel operations
  return isActionSupportedByAgentType(agentType, 'cancel', 'manual');
};

/**
 * Checks if user can cancel a specific command.
 * Assumes cancel feature is available (checked separately).
 *
 * @param authz - The user's endpoint authorization permissions
 * @param command - The response action command being cancelled
 * @returns true if the user has permission to cancel the specified command
 */
export const canUserCancelCommand = (
  authz: EndpointAuthz,
  command: ResponseActionsApiCommandNames
): boolean => {
  const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
  const requiredAuthzKey = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[consoleCommand];
  return authz[requiredAuthzKey];
};

/**
 * Complete check for cancel permission
 * Combines feature availability and command-specific permission.
 *
 * @param authz - The user's endpoint authorization permissions
 * @param featureFlags - Experimental features configuration
 * @param agentType - The agent type
 * @param command - The response action command being cancelled
 * @returns true if the user has permission to cancel the command
 */
export const checkCancelPermission = (
  authz: EndpointAuthz,
  featureFlags: ExperimentalFeatures,
  agentType: ResponseActionAgentType,
  command: ResponseActionsApiCommandNames
): boolean => {
  return (
    isCancelFeatureAvailable(authz, featureFlags, agentType) && canUserCancelCommand(authz, command)
  );
};
