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
 * Retries a function that may initially fail due to indexing delays.
 * This helper provides a simple retry mechanism with a configurable delay.
 *
 * Default values chosen based on MDE API behavior:
 * - 300ms delay: Observed indexing lag for newly created actions
 * - 1 retry: Single retry is sufficient as persistent failures indicate real errors
 *
 * @param fn - The async function to retry
 * @param delayMs - Delay in milliseconds between retries (default: 300ms)
 * @param maxRetries - Maximum number of retry attempts (default: 1)
 * @returns The result of the function, or undefined if all retries fail
 */
export async function retryWithDelay<T>(
  fn: () => Promise<T | undefined>,
  delayMs: number = 300,
  maxRetries: number = 1
): Promise<T | undefined> {
  let result = await fn();

  for (let attempt = 0; attempt < maxRetries && !result; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await fn();
  }

  return result;
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
      error: 'Invalid validation parameters: script name and action ID are required',
    };
  }

  const commandEntry = actionDetails.commands?.[0];
  if (!commandEntry) {
    return {
      isValid: false,
      error: `Microsoft Defender action (ID: ${actionDetails.id}) has no command information.`,
    };
  }

  const scriptNameParam = commandEntry.command.params.find((p) => p.key === 'ScriptName');
  const actualScriptName = scriptNameParam?.value;

  // Validate script name exists
  if (!actualScriptName) {
    return {
      isValid: false,
      error: `Unable to extract script name from Microsoft Defender action (ID: ${actionDetails.id}).`,
    };
  }

  // Validate script name matches FIRST - primary detection mechanism
  if (actualScriptName !== expectedScriptName) {
    return {
      isValid: false,
      error: `Microsoft Defender action verified (action ID: ${expectedActionId}), but script name mismatched. Expected '${expectedScriptName}', found '${actualScriptName}'. (MDE action ID: ${actionDetails.id})`,
    };
  }

  // Validate action ID is in comment - ownership check (fallback verification)
  if (!actionDetails.requestorComment?.includes(expectedActionId)) {
    return {
      isValid: false,
      error: `Microsoft Defender returned an existing action that was not created by this request. Expected action ID '${expectedActionId}' not found in requestor comment. Action is running script '${actualScriptName}' (MDE action ID: ${actionDetails.id}).`,
    };
  }

  // All validations passed - this is our action
  return {
    isValid: true,
  };
}
