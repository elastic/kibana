/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Lead, LeadGenerationStatus } from '../types';

const GENERATE_URL = '/internal/entity_analytics/leads/generate';
const LEADS_URL = '/internal/entity_analytics/leads';
const STATUS_URL = '/internal/entity_analytics/leads/status';

const INTERNAL_API_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
};

// Short interval reduces the window in which a concurrent generate call can
// overwrite the status UUID before this instance has a chance to observe it.
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 5 * 60_000;

interface FindLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  perPage: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class LeadGenerationClient {
  constructor(private readonly kbnClient: KbnClient, private readonly log: ToolingLog) {}

  async generate({
    connectorId,
    maxLeads,
  }: {
    connectorId: string;
    maxLeads?: number;
  }): Promise<{ executionUuid: string }> {
    this.log.info(
      `[LeadGenerationClient] Triggering lead generation (connectorId=${connectorId}, maxLeads=${
        maxLeads ?? 'default'
      })`
    );

    const body: Record<string, unknown> = { connectorId };
    if (maxLeads !== undefined) {
      body.maxLeads = maxLeads;
    }

    const response = await this.kbnClient.request<{ executionUuid: string }>({
      path: GENERATE_URL,
      method: 'POST',
      headers: INTERNAL_API_HEADERS,
      body,
    });

    const { executionUuid } = response.data;
    this.log.info(`[LeadGenerationClient] Generation started (executionUuid=${executionUuid})`);
    return { executionUuid };
  }

  async getStatus(): Promise<LeadGenerationStatus> {
    const response = await this.kbnClient.request<LeadGenerationStatus>({
      path: STATUS_URL,
      method: 'GET',
      headers: INTERNAL_API_HEADERS,
    });
    return response.data;
  }

  async findLeads(query?: {
    page?: number;
    perPage?: number;
    sortField?: 'priority' | 'timestamp';
    sortOrder?: 'asc' | 'desc';
    status?: 'active' | 'dismissed' | 'expired';
  }): Promise<FindLeadsResponse> {
    const response = await this.kbnClient.request<FindLeadsResponse>({
      path: LEADS_URL,
      method: 'GET',
      headers: INTERNAL_API_HEADERS,
      query: query as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  }

  /**
   * Triggers generation and polls the status endpoint until the execution
   * completes (identified by `lastExecutionUuid === executionUuid`).
   *
   * Resolves with the generated leads on success, rejects on error or timeout.
   */
  async generateAndWait({
    connectorId,
    maxLeads,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: {
    connectorId: string;
    maxLeads?: number;
    pollIntervalMs?: number;
    timeoutMs?: number;
  }): Promise<{ leads: Lead[]; executionUuid: string }> {
    const { executionUuid } = await this.generate({ connectorId, maxLeads });

    const deadline = Date.now() + timeoutMs;

    this.log.info(
      `[LeadGenerationClient] Waiting for execution to complete (executionUuid=${executionUuid}, timeoutMs=${timeoutMs})`
    );

    while (Date.now() < deadline) {
      await sleep(pollIntervalMs);

      const status = await this.getStatus().catch((err: Error) => {
        this.log.warning(
          new Error('[LeadGenerationClient] Failed to fetch status; retrying...', { cause: err })
        );
        return undefined;
      });

      if (status && status.lastExecutionUuid === executionUuid) {
        if (status.lastError) {
          throw new Error(
            `Lead generation pipeline failed (executionUuid=${executionUuid}): ${status.lastError}`
          );
        }

        this.log.info(
          `[LeadGenerationClient] Execution completed (executionUuid=${executionUuid}, totalLeads=${status.totalLeads})`
        );

        const { leads } = await this.findLeads({ perPage: 100 });
        return { leads, executionUuid };
      }

      this.log.debug(
        `[LeadGenerationClient] Still waiting... (lastExecutionUuid=${
          status?.lastExecutionUuid ?? 'none'
        }, target=${executionUuid})`
      );
    }

    throw new Error(
      `Lead generation timed out after ${timeoutMs}ms (executionUuid=${executionUuid})`
    );
  }
}
