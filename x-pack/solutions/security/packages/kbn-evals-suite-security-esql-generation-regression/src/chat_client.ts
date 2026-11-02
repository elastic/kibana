/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import pRetry from 'p-retry';

interface ConverseStep {
  type?: string;
  tool_id?: string;
  results?: unknown[];
  // Additional Agent Builder step fields are passed through opaquely so the
  // trace-based evaluators / ES|QL extractor can introspect them without us
  // having to model the full Agent Builder step union here.
  [k: string]: unknown;
}

export interface ConverseResponse {
  conversationId?: string;
  messages: Array<{ message: string }>;
  steps: ConverseStep[];
  errors: Array<{ error: { message: string; stack?: string }; type: 'error' }>;
  traceId?: string;
}

interface ConverseParams {
  message: string;
  conversationId?: string;
  agentId?: string;
}

/**
 * Thin wrapper around the Agent Builder `converse` HTTP API that drives the
 * ES|QL generation regression suite.
 *
 * The platform-side `AgentBuilderEvaluationChatClient`
 * (`@kbn/evals-suite-agent-builder`) ships an identical wrapper, but it lives
 * in a sibling `functional-tests` module under `group: "platform"` with
 * `visibility: "private"` and no public entry point. Kibana's
 * module-visibility rules therefore forbid importing it from a
 * `group: "security"` package, so we keep a local copy with the same retry
 * policy, default agent id, and fallback response shape. Mirrors
 * `AlertsRagAgentBuilderChatClient` in the alerts-rag suite for the same
 * reason.
 *
 * The Agent Builder endpoint is the supported successor to the deprecated
 * `/api/security_ai_assistant/chat/complete` route the LangSmith-era
 * ES|QL generation suite used to exercise (via `DefaultAssistantGraph`).
 */
export class EsqlRegressionAgentBuilderChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse({
    message,
    conversationId,
    agentId = agentBuilderDefaultAgentId,
  }: ConverseParams): Promise<ConverseResponse> {
    const call = async (): Promise<ConverseResponse> => {
      // Local cast mirrors the server contract in
      // `x-pack/platform/plugins/shared/agent_builder/common/http_api/chat.ts`:
      // `response` is `Partial<AssistantResponse> & { prompts?: ... }`, so
      // both the outer `response` field and the inner `message` must be
      // treated as possibly absent. For tool-only turns where the agent
      // surfaces its answer through a structured `generate_esql` /
      // `execute_esql` step rather than free-form text, `response.message`
      // can be missing — the extractor walks `steps` first (see
      // `extract_esql.ts`) and only falls back to the final message
      // when no tool result is available. Dereferencing
      // `response.response.message` directly here would throw a
      // `TypeError`, which `pRetry` would mistake for a transient
      // failure and waste two more LLM round-trips before the outer
      // catch drops the steps payload — exactly what the extractor
      // needs. Returning an empty string instead lets the extractor
      // continue working from `steps[]`.
      const response = (await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: message,
        }),
      })) as {
        conversation_id?: string;
        trace_id?: string;
        steps?: ConverseStep[];
        response?: { message?: string };
      };

      return {
        conversationId: response.conversation_id,
        messages: [{ message: response.response?.message ?? '' }],
        steps: response.steps ?? [],
        traceId: response.trace_id,
        errors: [],
      };
    };

    try {
      return await pRetry(call, {
        retries: 2,
        minTimeout: 2_000,
        onFailedAttempt: (error) => {
          this.log.warning(
            new Error(
              `agent_builder/converse failed on attempt ${error.attemptNumber}; retrying...`,
              { cause: error }
            )
          );
        },
      });
    } catch (error) {
      this.log.error(
        new Error('agent_builder/converse failed after retries', {
          cause: error instanceof Error ? error : new Error(String(error)),
        })
      );
      return {
        conversationId,
        messages: [
          {
            message:
              'This question could not be answered as an internal error occurred. Please try again.',
          },
        ],
        steps: [],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  }
}
