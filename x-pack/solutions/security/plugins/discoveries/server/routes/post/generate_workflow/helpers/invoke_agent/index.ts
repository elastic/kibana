/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentConfigurationOverrides } from '@kbn/agent-builder-common';
import type { RunAgentFn } from '@kbn/agent-builder-server/agents';

interface InvokeAgentParams {
  /** The ID of the agent to invoke */
  agentId: string;
  /** An optional signal to abort the agent invocation */
  abortSignal?: AbortSignal;
  /** Optional runtime configuration overrides (e.g. instructions and tools) */
  configurationOverrides?: AgentConfigurationOverrides;
  /** The connector ID to use for the LLM call */
  connectorId: string;
  /** The message to send to the agent as user input */
  message: string;
  /** The authenticated Kibana request */
  request: KibanaRequest;
  /** The agent builder runAgent function */
  runAgent: RunAgentFn;
}

interface InvokeAgentSuccess {
  ok: true;
  /** The assistant's response message text */
  responseMessage: string;
}

interface InvokeAgentFailure {
  ok: false;
  error: string;
}

export type InvokeAgentResult = InvokeAgentSuccess | InvokeAgentFailure;

/**
 * Invokes the agent builder's runAgent API with the given message and connector ID.
 *
 * Constructs RunAgentParams for the specified agent and returns the assistant's
 * text response message on success, or an error on failure.
 */
export const invokeAgent = async ({
  abortSignal,
  agentId,
  configurationOverrides,
  connectorId,
  message,
  request,
  runAgent,
}: InvokeAgentParams): Promise<InvokeAgentResult> => {
  try {
    const { result } = await runAgent({
      abortSignal,
      agentId,
      agentParams: {
        configurationOverrides,
        nextInput: {
          message,
        },
      },
      defaultConnectorId: connectorId,
      request,
    });

    const responseMessage = result.round.response.message;

    if (!responseMessage) {
      return {
        error: 'Agent returned an empty response message',
        ok: false,
      };
    }

    return {
      ok: true,
      responseMessage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      error: `Failed to invoke agent: ${errorMessage}`,
      ok: false,
    };
  }
};
