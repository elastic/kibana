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

// ============================================================================
// Machine Action Processing Utilities
// ============================================================================

/**
 * Calculates the current state of a Microsoft Defender machine action
 * @param machineAction - The machine action from Microsoft Defender API
 * @returns Object containing pending status, error status, and message
 */
export function calculateMachineActionState(
  machineAction: MicrosoftDefenderEndpointMachineAction
): {
  isPending: boolean;
  isError: boolean;
  message: string;
} {
  let isPending = true;
  let isError = false;
  let message = '';

  switch (machineAction.status) {
    case 'Failed':
    case 'TimeOut':
      isPending = false;
      isError = true;
      message = `Response action ${machineAction.status} (Microsoft Defender for Endpoint machine action ID: ${machineAction.id})`;
      break;

    case 'Cancelled':
      isPending = false;
      isError = true;
      message = `Response action was canceled by [${
        machineAction.cancellationRequestor
      }] (Microsoft Defender for Endpoint machine action ID: ${machineAction.id})${
        machineAction.cancellationComment ? `: ${machineAction.cancellationComment}` : ''
      }`;
      break;

    case 'Succeeded':
      isPending = false;
      isError = false;
      break;

    default:
      // covers 'Pending' | 'InProgress'
      isPending = true;
      isError = false;
  }

  return { isPending, isError, message };
}

/**
 * Sort action requests to process original actions before cancel actions.
 * This ensures proper logic flow when processing related actions.
 * @param actionRequests - Array of pending action requests
 * @returns Sorted array with original actions first, cancel actions second
 */
export function sortActionRequests(
  actionRequests: Array<
    LogsEndpointAction<undefined, {}, MicrosoftDefenderEndpointActionRequestCommonMeta>
  >
): Array<LogsEndpointAction<undefined, {}, MicrosoftDefenderEndpointActionRequestCommonMeta>> {
  return actionRequests.sort((a, b) => {
    const aIsCancel = a.EndpointActions.data.command === 'cancel';
    const bIsCancel = b.EndpointActions.data.command === 'cancel';
    if (aIsCancel && !bIsCancel) return 1; // Cancel actions come after
    if (!aIsCancel && bIsCancel) return -1; // Original actions come first
    return 0; // Same type, maintain order
  });
}

/**
 * Check if this is a "partial cancel" scenario where cancel was attempted but command completed anyway.
 * This can happen when a cancel request arrives too late and the original action has already finished.
 * @param machineAction - The machine action from Microsoft Defender API
 * @returns True if the action was cancelled but the command still completed
 */
export function isPartialCancelScenario(
  machineAction: MicrosoftDefenderEndpointMachineAction
): boolean {
  const command = machineAction.commands?.[0];
  return !!(command?.commandStatus === 'Completed' && command?.endTime);
}

/**
 * Process cancel action responses, handling MDE's quirky architecture where
 * cancel actions reuse the same machine action ID as the original action.
 * @param machineAction - The machine action from Microsoft Defender API
 * @param cancelAlreadyProcessed - Whether a cancel has already been processed for this machine action
 * @returns Object containing any error and whether the cancel was processed
 */
export function processCancelAction(
  machineAction: MicrosoftDefenderEndpointMachineAction,
  cancelAlreadyProcessed: boolean
): { actionError?: { message: string }; cancelProcessed: boolean } {
  // MDE reuses machine action IDs, so multiple cancel attempts on the same original action
  // will all reference the same machine action. We need to detect invalid cancel attempts.

  if (cancelAlreadyProcessed) {
    // This is likely a cancel-cancel scenario or duplicate cancel processing
    return {
      actionError: {
        message: `Cancel request failed because the target action has already been cancelled or completed.`,
      },
      cancelProcessed: false,
    };
  }

  if (machineAction.status === 'Cancelled' && machineAction.cancellationRequestor) {
    // Check if this is a "partial cancel" - cancel was attempted but command completed anyway
    const isPartialCancel = isPartialCancelScenario(machineAction);

    if (isPartialCancel) {
      // Cancel was too late, action already completed
      return {
        actionError: {
          message: `Cancel request was processed but the action had already completed. The action finished before it could be cancelled.`,
        },
        cancelProcessed: true,
      };
    } else {
      // Cancel action succeeded - no error
      return {
        actionError: undefined,
        cancelProcessed: true,
      };
    }
  }

  if (machineAction.status === 'Succeeded' || machineAction.status === 'Failed') {
    // Action completed before cancel could be processed
    return {
      actionError: {
        message: `Cannot cancel action because it has already completed. The action finished before the cancel request could be processed.`,
      },
      cancelProcessed: false,
    };
  }

  // Cancel succeeded
  return {
    actionError: undefined,
    cancelProcessed: true,
  };
}
