/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { SelfClientResponse } from '../../../../common/self_client/self_client';

/** Builds a tool error result from a failed self-client response, extracting its message body. */
export const createToolErrorResult = (
  response: SelfClientResponse & { ok: false },
  fallbackMessage: string
) => {
  const bodyMessage =
    response.body && typeof response.body === 'object' && 'message' in response.body
      ? String((response.body as { message: unknown }).message)
      : undefined;
  const message =
    bodyMessage ?? `${fallbackMessage} (HTTP ${response.status}): ${response.message}`;

  return createToolError(message);
};

/** Builds a tool error result from a plain message. */
export const createToolError = (message: string) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: {
        message,
      },
    },
  ],
});

/** Builds a privilege-denied error result for mutating SIEM migration actions. */
export const createMissingPrivilegeError = (action: string) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: {
        message: `The current user does not have the required privileges to ${action}. Ask the user to grant Security > Automatic Migration: All and Rules: Read.`,
      },
    },
  ],
});
