/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { CoverageChain, childExecutionId } from './coverage_chain';

const workerId = 'system-security-detection-rule-coverage-default';
const accountId = 'kibana/alertzero_rule_coverage';
const input = { technique: 'T1078', gap_description: 'gap', evidence: 'events', confidence: 0.9 };

const stack = ({ bound = true, verdict = 'no_coverage', identity = true, enabled = true } = {}) => {
  let kiId: string;
  let cancelled = false;
  let patched = false;
  const esClient = {
    index: jest.fn(async ({ id }) => {
      kiId = id;
    }),
    delete: jest.fn(async () => ({})),
  };
  const fetch = jest.fn(
    async (
      url: string,
      options: { method?: string; body?: string; query?: { statuses?: string[] } } = {}
    ) => {
      if (url === '/internal/alertzero/workers') {
        return {
          workers: [
            {
              id: 'system-security-detection-rule-coverage',
              enabled: patched || enabled,
              workflowId: workerId,
              settingsRevision: 1,
              settings: { serviceAccountId: accountId },
            },
          ],
        };
      }
      if (url === '/internal/alertzero/workers/system-security-detection-rule-coverage') {
        patched = true;
        return {};
      }
      if (url.endsWith(`/workflow/${workerId}`)) {
        return { definition: { settings: { run_as: bound ? accountId : undefined } } };
      }
      if (url === '/internal/spaces/_active_space') return { id: 'example-space' };
      if (url.endsWith('/executions/cancel')) return {};
      if (
        url.endsWith('/executions') &&
        url.includes(workerId) &&
        !enabled &&
        !kiId &&
        options.query?.statuses?.includes('completed')
      ) {
        return { results: [{ triggeredBy: 'scheduled', startedAt: new Date().toISOString() }] };
      }
      if (url.endsWith('/executions')) {
        return {
          results:
            url.includes('coverage-review') && kiId
              ? [
                  { id: 'unrelated-review', concurrencyGroupKey: `coverage-${kiId}` },
                  { id: 'review', concurrencyGroupKey: `coverage-${kiId}` },
                ]
              : [],
        };
      }
      if (url.endsWith('/run')) {
        if (!url.includes(workerId)) {
          throw new Error(
            'Service account inheritance requires a parent executing as a service account.'
          );
        }
        return { workflowExecutionId: 'worker' };
      }
      if (url.endsWith('/cancel')) {
        cancelled = true;
        return {};
      }
      const id = url.split('/').pop();
      if (id === 'unrelated-review')
        return { context: { parentWorkflowExecutionId: 'other-sweep' } };
      if (id === 'worker')
        return {
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            {
              stepId: 'run_rule_coverage',
              stepType: 'workflow.execute',
              state: { executionId: 'sweep' },
            },
          ],
        };
      if (id === 'sweep') return { status: ExecutionStatus.COMPLETED };
      if (id === 'review')
        return {
          id,
          status: cancelled ? ExecutionStatus.CANCELLED : ExecutionStatus.WAITING_FOR_CHILD,
          context: { parentWorkflowExecutionId: 'sweep' },
          stepExecutions:
            verdict === 'no_coverage'
              ? [
                  {
                    stepId: 'run_rule_creation',
                    stepType: 'workflow.execute',
                    state: { executionId: 'creation' },
                  },
                ]
              : [{ stepId: 'coverage_check', output: { structured_output: { verdict } } }],
        };
      if (id === 'creation')
        return {
          status: cancelled ? ExecutionStatus.CANCELLED : ExecutionStatus.WAITING_FOR_CHILD,
          effectiveIdentity: identity ? { type: 'service_account', id: accountId } : undefined,
          context: { inputs: { investigation_id: 'investigation' } },
        };
      return {};
    }
  );
  return {
    fetch,
    esClient,
    chain: new CoverageChain(fetch as unknown as HttpHandler, esClient as unknown as EsClient),
  };
};

