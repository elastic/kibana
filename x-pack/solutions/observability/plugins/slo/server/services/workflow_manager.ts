/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { getSLOWorkflowId } from '../../common/constants';
import type { SLODefinition } from '../domain/models';
import { generateEsqlSloWorkflowYaml } from './esql_workflow_template';

type WorkflowId = string;

export interface WorkflowManager {
  create(slo: SLODefinition): Promise<WorkflowId>;
  update(slo: SLODefinition): Promise<WorkflowId>;
  delete(workflowId: WorkflowId): Promise<void>;
  enable(workflowId: WorkflowId): Promise<void>;
  disable(workflowId: WorkflowId): Promise<void>;
}

interface WorkflowManagerDeps {
  kibanaUrl: string;
  request: KibanaRequest;
  logger: Logger;
  spaceId: string;
}

const RETRYABLE_STATUS_CODES = [408, 429, 502, 503, 504];
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Retry wrapper for HTTP calls to the Workflow API.
 * Unlike retryTransientEsErrors which checks for ES client error types,
 * this checks the statusCode property on plain Error objects thrown by callWorkflowApi.
 */
const retryTransientHttpErrors = async <T>(
  httpCall: () => Promise<T>,
  { logger, attempt = 0 }: { logger?: Logger; attempt?: number } = {}
): Promise<T> => {
  try {
    return await httpCall();
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    const isRetryable = statusCode !== undefined && RETRYABLE_STATUS_CODES.includes(statusCode);

    if (attempt < MAX_RETRY_ATTEMPTS && isRetryable) {
      const retryCount = attempt + 1;
      const retryDelaySec = Math.min(Math.pow(2, retryCount), 64);

      logger?.warn(
        `Retrying Workflow API call after [${retryDelaySec}s] due to error: ${e.toString()}`
      );

      await setTimeout(retryDelaySec * 1000);
      return retryTransientHttpErrors(httpCall, { logger, attempt: retryCount });
    }

    throw e;
  }
};

export class DefaultWorkflowManager implements WorkflowManager {
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly spaceId: string;
  private readonly request: KibanaRequest;

  constructor(deps: WorkflowManagerDeps) {
    this.baseUrl = deps.kibanaUrl;
    this.logger = deps.logger;
    this.spaceId = deps.spaceId;
    this.request = deps.request;
  }

  async create(slo: SLODefinition): Promise<WorkflowId> {
    const workflowId = getSLOWorkflowId(slo.id, slo.revision);
    const yaml = generateEsqlSloWorkflowYaml(slo, this.spaceId);

    this.logger.debug(`Creating workflow [${workflowId}] for ESQL SLO [${slo.id}]`);

    await retryTransientHttpErrors(
      () =>
        this.callWorkflowApi('POST', '/api/workflows/workflow', {
          id: workflowId,
          yaml,
          enabled: true,
        }),
      { logger: this.logger }
    );

    return workflowId;
  }

  async update(slo: SLODefinition): Promise<WorkflowId> {
    const workflowId = getSLOWorkflowId(slo.id, slo.revision);
    const yaml = generateEsqlSloWorkflowYaml(slo, this.spaceId);

    this.logger.debug(`Updating workflow [${workflowId}] for ESQL SLO [${slo.id}]`);

    await retryTransientHttpErrors(
      () =>
        this.callWorkflowApi('PUT', `/api/workflows/workflow/${encodeURIComponent(workflowId)}`, {
          yaml,
        }),
      { logger: this.logger }
    );

    return workflowId;
  }

  async delete(workflowId: WorkflowId): Promise<void> {
    this.logger.debug(`Deleting workflow [${workflowId}]`);

    try {
      await this.callWorkflowApi(
        'DELETE',
        `/api/workflows/workflow/${encodeURIComponent(workflowId)}?force=true`
      );
    } catch (err) {
      // Ignore 404 — workflow may already be gone
      if (err.statusCode !== 404) {
        throw err;
      }
      this.logger.debug(`Workflow [${workflowId}] not found, skipping delete`);
    }
  }

  async enable(workflowId: WorkflowId): Promise<void> {
    this.logger.debug(`Enabling workflow [${workflowId}]`);

    await retryTransientHttpErrors(
      () =>
        this.callWorkflowApi(
          'POST',
          `/api/workflows/workflow/${encodeURIComponent(workflowId)}/_enable`
        ),
      { logger: this.logger }
    );
  }

  async disable(workflowId: WorkflowId): Promise<void> {
    this.logger.debug(`Disabling workflow [${workflowId}]`);

    await retryTransientHttpErrors(
      () =>
        this.callWorkflowApi(
          'POST',
          `/api/workflows/workflow/${encodeURIComponent(workflowId)}/_disable`
        ),
      { logger: this.logger }
    );
  }

  private async callWorkflowApi(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const basePath = this.spaceId !== 'default' ? `/s/${this.spaceId}` : '';
    const url = `${this.baseUrl}${basePath}${path}`;

    const headers: Record<string, string> = {
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
    };

    // Forward the request auth header for the internal Kibana API call
    if (this.request.headers.authorization) {
      headers.authorization = this.request.headers.authorization as string;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      const err = new Error(
        `Workflow API ${method} ${path} failed with status ${response.status}: ${errorBody}`
      );
      (err as any).statusCode = response.status;
      throw err;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return undefined;
  }
}
