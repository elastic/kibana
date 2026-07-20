/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { AttackDiscovery } from './types';

export interface AgentBuilderConverseResponse {
  messages: Array<{ message: string }>;
  steps: Array<{ tool_id?: string; results?: unknown[]; [key: string]: unknown }>;
  errors: Array<{ error: { message: string; stack?: string }; type: 'error' }>;
  traceId?: string;
  insights?: AttackDiscovery[] | null;
}

const parseInsightsFromMessage = (message: string): AttackDiscovery[] | null => {
  // The agent returns the insights JSON inside a fenced code block at the end
  // of the report. Extract the last JSON block and parse it.
  const matches = message.match(/```json\s*([\s\S]*?)\s*```/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const lastBlock = matches[matches.length - 1].replace(/```json\s*/, '').replace(/\s*```/, '');

  try {
    const parsed = JSON.parse(lastBlock);
    if (parsed && Array.isArray(parsed.insights)) {
      return parsed.insights;
    }
    return null;
  } catch {
    return null;
  }
};

export class AttackDiscoveryAgentBuilderChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse(
    question: string,
    attachments: Array<{ type: 'security.alerts'; data: { alertIds: string[] } }> = [],
    _expectedSkills?: string[]
  ): Promise<AgentBuilderConverseResponse> {
    // pRetry wraps the entire converse call. Attack Discovery executions are
    // not idempotent — a retried call that already succeeded server-side will
    // produce a second execution. This is acceptable in the eval fixture
    // context because afterAll cleanup removes all test data, and evaluator
    // metadata reflects only the final (successful) response. If this client
    // is ever reused outside isolated fixtures, replace pRetry with a
    // connection-level retry that does not re-POST the request body.
    return pRetry(
      async () => {
        const body: Record<string, unknown> = {
          agent_id: agentBuilderDefaultAgentId,
          connector_id: this.connectorId,
          input: question,
          _execution_mode: 'local',
          attachments,
        };

        const response = (await this.fetch('/api/agent_builder/converse', {
          method: 'POST',
          version: '2023-10-31',
          body: JSON.stringify(body),
        })) as {
          trace_id?: string;
          steps?: AgentBuilderConverseResponse['steps'];
          response: { message: string };
        };

        return {
          messages: [{ message: response.response.message }],
          steps: response.steps ?? [],
          errors: [],
          traceId: response.trace_id,
          insights: parseInsightsFromMessage(response.response.message),
        };
      },
      {
        retries: 2,
        minTimeout: 2_000,
        onFailedAttempt: (error) =>
          this.log.warning(
            new Error(`Agent Builder converse failed on attempt ${error.attemptNumber}`, {
              cause: error,
            })
          ),
      }
    );
  }
}
