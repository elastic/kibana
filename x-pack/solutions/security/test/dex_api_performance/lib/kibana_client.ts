/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Logger } from './logger';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
  'content-type': 'application/json',
} as const;

const PUBLIC_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
  'content-type': 'application/json',
} as const;

export interface TimedResponse<T> {
  status: number;
  duration_ms: number;
  body: T;
}

export interface RuleInstallSummary {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
}

export interface PrebuiltRulesStatus {
  stats: {
    num_prebuilt_rules_installed: number;
    num_prebuilt_rules_to_install: number;
    num_prebuilt_rules_to_upgrade: number;
    num_prebuilt_rules_total_in_package: number;
  };
}

export interface ReviewRule {
  rule_id: string;
  version: number;
  name: string;
}

export interface ProcessMemoryMetrics {
  heap_used_bytes: number;
  heap_total_bytes: number;
  rss_bytes: number;
  event_loop_delay_ms: number;
}

export class KibanaClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(
    kibanaUrl: string,
    credentials: { username: string; password: string },
    private readonly logger: Logger
  ) {
    this.baseUrl = kibanaUrl.replace(/\/$/, '');
    this.authHeader =
      'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  }

  async checkHealth(): Promise<{ available: boolean; metrics: ProcessMemoryMetrics | null }> {
    const resp = await this.get('/api/status');
    const body = await resp.json();
    const available = body?.status?.overall?.level === 'available';
    let metrics: ProcessMemoryMetrics | null = null;

    try {
      const proc = body?.metrics?.process;
      if (proc) {
        metrics = {
          heap_used_bytes: proc.memory?.heap?.used_in_bytes ?? 0,
          heap_total_bytes: proc.memory?.heap?.total_in_bytes ?? 0,
          rss_bytes: proc.memory?.resident_set_size_in_bytes ?? 0,
          event_loop_delay_ms: proc.event_loop_delay ?? 0,
        };
      }
    } catch {
      // metrics not available
    }

    return { available, metrics };
  }

  async waitForHealthy(timeoutMs: number = 120_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const { available } = await this.checkHealth();
        if (available) return;
      } catch {
        // retry
      }
      await sleep(3000);
    }
    throw new Error(`Kibana at ${this.baseUrl} did not become healthy within ${timeoutMs}ms`);
  }

  async initializeSecuritySolution(): Promise<TimedResponse<unknown>> {
    return this.timedPost('/api/security_solution/initialize', PUBLIC_HEADERS, {
      flows: ['init-prebuilt-rules'],
    });
  }

  async getPrebuiltRulesStatus(): Promise<PrebuiltRulesStatus> {
    const resp = await this.get(
      '/internal/detection_engine/prebuilt_rules/status',
      INTERNAL_HEADERS
    );
    return resp.json();
  }

  async reviewRulesForInstall(
    page: number = 1,
    perPage: number = 500
  ): Promise<{ rules: ReviewRule[] }> {
    const resp = await this.post(
      '/internal/detection_engine/prebuilt_rules/installation/_review',
      INTERNAL_HEADERS,
      { page, per_page: perPage }
    );
    return resp.json();
  }

  async installAllRules(): Promise<TimedResponse<RuleInstallSummary>> {
    return this.timedPost(
      '/internal/detection_engine/prebuilt_rules/installation/_perform',
      INTERNAL_HEADERS,
      { mode: 'ALL_RULES' }
    );
  }

  async installSpecificRules(
    rules: Array<{ rule_id: string; version: number }>
  ): Promise<TimedResponse<RuleInstallSummary>> {
    return this.timedPost(
      '/internal/detection_engine/prebuilt_rules/installation/_perform',
      INTERNAL_HEADERS,
      { mode: 'SPECIFIC_RULES', rules }
    );
  }

  async deleteAllRules(): Promise<TimedResponse<unknown>> {
    return this.timedPost('/api/detection_engine/rules/_bulk_action', PUBLIC_HEADERS, {
      action: 'delete',
      query: '',
    });
  }

  async findRules(perPage: number = 1): Promise<TimedResponse<{ total: number }>> {
    const start = performance.now();
    const resp = await this.get(
      `/api/detection_engine/rules/_find?page=1&per_page=${perPage}`,
      PUBLIC_HEADERS
    );
    const duration_ms = Math.round(performance.now() - start);
    const body = await resp.json();
    return { status: resp.status, duration_ms, body };
  }

  async waitForRulesCount(
    expected: number,
    timeoutMs: number = 60_000
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await this.getPrebuiltRulesStatus();
      if (status.stats.num_prebuilt_rules_installed === expected) return;
      await sleep(2000);
    }
    throw new Error(`Rules count did not reach ${expected} within ${timeoutMs}ms`);
  }

  async getProcessMetrics(): Promise<ProcessMemoryMetrics | null> {
    const { metrics } = await this.checkHealth();
    return metrics;
  }

  private async get(
    path: string,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`GET ${path}`);
    return fetch(url, {
      method: 'GET',
      headers: { Authorization: this.authHeader, ...headers },
    });
  }

  private async post(
    path: string,
    headers: Record<string, string>,
    body: unknown
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`POST ${path}`);
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: this.authHeader, ...headers },
      body: JSON.stringify(body),
    });
  }

  private async timedPost<T>(
    path: string,
    headers: Record<string, string>,
    body: unknown
  ): Promise<TimedResponse<T>> {
    const start = performance.now();
    const resp = await this.post(path, headers, body);
    const duration_ms = Math.round(performance.now() - start);
    const respBody = await resp.json();
    return { status: resp.status, duration_ms, body: respBody as T };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
