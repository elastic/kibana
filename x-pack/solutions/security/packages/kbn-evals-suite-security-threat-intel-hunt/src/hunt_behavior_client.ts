/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';

const HUNT_BEHAVIOR_API_PATH = '/api/threat_intelligence/hunt_behavior';

export interface ExtractedBehavior {
  technique_id: string;
  llm_confidence: number;
  confidence: number;
  proposed_esql_rule: string;
  parent_technique_id?: string;
}

export interface HuntBehaviorResponse {
  status: string;
  behaviors: ExtractedBehavior[];
  dropped_unknown_ids: string[];
}

export class HuntBehaviorClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async extract(text: string, reportId?: string): Promise<HuntBehaviorResponse> {
    const call = async (): Promise<HuntBehaviorResponse> => {
      // `HttpHandler` returns the parsed JSON body directly. The route wraps the
      // service result with `withUiHints`, which spreads the result at the top
      // level (adds `ui_hints`) — so `status`/`behaviors`/`dropped_unknown_ids`
      // are flat, not nested under `body`.
      const body = (await this.fetch(HUNT_BEHAVIOR_API_PATH, {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({ text, report_id: reportId }),
      })) as {
        status?: string;
        behaviors?: ExtractedBehavior[];
        dropped_unknown_ids?: string[];
      };

      return {
        status: body.status ?? 'unknown',
        behaviors: body.behaviors ?? [],
        dropped_unknown_ids: body.dropped_unknown_ids ?? [],
      };
    };

    return pRetry(call, {
      retries: 2,
      minTimeout: 2_000,
      onFailedAttempt: (error) => {
        this.log.warning(
          new Error(`hunt_behavior failed on attempt ${error.attemptNumber}; retrying...`, {
            cause: error,
          })
        );
      },
    });
  }
}
