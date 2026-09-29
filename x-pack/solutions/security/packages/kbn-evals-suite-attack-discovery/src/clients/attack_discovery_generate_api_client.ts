/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Client for the production Attack Discovery `_generate` API.
 *
 * Mirrors Chrysalis's `run_attack_discovery.py` flow:
 *   1. POST /api/attack_discovery/_generate → { execution_uuid }
 *   2. poll GET /api/attack_discovery/generations/{uuid} until terminal
 *   3. return discoveries + alerts_context_count + latency
 *
 * This exercises the FULL production AD pipeline (anonymization, alert
 * context assembly, AD-specific prompts) — unlike the direct-inference
 * mode in {@link runAttackDiscovery} which tests model reasoning in isolation.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { KbnClientRequesterError } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import {
  ATTACK_DISCOVERY_GENERATE,
  ATTACK_DISCOVERY_GENERATIONS_BY_ID,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
} from '@kbn/elastic-assistant-common';

const PUBLIC_API_VERSION = '2023-10-31';

const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts-default';
const DEFAULT_SIZE = 100;
const DEFAULT_START = 'now-24h';
const DEFAULT_END = 'now';

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'canceled', 'dismissed']);
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_WAIT_MS = 1500_000;
const GENERATION_NOT_FOUND_GRACE_MS = 120_000;

export interface AnonymizationField {
  readonly id: string;
  readonly field: string;
  readonly allowed: boolean;
  readonly anonymized: boolean;
}

export interface GenerateApiOptions {
  readonly connectorId: string;
  readonly actionTypeId?: string;
  readonly modelId?: string;
  readonly alertsIndexPattern?: string;
  readonly size?: number;
  readonly start?: string;
  readonly end?: string;
}

export interface GenerateApiResult {
  readonly discoveries: AttackDiscovery[];
  readonly executionUuid: string;
  readonly status: string;
  readonly alertsContextCount?: number;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface AttackDiscoveryGenerateApiClientConfig {
  readonly fetch: HttpHandler;
  readonly log: ToolingLog;
}

interface AnonymizationFieldsResponse {
  data?: Array<Record<string, unknown>>;
}

interface GenerateResponse {
  execution_uuid?: string;
}

interface GenerationPollResponse {
  generation?: {
    status?: string;
    reason?: string;
    alerts_context_count?: number;
  };
  data?: AttackDiscovery[];
}

const extractStatusFromError = (e: unknown): number | undefined => {
  const err = e as Partial<KbnClientRequesterError>;
  return typeof err?.status === 'number' ? err.status : undefined;
};

const extractBodyTextFromError = (e: unknown): string => {
  if (e instanceof Error) return e.message.slice(0, 800);
  return String(e).slice(0, 800);
};

export class AttackDiscoveryGenerateApiClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async fetchAnonymizationFields(): Promise<AnonymizationField[]> {
    try {
      const query = { page: '1', per_page: '1000' };
      const payload = await this.fetch<AnonymizationFieldsResponse>(
        `${ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND}`,
        {
          method: 'GET',
          version: PUBLIC_API_VERSION,
          query,
        }
      );

      return (payload.data ?? []).map((f) => ({
        id: String(f.id ?? ''),
        field: String(f.field ?? ''),
        allowed: f.allowed !== false,
        anonymized: f.anonymized === true,
      }));
    } catch (e) {
      this.log.warning(
        `anonymization_fields find failed (${extractStatusFromError(e) ?? 'n/a'}); using empty list`
      );
      return [];
    }
  }

