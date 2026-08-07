/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { createAgentBuilderClient } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { PreviewConverseResponse, PreviewConverseStep } from './types';

export type { PreviewConverseResponse } from './types';

/**
 * Thin adapter over the shared {@link createAgentBuilderClient} that pins the
 * agent id and exposes the converse call in the `(input, connectorId)` shape
 * this suite's dataset runner expects. Delegates the fetch/retry/traceId
 * plumbing to the shared client so it stays the single source of truth.
 */
export class DetectionRulePreviewChatClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async converse(input: string, connectorId: string): Promise<PreviewConverseResponse> {
    const client = createAgentBuilderClient({ fetch: this.fetch, log: this.log, connectorId });
    const response = await client.converse({ agentId: agentBuilderDefaultAgentId, input });
    return {
      steps: response.steps as PreviewConverseStep[],
      message: response.message,
      traceId: response.traceId,
    };
  }
}
