/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';

interface ConverseResponse {
  conversation_id: string;
  trace_id?: string;
  steps: unknown[];
  response: { message: string };
}

export const callConverse = async ({
  fetch,
  connectorId,
  question,
  attachments,
  log,
}: {
  fetch: HttpHandler;
  connectorId: string;
  question: string;
  attachments: Array<{ type: string; data?: unknown }>;
  log: ToolingLog;
}) => {
  log.info(`Calling converse: "${question.slice(0, 80)}..."`);

  const raw = (await fetch('/api/agent_builder/converse', {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify({
      agent_id: agentBuilderDefaultAgentId,
      connector_id: connectorId,
      input: question,
      attachments,
    }),
  })) as ConverseResponse;

  return {
    errors: [],
    messages: [{ message: question }, raw.response],
    steps: raw.steps ?? [],
    traceId: raw.trace_id,
  };
};
