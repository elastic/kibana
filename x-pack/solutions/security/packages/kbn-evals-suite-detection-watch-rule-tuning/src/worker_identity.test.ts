/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { RULE_TUNING_WORKER_ID, bindRuleTuningWorker } from './worker_identity';
import { findDispatchedSweepId } from './workflow_task';

const WORKFLOW_ID = `${RULE_TUNING_WORKER_ID}-default`;

/**
 * Minimal stand-in for the stack: the workers route, the service-account directory and the
 * installed workflow document. `honorsBinding: false` models the defect this suite guards
 * against — a PATCH that is accepted but never renders `run_as` into the workflow.
 */
const stackFetch = ({ honorsBinding }: { honorsBinding: boolean }) => {
  const worker = {
    id: RULE_TUNING_WORKER_ID,
    enabled: false,
    workflowId: WORKFLOW_ID as string | null,
    settingsRevision: 3 as number | null,
    settings: {} as { serviceAccountId?: string },
  };
  let runAs: string | undefined;
  const calls: Array<{
    method: string;
    url: string;
    body?: { name?: string; enabled?: boolean; settings?: { serviceAccountId?: string } };
  }> = [];

  const fetch = jest.fn(async (url: string, options: { method?: string; body?: string } = {}) => {
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ method, url, body });
    if (url === '/internal/security/service_account') {
      return method === 'GET'
        ? { serviceAccounts: [] }
        : { id: 'sa-1', name: body.name, enabled: true, assumable: true };
    }
    if (url.startsWith('/api/security/role/')) return {};
    if (url === '/internal/alertzero/workers' && method === 'GET') return { workers: [worker] };
    if (url === `/internal/alertzero/workers/${RULE_TUNING_WORKER_ID}` && method === 'PATCH') {
      worker.enabled = body.enabled;
      worker.settings = { serviceAccountId: body.settings.serviceAccountId };
      if (honorsBinding) runAs = body.settings.serviceAccountId;
      return {};
    }
    if (url === `/api/workflows/workflow/${WORKFLOW_ID}`) {
      return { definition: { settings: runAs ? { run_as: runAs } : {} } };
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  return { fetch: fetch as unknown as HttpHandler, calls };
};

describe('bindRuleTuningWorker', () => {
  it('creates the service account, binds it through the workers route and returns the workflow id', async () => {
    const { fetch, calls } = stackFetch({ honorsBinding: true });

    await expect(bindRuleTuningWorker(fetch)).resolves.toBe(WORKFLOW_ID);

    const patch = calls.find(({ method }) => method === 'PATCH');
    expect(patch?.body).toMatchObject({
      enabled: true,
      settingsRevision: 3,
      settings: { serviceAccountId: 'sa-1', extras: { fpCountThreshold: 2 } },
    });
  });

  it('throws when the installed worker has no settings.run_as after the bind', async () => {
    const { fetch } = stackFetch({ honorsBinding: false });

    await expect(bindRuleTuningWorker(fetch)).rejects.toThrow(/no matching settings\.run_as/);
  });
});

describe('findDispatchedSweepId', () => {
  const dispatcher = (steps: unknown[]) =>
    ({ stepExecutions: steps } as unknown as WorkflowExecutionDto);

  it('reads the execution id the bound worker emitted from run_rule_tuning', () => {
    expect(
      findDispatchedSweepId(
        dispatcher([{ stepId: 'run_rule_tuning', output: { executionId: 'sweep-1' } }])
      )
    ).toBe('sweep-1');
  });

  it('returns undefined until the dispatch step has run', () => {
    expect(findDispatchedSweepId(dispatcher([{ stepId: 'other' }]))).toBeUndefined();
    expect(findDispatchedSweepId(dispatcher([{ stepId: 'run_rule_tuning' }]))).toBeUndefined();
  });
});
