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
import type { PreviewConverseResponse, PreviewConverseStep } from './types';

export type { PreviewConverseResponse } from './types';

export class DetectionRulePreviewChatClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async converse(input: string, connectorId: string): Promise<PreviewConverseResponse> {
    return pRetry(
      async () => {
        const response = (await this.fetch('/api/agent_builder/converse', {
          method: 'POST',
          version: '2023-10-31',
          body: JSON.stringify({
            agent_id: agentBuilderDefaultAgentId,
            connector_id: connectorId,
            input,
            _execution_mode: 'local',
          }),
        })) as {
          trace_id?: string;
          steps?: PreviewConverseStep[];
          response: { message: string };
        };

        return {
          steps: response.steps ?? [],
          message: response.response?.message ?? '',
          traceId: response.trace_id,
        };
      },
      {
        retries: 2,
        onFailedAttempt: (error) => {
          this.log.warning(`Converse attempt failed: ${error.message}`);
        },
      }
    );
  }
}
