/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ToolingLog } from '@kbn/tooling-log';
import { RuleCreationClient } from './rule_creation_client';

// Opt-in stack smoke: real HTTP, Elasticsearch and workflow runtime, not a mocked executor.
const live = process.env.RULE_CREATION_LIVE_SMOKE === '1' ? describe : describe.skip;
live('production coverage-chain stack smoke', () => {
  it('runs the actual suite client and records the inherited creation/preview/proposal identities', async () => {
    const base = process.env.TEST_KIBANA_URL ?? 'http://localhost:5620';
    const username = process.env.TEST_USERNAME ?? 'elastic';
    const password = process.env.TEST_PASSWORD ?? 'changeme';
    const fetch = (async (
      path: string,
      options: {
        method?: string;
        body?: string;
        query?: Record<string, unknown>;
        headers?: Record<string, string>;
      } = {}
    ) => {
      const url = new URL(base + path);
      for (const [key, value] of Object.entries(options.query ?? {})) {
        for (const item of Array.isArray(value) ? value : [value])
          url.searchParams.append(key, String(item));
      }
      const response = await globalThis.fetch(url, {
        method: options.method,
        body: options.body,
        headers: {
          authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
          'content-type': 'application/json',
          ...options.headers,
        },
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${options.method} ${path}: ${response.status} ${text}`);
      return text ? JSON.parse(text) : undefined;
    }) as HttpHandler;
    const esClient = new Client({
      node: process.env.TEST_ES_URL ?? 'http://localhost:9220',
      auth: { username, password },
    });
    const client = new RuleCreationClient(
      fetch,
      new ToolingLog({ level: 'info', writeTo: process.stdout }),
      esClient
    );
    try {
      const result = await client.run({
        input: {
          technique: 'T1059.001',
          gap_description: 'No rule for encoded PowerShell',
          evidence: 'powershell -enc evidence',
          confidence: 0.9,
        },
        pollIntervalMs: 500,
        maxWaitMs: 180_000,
      });
      expect(result.pendingApproval).toBe(true);
      expect(result.rule).toBeDefined();
      const creation = await fetch<{
        effectiveIdentity?: unknown;
        stepExecutions: Array<{
          stepId: string;
          state?: { executionId?: string };
          output?: { executionId?: string };
        }>;
      }>(`/api/workflows/executions/${result.workflowExecutionId}`, {
        headers: { 'elastic-api-version': '2023-10-31' },
        query: { includeOutput: true },
      });
      process.stdout.write(
        `${JSON.stringify([
          'CREATION_IDENTITY',
          result.workflowExecutionId,
          creation.effectiveIdentity,
        ])}\n`
      );
      expect(creation.effectiveIdentity).toMatchObject({ type: 'service_account' });
      for (const stepId of ['preview_creation', 'propose_creation']) {
        const step = creation.stepExecutions.find(
          (s) => s.stepId === stepId && (s.state?.executionId || s.output?.executionId)
        );
        const id = step?.state?.executionId ?? step?.output?.executionId;
        expect(id).toBeDefined();
        const child = await fetch<{ effectiveIdentity?: unknown }>(
          `/api/workflows/executions/${id}`,
          {
            headers: { 'elastic-api-version': '2023-10-31' },
          }
        );
        process.stdout.write(
          `${JSON.stringify(['CHILD_IDENTITY', stepId, id, child.effectiveIdentity])}\n`
        );
        expect(child.effectiveIdentity).toMatchObject({ type: 'service_account' });
      }
    } finally {
      await client.cancelPending();
      await esClient.close();
    }
  }, 300_000);
});
