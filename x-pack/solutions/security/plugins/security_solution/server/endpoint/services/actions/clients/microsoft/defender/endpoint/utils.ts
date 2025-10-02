/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MicrosoftDefenderEndpointMachineAction } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';

/**
 * Validation result for MDE action details
 */
export interface ActionValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that an MDE action matches the expected script name and action ID.
 * This detects when MDE throttles/replaces our action with an existing one.
 *
 * @param actionDetails The action details returned by MDE
 * @param expectedScriptName The script name we requested
 * @param expectedActionId The Kibana action ID we included in the comment
 * @returns Validation result with isValid flag and error message if validation fails
 */
export function checkActionMatches(
  actionDetails: MicrosoftDefenderEndpointMachineAction,
  expectedScriptName: string,
  expectedActionId: string
): ActionValidationResult {
  // Validate inputs
  if (!expectedScriptName || !expectedActionId) {
    return {
      isValid: false,
      error: 'Unable to validate action. Missing required parameters.',
    };
  }

  const commandEntry = actionDetails.commands?.[0];
  if (!commandEntry) {
    return {
      isValid: false,
      error: 'Unable to verify action details. The action information is incomplete.',
    };
  }

  const scriptNameParam = commandEntry.command.params.find((p) => p.key === 'ScriptName');
  const actualScriptName = scriptNameParam?.value;

  // Validate script name exists
  if (!actualScriptName) {
    return {
      isValid: false,
      error: 'Unable to verify which script is running. The action information is incomplete.',
    };
  }

  // Validate script name matches FIRST - primary detection mechanism
  if (actualScriptName !== expectedScriptName) {
    return {
      isValid: false,
      error: `Cannot run script '${expectedScriptName}' because another script ('${actualScriptName}') is already in progress on this host. Please wait for the current script to complete or cancel it before trying again.`,
    };
  }

  // Validate action ID is in comment - ownership check (fallback verification)
  if (!actionDetails.requestorComment?.includes(expectedActionId)) {
    return {
      isValid: false,
      error: `Cannot run script '${actualScriptName}' because an identical script is already in progress on this host. Please wait for the current script to complete or cancel it before trying again.`,
    };
  }

  // All validations passed - this is our action
  return {
    isValid: true,
  };
}
