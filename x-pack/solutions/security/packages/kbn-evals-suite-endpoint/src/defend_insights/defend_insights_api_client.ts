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
/** Cap on a single HTTP request; the remaining poll budget shortens it near the deadline. */
export const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_LENGTH = 800;
const ANONYMIZATION_FIELDS_PAGE_SIZE = 1000;

/**
 * Fields the retriever and the model need. If any is missing or not allowed, or the executable path
 * is anonymized, events are still counted (so `eventsContextCount` looks healthy) but the model
 * sees nothing useful, and the negative control would pass vacuously.
 */
const REQUIRED_ALLOWED_FIELDS = ['process.executable', 'agent.id', '_id'] as const;
const REQUIRED_UNANONYMIZED_FIELD = 'process.executable';

/** Creates the abort signal for one request; injectable so tests can drive it with fake timers. */
export type RequestSignalFactory = (timeoutMs: number) => AbortSignal;
const defaultSignalFactory: RequestSignalFactory = (timeoutMs) => AbortSignal.timeout(timeoutMs);

type AnonymizationFields = DefendInsightsPostRequestBodyInput['anonymizationFields'];

interface AnonymizationFieldsFindResponse {
  data?: AnonymizationFields;
  total?: number;
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

/** `KbnClientRequester` wraps an aborted request in an error that carries the original as `cause`. */
const isTimeoutError = (e: unknown): boolean => {
  for (let current = e, depth = 0; current instanceof Error && depth < 5; depth++) {
    if (current.name === 'TimeoutError' || current.name === 'AbortError') return true;
    current = current.cause;
  }
  return false;
};

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
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly createSignal: RequestSignalFactory = defaultSignalFactory
  ) {}

  /**
   * Reads the anonymization fields the UI would send. The route does not cap `per_page`, but the
   * response carries `total`, so truncation is detected instead of silently sending a partial list.
   * Throws (the caller maps it to `request_failed`) on an error, an empty or truncated list, or a
   * list that does not expose `process.executable`, `agent.id` and `_id` as allowed with
   * `process.executable` un-anonymized: without them the route sends the model no usable events,
   * and the run would "succeed" with empty insights.
   */
  async fetchAnonymizationFields(): Promise<AnonymizationFields> {
    let payload: AnonymizationFieldsFindResponse;
    try {
      payload = await this.fetch<AnonymizationFieldsFindResponse>(
        ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
        {
          method: 'GET',
          version: PUBLIC_API_VERSION,
          query: { page: '1', per_page: String(ANONYMIZATION_FIELDS_PAGE_SIZE) },
          signal: this.createSignal(REQUEST_TIMEOUT_MS),
        }
      );
    } catch (e) {
      throw new Error(
        `anonymization_fields find HTTP ${statusOf(e) ?? 'n/a'}: ${describeError(e)}`
      );
    }

    const data = payload.data ?? [];
    if (data.length === 0) {
      throw new Error('anonymization_fields find returned no fields');
    }
    if (typeof payload.total === 'number' && payload.total > data.length) {
      throw new Error(`anonymization_fields find truncated: ${data.length} of ${payload.total}`);
    }

    for (const field of REQUIRED_ALLOWED_FIELDS) {
      const entry = data.find((candidate) => candidate.field === field);
      if (!entry) {
        throw new Error(`anonymization field "${field}" is missing`);
      }
      if (entry.allowed !== true) {
        throw new Error(`anonymization field "${field}" is not allowed`);
      }
    }
    const executable = data.find(({ field }) => field === REQUIRED_UNANONYMIZED_FIELD);
    if (executable?.anonymized) {
      throw new Error(`anonymization field "${REQUIRED_UNANONYMIZED_FIELD}" is anonymized`);
    }
    return data;
  }

  async generateIncompatibleAntivirus({
    endpointId,
    connectorId,
    actionTypeId,
    pollMaxWaitMs = DEFEND_INSIGHTS_POLL_MAX_WAIT_MS,
  }: GenerateDefendInsightsOptions): Promise<DefendInsightsTaskOutput> {
    const startedAt = Date.now();
    const elapsed = () => Date.now() - startedAt;

    let anonymizationFields: AnonymizationFields;
    try {
      anonymizationFields = await this.fetchAnonymizationFields();
    } catch (e) {
      return {
        status: 'request_failed',
        insights: null,
        latencyMs: elapsed(),
        error: describeError(e),
      };
    }

    const body: DefendInsightsPostRequestBodyInput = {
      endpointIds: [endpointId],
      insightType: 'incompatible_antivirus',
      anonymizationFields,
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
        signal: this.createSignal(REQUEST_TIMEOUT_MS),
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
          signal: this.createSignal(
            Math.max(1, Math.min(deadline - Date.now(), REQUEST_TIMEOUT_MS))
          ),
        });

        if (data && TERMINAL_STATUSES.has(data.status)) {
          const terminal = data.status as 'succeeded' | 'failed' | 'canceled';
          return {
            status: terminal,
            insights: terminal === 'succeeded' ? data.insights : null,
            insightId,
            eventsContextCount: data.eventsContextCount,
            latencyMs: Date.now() - startedAt,
            ...(terminal === 'succeeded'
              ? {}
              : { error: `generation ${terminal}: ${data.failureReason ?? terminal}` }),
          };
        }
      } catch (e) {
        const status = statusOf(e);
        const inNotFoundGrace = status === 404 && Date.now() < notFoundDeadline;
        // A single request that hit its own timeout is transient; the overall deadline still bounds the poll.
        if (!isRetryable(status) && !inNotFoundGrace && !isTimeoutError(e)) {
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