  async generate(opts: GenerateApiOptions): Promise<GenerateApiResult> {
    const t0 = Date.now();

    const anonymizationFields = await this.fetchAnonymizationFields();

    const body: Record<string, unknown> = {
      alertsIndexPattern: opts.alertsIndexPattern ?? DEFAULT_ALERTS_INDEX,
      anonymizationFields,
      apiConfig: {
        connectorId: opts.connectorId,
        actionTypeId: opts.actionTypeId ?? '.inference',
        ...(opts.modelId ? { model: opts.modelId } : {}),
      },
      size: opts.size ?? DEFAULT_SIZE,
      start: opts.start ?? DEFAULT_START,
      end: opts.end ?? DEFAULT_END,
      replacements: {},
      subAction: 'invokeAI',
    };

    let executionUuid: string;

    try {
      const generatePayload = await this.fetch<GenerateResponse>(ATTACK_DISCOVERY_GENERATE, {
        method: 'POST',
        version: PUBLIC_API_VERSION,
        body: JSON.stringify(body),
        headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
      });

      executionUuid = generatePayload.execution_uuid ?? '';
    } catch (e) {
      return {
        discoveries: [],
        executionUuid: '',
        status: 'failed',
        latencyMs: Date.now() - t0,
        error: `generate HTTP ${extractStatusFromError(e) ?? 'n/a'}: ${extractBodyTextFromError(
          e
        )}`,
      };
    }

    if (!executionUuid) {
      return {
        discoveries: [],
        executionUuid: '',
        status: 'failed',
        latencyMs: Date.now() - t0,
        error: 'generate response missing execution_uuid',
      };
    }

    const { discoveries, status, alertsContextCount, error } = await this.pollUntilDone(
      executionUuid
    );

    return {
      discoveries,
      executionUuid,
      status,
      alertsContextCount,
      latencyMs: Date.now() - t0,
      error,
    };
  }

  private async pollUntilDone(executionUuid: string): Promise<{
    discoveries: AttackDiscovery[];
    status: string;
    alertsContextCount?: number;
    error?: string;
  }> {
    const endpoint = ATTACK_DISCOVERY_GENERATIONS_BY_ID.replace(
      '{execution_uuid}',
      encodeURIComponent(executionUuid)
    );
    const query = {
      enable_field_rendering: 'false',
      with_replacements: 'true',
    };

    const deadline = Date.now() + POLL_MAX_WAIT_MS;
    const notFoundGraceDeadline = Date.now() + GENERATION_NOT_FOUND_GRACE_MS;

    while (Date.now() < deadline) {
      let status: number | undefined;
      let payload: GenerationPollResponse | undefined;

      try {
        payload = await this.fetch<GenerationPollResponse>(endpoint, {
          method: 'GET',
          version: PUBLIC_API_VERSION,
          query,
        });
      } catch (e) {
        status = extractStatusFromError(e);
        const shouldRetry = status === 429 || (status !== undefined && status >= 500);
        const isNotFoundGrace = status === 404 && Date.now() < notFoundGraceDeadline;

        if (shouldRetry || isNotFoundGrace) {
          await sleep(POLL_INTERVAL_MS);
        } else if (status === 404) {
          return {
            discoveries: [],
            status: 'failed',
            error: `poll HTTP 404 (generation never materialized): ${extractBodyTextFromError(
              e
            ).slice(0, 400)}`,
          };
        } else {
          return {
            discoveries: [],
            status: 'failed',
            error: `poll HTTP ${status ?? 'n/a'}: ${extractBodyTextFromError(e)}`,
          };
        }
      }

      const generation = payload?.generation ?? {};
      const genStatus = String(generation.status ?? '');

      if (TERMINAL_STATUSES.has(genStatus)) {
        const data = payload?.data ?? [];

        if (genStatus !== 'succeeded') {
          return {
            discoveries: [],
            status: genStatus,
            error: `generation ${genStatus}: ${String(generation.reason ?? genStatus)}`,
          };
        }

        return {
          discoveries: data,
          status: genStatus,
          alertsContextCount: generation.alerts_context_count,
        };
      }

      await sleep(POLL_INTERVAL_MS);
    }

    return {
      discoveries: [],
      status: 'timed_out',
      error: `poll timed out after ${POLL_MAX_WAIT_MS / 1000}s`,
    };
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
