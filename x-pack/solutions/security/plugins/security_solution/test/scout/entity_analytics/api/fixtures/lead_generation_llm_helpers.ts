/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ApiServicesFixture } from '@kbn/scout-security';
import { LEAD_GENERATION_ROUTES } from './lead_generation_constants';

export const createLeadGenerationConnector = async ({
  apiServices,
  log,
}: {
  apiServices: ApiServicesFixture;
  log: ToolingLog;
}): Promise<{ connectorId: string; llmProxy: LlmProxy }> => {
  const llmProxy = await createLlmProxy(log);
  const connector = await apiServices.alerting.connectors.create({
    name: 'lead-generation-llm-proxy',
    connectorTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
      apiUrl: `http://localhost:${llmProxy.getPort()}`,
      defaultModel: 'gpt-4',
    },
    secrets: { apiKey: 'test-api-key' },
  });
  return { connectorId: connector.id, llmProxy };
};

export const cleanupLeadGenerationConnector = async ({
  apiServices,
  connectorId,
  llmProxy,
}: {
  apiServices: ApiServicesFixture;
  connectorId: string;
  llmProxy: LlmProxy;
}): Promise<void> => {
  llmProxy.close();
  await apiServices.alerting.connectors.delete(connectorId);
};

interface LeadGenerationStatusBody {
  lastExecutionUuid?: string;
  lastError?: string | null;
  totalLeads?: number;
}

interface MinimalApiClient {
  get: (
    url: string,
    options: { headers: Record<string, string>; responseType: 'json' }
  ) => Promise<{ body: unknown }>;
}

/**
 * `POST /generate` is fire-and-forget — it returns `executionUuid` before the
 * background pipeline runs. Polls `GET /status` until that same
 * `executionUuid` is reported back, throwing if the run failed.
 */
export const waitForLeadGenerationExecution = async ({
  apiClient,
  headers,
  executionUuid,
  timeoutMs = 30_000,
  pollIntervalMs = 500,
}: {
  apiClient: MinimalApiClient;
  headers: Record<string, string>;
  executionUuid: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<LeadGenerationStatusBody> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await apiClient.get(LEAD_GENERATION_ROUTES.STATUS, {
      headers,
      responseType: 'json',
    });
    const body = response.body as LeadGenerationStatusBody;

    if (body.lastExecutionUuid === executionUuid) {
      if (body.lastError) {
        throw new Error(
          `Lead generation pipeline failed (executionUuid=${executionUuid}): ${body.lastError}`
        );
      }
      return body;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for executionUuid=${executionUuid} to complete`
  );
};

/**
 * A minimal, schema-valid batch-synthesis response for a single candidate —
 * enough to satisfy `llmSynthesizeBatch`'s parsing without asserting on
 * narrative content, which is out of scope for the scout tests.
 */
export const mockSynthesisResponse = (): string =>
  JSON.stringify([
    {
      title: 'Test Lead Title',
      byline: 'Test byline',
      description: 'Test description citing seeded evidence.',
      tags: ['risk_escalation'],
      recommendations: ['Investigate this entity.'],
    },
  ]);
