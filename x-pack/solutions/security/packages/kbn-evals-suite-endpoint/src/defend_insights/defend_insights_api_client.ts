/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { KbnClientRequesterError } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DefendInsightsPostRequestBodyInput,
  DefendInsightsResponse,
} from '@kbn/elastic-assistant-common';
import {
  DEFEND_INSIGHTS,
  DEFEND_INSIGHTS_BY_ID,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import type { DefendInsightsTaskOutput } from './types';

const PUBLIC_API_VERSION = '2023-10-31';
const INTERNAL_API_VERSION = '1';
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'canceled']);
const POLL_INTERVAL_MS = 3_000;
export const DEFEND_INSIGHTS_POLL_MAX_WAIT_MS = 480_000;
const INSIGHT_NOT_FOUND_GRACE_MS = 30_000;
const MAX_ERROR_LENGTH = 800;

type AnonymizationFields = DefendInsightsPostRequestBodyInput['anonymizationFields'];

interface AnonymizationFieldsFindResponse {
  data?: AnonymizationFields;
}

interface GetDefendInsightResponse {
  data?: DefendInsightsResponse | null;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (e: unknown): number | undefined => {
  const { status } = e as Partial<KbnClientRequesterError>;
  return typeof status === 'number' ? status : undefined;
};

const describeError = (e: unknown): string =>
  (e instanceof Error ? e.message : String(e)).slice(0, MAX_ERROR_LENGTH);

const isRetryable = (status: number | undefined): boolean =>
  status === 429 || (status !== undefined && status >= 500);

export interface GenerateDefendInsightsOptions {
  endpointId: string;
  connectorId: string;
  actionTypeId: string;
  pollMaxWaitMs?: number;
}

/**
 * Drives the production Defend Insights routes: POST creates the insight and returns it as `running`;
 * the graph then runs in the background, so the result is read by polling GET by id.
 */
export class DefendInsightsApiClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async fetchAnonymizationFields(): Promise<AnonymizationFields> {
    try {
      const payload = await this.fetch<AnonymizationFieldsFindResponse>(
        ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
        {
          method: 'GET',
          version: PUBLIC_API_VERSION,
          query: { page: '1', per_page: '1000' },
        }
      );
      return payload.data ?? [];
    } catch (e) {
      this.log.warning(
        `anonymization_fields find failed (${statusOf(e) ?? 'n/a'}); using empty list`
      );
      return [];
    }
  }

  async generateIncompatibleAntivirus({
    endpointId,
    connectorId,
    actionTypeId,
    pollMaxWaitMs = DEFEND_INSIGHTS_POLL_MAX_WAIT_MS,
  }: GenerateDefendInsightsOptions): Promise<DefendInsightsTaskOutput> {
    const startedAt = Date.now();
    const elapsed = () => Date.now() - startedAt;

    const body: DefendInsightsPostRequestBodyInput = {
      endpointIds: [endpointId],
      insightType: 'incompatible_antivirus',
      anonymizationFields: await this.fetchAnonymizationFields(),
      apiConfig: { connectorId, actionTypeId },
      subAction: 'invokeAI',
    };

    let insightId: string;
    try {
      const created = await this.fetch<DefendInsightsResponse>(DEFEND_INSIGHTS, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'elastic-api-version': INTERNAL_API_VERSION,
          'kbn-xsrf': 'true',
          'Content-Type': 'application/json',
        },
      });
      insightId = created.id;
    } catch (e) {
      return {
        status: 'request_failed',
        insights: null,
        latencyMs: elapsed(),
        error: `POST defend_insights HTTP ${statusOf(e) ?? 'n/a'}: ${describeError(e)}`,
      };
    }

    if (!insightId) {
      return {
        status: 'request_failed',
        insights: null,
        latencyMs: elapsed(),
        error: 'POST defend_insights response missing id',
      };
    }

    this.log.info(`Defend insight ${insightId} created for ${endpointId}; polling`);
    return this.pollUntilDone({ insightId, startedAt, pollMaxWaitMs });
  }

  private async pollUntilDone({
    insightId,
    startedAt,
    pollMaxWaitMs,
  }: {
    insightId: string;
    startedAt: number;
    pollMaxWaitMs: number;
  }): Promise<DefendInsightsTaskOutput> {
    const path = DEFEND_INSIGHTS_BY_ID.replace('{id}', encodeURIComponent(insightId));
    const deadline = startedAt + pollMaxWaitMs;
    const notFoundDeadline = Date.now() + INSIGHT_NOT_FOUND_GRACE_MS;

    while (Date.now() < deadline) {
      try {
        const { data } = await this.fetch<GetDefendInsightResponse>(path, {
          method: 'GET',
          headers: { 'elastic-api-version': INTERNAL_API_VERSION },
        });

        if (data && TERMINAL_STATUSES.has(data.status)) {
          const terminal = data.status as 'succeeded' | 'failed' | 'canceled';
          return {
            status: terminal,
            insights: terminal === 'succeeded' ? data.insights : null,
            insightId,
            latencyMs: Date.now() - startedAt,
            ...(terminal === 'succeeded'
              ? {}
              : { error: `generation ${terminal}: ${data.failureReason ?? terminal}` }),
          };
        }
      } catch (e) {
        const status = statusOf(e);
        const inNotFoundGrace = status === 404 && Date.now() < notFoundDeadline;
        if (!isRetryable(status) && !inNotFoundGrace) {
          return {
            status: 'request_failed',
            insights: null,
            insightId,
            latencyMs: Date.now() - startedAt,
            error: `GET defend_insights/${insightId} HTTP ${status ?? 'n/a'}: ${describeError(e)}`,
          };
        }
      }

      await sleep(POLL_INTERVAL_MS);
    }

    return {
      status: 'timed_out',
      insights: null,
      insightId,
      latencyMs: Date.now() - startedAt,
      error: `poll timed out after ${pollMaxWaitMs / 1000}s`,
    };
  }
}
