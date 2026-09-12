/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
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

// On long runs the agent's report and insights JSON land in a `reasoning` step
// rather than `response.message`, so reading only the message loses them. Scan
// `reasoning` steps ONLY, never tool results: `security.attack-discovery.run`
// returns its own `attack_discoveries`, and reading that would score the tool's
// return value instead of what the agent actually rendered.
export const parseInsightsFromSteps = (
  steps: AgentBuilderConverseResponse['steps']
): AttackDiscovery[] | null => {
  const reasoning = steps
    .filter((step) => step.type === 'reasoning' && typeof step.reasoning === 'string')
    .map((step) => step.reasoning as string);

  for (let i = reasoning.length - 1; i >= 0; i--) {
    const insights = parseInsightsFromMessage(reasoning[i]);
    if (insights) {
      return insights;
    }
  }

  return null;
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
    // No retry around this call. Attack Discovery executions are not
    // idempotent — a retried call after a dropped response that already
    // succeeded server-side would trigger a second execution that writes the
    // same ES indices the evaluators later read (and `afterAll` cleanup runs
    // after the whole suite, not between attempts). Let the eval fail loudly
    // instead of risking a silent duplicate execution.
    const body: Record<string, unknown> = {
      agent_id: agentBuilderDefaultAgentId,
      connector_id: this.connectorId,
      input: question,
      _execution_mode: 'local',
      attachments,
    };

    let response: {
      trace_id?: string;
      steps?: AgentBuilderConverseResponse['steps'];
      response: { message: string };
    };
    try {
      response = (await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify(body),
      })) as typeof response;
    } catch (error) {
      this.log.error(
        new Error('Agent Builder converse failed (no retry — request is not idempotent)', {
          cause: error,
        })
      );
      throw error;
    }

    return {
      messages: [{ message: response.response.message }],
      steps: response.steps ?? [],
      errors: [],
      traceId: response.trace_id,
      insights:
        parseInsightsFromMessage(response.response.message) ??
        parseInsightsFromSteps(response.steps ?? []),
    };
  }
}