describe('CoverageChain', () => {
  it('waits for the immediate bind tick before draining and seeding', async () => {
    const { chain, fetch, esClient } = stack({ enabled: false });
    await chain.start(input, Date.now() + 2_000, 1);
    const tickRead = fetch.mock.calls.findIndex(
      ([url, options]) =>
        url === `/api/workflows/workflow/${workerId}/executions` &&
        options?.query?.statuses?.includes('completed')
    );
    const drain = fetch.mock.calls.findIndex(([url]) => url.endsWith('/executions/cancel'));
    expect(tickRead).toBeGreaterThan(-1);
    expect(drain).toBeGreaterThan(tickRead);
    expect(esClient.index.mock.invocationCallOrder[0]).toBeGreaterThan(
      fetch.mock.invocationCallOrder[drain]
    );
  });

  it('binds the production worker, seeds a per-space KI and follows only its exact descendants', async () => {
    const { chain, fetch, esClient } = stack();
    await expect(chain.start(input, Date.now() + 2_000, 1)).resolves.toEqual({
      workflowExecutionId: 'creation',
      investigationId: 'investigation',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/internal/alertzero/workers/'),
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(fetch).toHaveBeenCalledWith(
      `/api/workflows/workflow/${workerId}/run`,
      expect.objectContaining({ body: JSON.stringify({ inputs: {} }) })
    );
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-security-investigations',
        refresh: 'wait_for',
        document: expect.objectContaining({
          type: 'security.coverage',
          title: 'gap',
          content: 'events',
          attributes: expect.objectContaining({
            status: 'pending',
            space_id: 'example-space',
            technique: 'T1078',
          }),
        }),
      })
    );
    expect(
      fetch.mock.calls.some(
        ([url]) => url === '/api/workflows/workflow/system-security-rule-creation/run'
      )
    ).toBe(false);
    await chain.cleanup(1);
    expect(esClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: esClient.index.mock.calls[0][0].id,
        refresh: 'wait_for',
      })
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/workflows/executions/review/cancel',
      expect.anything()
    );
  });

  it('cancels the previous owned review and deletes its KI before seeding the next example', async () => {
    const { chain, fetch, esClient } = stack();
    await chain.start(input, Date.now() + 2_000, 1);
    await chain.start(input, Date.now() + 2_000, 1);
    expect(esClient.index).toHaveBeenCalledTimes(2);
    expect(esClient.delete).toHaveBeenCalledTimes(1);
    expect(esClient.delete.mock.invocationCallOrder[0]).toBeLessThan(
      esClient.index.mock.invocationCallOrder[1]
    );
    expect(fetch).toHaveBeenCalledWith(
      '/api/workflows/executions/review/cancel',
      expect.anything()
    );
    expect(esClient.index.mock.calls[0][0].id).not.toBe(esClient.index.mock.calls[1][0].id);
  });

  it('rejects a missing run_as before seeding or running', async () => {
    const { chain, esClient } = stack({ bound: false });
    await expect(chain.start(input, Date.now() + 2_000, 1)).rejects.toThrow('settings.run_as');
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('fails loudly when coverage short-circuits creation rather than scoring empty drafts', async () => {
    const { chain } = stack({ verdict: 'covered_enabled' });
    await expect(chain.start(input, Date.now() + 2_000, 1)).rejects.toThrow(
      'so rule creation never ran'
    );
  });

  it('rejects a creation child without an effective service-account identity', async () => {
    const { chain } = stack({ identity: false });
    await expect(chain.start(input, Date.now() + 2_000, 1)).rejects.toThrow(
      'no inherited service account'
    );
  });

  it('reads synchronous child ids from state, not the synchronous output payload', () => {
    const execution = {
      stepExecutions: [
        {
          stepId: 'run_rule_creation',
          stepType: 'workflow.execute',
          output: { created: false },
          state: { executionId: 'creation' },
        },
      ],
    } as unknown as WorkflowExecutionDto;
    expect(childExecutionId(execution, 'run_rule_creation')).toBe('creation');
  });
});
