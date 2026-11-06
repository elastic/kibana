/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createWorkflowValidityEvaluator,
  extractWorkflowYaml,
} from './workflow_validity_evaluator';
import { buildOutput } from '../__fixtures__/task_output_builders';
import { STUB_CONNECTOR_ID } from '../fixtures/stub_connector';

const YAML =
  'name: demo\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: a\n    type: console\n';

interface Call {
  path: string;
  method?: string;
  body?: string;
  query?: Record<string, unknown>;
}

const setup = ({
  workflow = { id: 'wf-1', enabled: true } as Record<string, unknown>,
  statuses = ['running', 'completed'],
  failOn,
  failDelete = false,
  deleteFailures = failDelete ? Number.POSITIVE_INFINITY : 0,
  failCancel = false,
  failPoll,
  statusAfterCancel = 'cancelled',
  allowedConnectorIds,
}: {
  workflow?: Record<string, unknown>;
  statuses?: string[];
  failOn?: 'create' | 'enable' | 'run';
  failDelete?: boolean;
  deleteFailures?: number;
  failCancel?: boolean;
  /** Poll (GET) index, 0-based, that throws. */
  failPoll?: number;
  statusAfterCancel?: string;
  allowedConnectorIds?: readonly string[];
} = {}) => {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  let pollIndex = 0;
  let cancelled = false;
  let deleteAttempts = 0;
  let clock = 0;
  const fetch = jest.fn(async (call: Call) => {
    calls.push(call);
    const { path, method } = call;
    if (method === 'POST' && path === '/api/workflows/workflow') {
      if (failOn === 'create') throw new Error('invalid workflow');
      return workflow;
    }
    if (method === 'PUT') {
      if (failOn === 'enable') throw new Error('cannot enable');
      return {};
    }
    if (method === 'POST' && path.endsWith('/run')) {
      if (failOn === 'run') throw new Error('run rejected');
      return { workflowExecutionId: 'run-1' };
    }
    if (method === 'POST' && path.endsWith('/cancel')) {
      if (failCancel) throw new Error('cancel failed');
      cancelled = true;
      return {};
    }
    if (method === 'GET') {
      if (pollIndex === failPoll) {
        pollIndex++;
        throw new Error('poll failed');
      }
      if (cancelled) return { status: statusAfterCancel };
      const status = statuses[Math.min(pollIndex, statuses.length - 1)];
      pollIndex++;
      return { status };
    }
    if (method === 'DELETE') {
      deleteAttempts++;
      if (deleteAttempts <= deleteFailures) throw new Error('delete failed');
      return {};
    }
    throw new Error(`unexpected ${method} ${path}`);
  });
  const evaluator = createWorkflowValidityEvaluator({
    fetch: fetch as never,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    ...(allowedConnectorIds ? { allowedConnectorIds } : {}),
  });
  return { evaluator, calls, fetch, sleeps };
};

const run = (
  evaluator: ReturnType<typeof createWorkflowValidityEvaluator>,
  answer: string,
  metadata: Record<string, unknown> = { validateWorkflow: true },
  extra: Record<string, unknown> = {}
) =>
  evaluator.evaluate({
    input: {},
    expected: {},
    output: { ...buildOutput({ answer }), ...extra },
    metadata,
  } as never);

describe('extractWorkflowYaml', () => {
  it('prefers a fenced yaml block', () => {
    expect(extractWorkflowYaml(`Here:\n\`\`\`yaml\n${YAML}\`\`\`\nDone.`, [])).toBe(YAML.trim());
  });

  it('accepts yml and bare fences', () => {
    expect(extractWorkflowYaml(`\`\`\`yml\n${YAML}\`\`\``, [])).toBe(YAML.trim());
    expect(extractWorkflowYaml(`\`\`\`\n${YAML}\`\`\``, [])).toBe(YAML.trim());
  });

  it('prefers the fenced block that holds steps', () => {
    const answer = `\`\`\`yaml\nfoo: bar\n\`\`\`\n\`\`\`yaml\n${YAML}\`\`\``;
    expect(extractWorkflowYaml(answer, [])).toBe(YAML.trim());
  });

  it('falls back to unfenced text from a name: line containing steps:', () => {
    expect(extractWorkflowYaml(`Sure, here it is\n${YAML}`, [])).toBe(YAML.trim());
  });

  it('does not treat a lone name: line without steps: as a workflow', () => {
    expect(extractWorkflowYaml('name: Alice\nthat is all', [])).toBeUndefined();
  });

  it('falls back to workflow attachments', () => {
    expect(extractWorkflowYaml('see attachment', [{ yaml: 'name: a\nsteps: []' }])).toBe(
      'name: a\nsteps: []'
    );
  });

  it('returns undefined when there is no YAML anywhere', () => {
    expect(extractWorkflowYaml('I could not do that.', [])).toBeUndefined();
  });
});

describe('WorkflowValidity', () => {
  it('is N/A unless validateWorkflow is set', async () => {
    const { evaluator, fetch } = setup();
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``, {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports no_yaml with score 0 and makes no requests', async () => {
    const { evaluator, fetch } = setup();
    const result = await run(evaluator, 'no workflow here');
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ outcome: 'no_yaml' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates, runs, polls to completion and deletes', async () => {
    const { evaluator, calls } = setup();
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      outcome: 'completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
    });
    expect(typeof (result.metadata as { duration_ms: unknown }).duration_ms).toBe('number');
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/workflows/workflow' });
    expect(JSON.parse(calls[0].body as string)).toEqual({ yaml: YAML.trim() });
    const del = calls[calls.length - 1];
    expect(del.method).toBe('DELETE');
    expect(del.path).toBe('/api/workflows/workflow/wf-1');
    expect(del.query).toEqual({ force: true, acknowledgeAclLoss: true });
  });

  it('enables a workflow that was created disabled before running it', async () => {
    const { evaluator, calls } = setup({ workflow: { id: 'wf-1', enabled: false } });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(1);
    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.path).toBe('/api/workflows/workflow/wf-1');
    expect(JSON.parse(put?.body as string)).toEqual({ enabled: true });
    expect(calls.indexOf(put as Call)).toBeLessThan(
      calls.findIndex((call) => call.path.endsWith('/run'))
    );
  });

  it('scores 0.5 for a run that ends failed', async () => {
    const { evaluator } = setup({ statuses: ['failed'] });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0.5);
    expect(result.metadata).toMatchObject({ outcome: 'failed' });
  });

  it('times out after 120s of polling at 2s intervals, cancels, then deletes', async () => {
    const { evaluator, calls } = setup({ statuses: ['running'] });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0.5);
    expect(result.metadata).toMatchObject({
      outcome: 'timed_out',
      final_execution_status: 'cancelled',
    });
    const cancelIndex = calls.findIndex((call) => call.path.endsWith('/cancel'));
    expect(cancelIndex).toBeGreaterThan(-1);
    expect(calls[cancelIndex]).toMatchObject({
      method: 'POST',
      path: '/api/workflows/executions/run-1/cancel',
    });
    expect(calls.slice(0, cancelIndex).filter((call) => call.method === 'GET')).toHaveLength(60);
    expect(calls[calls.length - 1].method).toBe('DELETE');
    expect(cancelIndex).toBeLessThan(calls.length - 1);
  });

  it('does not cancel a run that reached a terminal status', async () => {
    const { evaluator, calls } = setup();
    await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(false);
  });

  it('still deletes and records cancel_error when the cancel request fails', async () => {
    const { evaluator, calls } = setup({
      statuses: ['running'],
      failCancel: true,
      statusAfterCancel: 'running',
    });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.metadata).toMatchObject({
      outcome: 'timed_out',
      cancel_error: 'cancel failed',
    });
    expect(calls[calls.length - 1].method).toBe('DELETE');
  });

  it('scores a poll that throws as run_failed (0) and cancels the in-flight run', async () => {
    const { evaluator, calls } = setup({ statuses: ['running'], failPoll: 1 });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({
      outcome: 'run_failed',
      stage: 'poll',
      error: 'poll failed',
      run_id: 'run-1',
    });
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(true);
    expect(calls[calls.length - 1].method).toBe('DELETE');
  });

  it('scores a run that ends skipped as 0', async () => {
    const { evaluator } = setup({ statuses: ['skipped'] });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ outcome: 'skipped' });
  });

  it('scores a run that ends cancelled on its own as failed (0.5)', async () => {
    const { evaluator, calls } = setup({ statuses: ['cancelled'] });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0.5);
    expect(result.metadata).toMatchObject({ outcome: 'failed' });
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(false);
  });

  it('retries a rejected delete with doubling backoff and then succeeds', async () => {
    const { evaluator, calls, sleeps } = setup({ deleteFailures: 2 });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(3);
    expect(sleeps.slice(-2)).toEqual([1_000, 2_000]);
    expect(result.metadata).toMatchObject({ outcome: 'completed', delete_attempts: 3 });
    expect(result.metadata).not.toHaveProperty('delete_error');
  });

  it('gives up after 4 delete attempts and records delete_error', async () => {
    const { evaluator, calls } = setup({ failDelete: true });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(calls.filter((call) => call.method === 'DELETE')).toHaveLength(4);
    expect(result.metadata).toMatchObject({
      outcome: 'completed',
      delete_attempts: 4,
      delete_error: 'delete failed',
    });
  });

  it('reports create_failed with score 0 and has nothing to delete', async () => {
    const { evaluator, calls } = setup({ failOn: 'create' });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ outcome: 'create_failed' });
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
  });

  it('deletes the created workflow when the run request fails', async () => {
    const { evaluator, calls } = setup({ failOn: 'run' });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ outcome: 'run_failed', workflow_id: 'wf-1' });
    expect(calls[calls.length - 1].method).toBe('DELETE');
  });

  it('deletes the created workflow when enabling throws', async () => {
    const { evaluator, calls } = setup({
      workflow: { id: 'wf-1', enabled: false },
      failOn: 'enable',
    });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.metadata).toMatchObject({ outcome: 'run_failed' });
    expect(calls[calls.length - 1].method).toBe('DELETE');
  });

  it('swallows and records a delete error without changing the outcome', async () => {
    const { evaluator } = setup({ failDelete: true });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      outcome: 'completed',
      delete_error: 'delete failed',
      delete_attempts: 4,
    });
  });

  it('reads YAML from workflowAttachments', async () => {
    const { evaluator, calls } = setup();
    const result = await run(
      evaluator,
      'rendered above',
      { validateWorkflow: true },
      {
        workflowAttachments: [{ id: 'a', version: 1, yaml: YAML }],
      }
    );
    expect(result.score).toBe(1);
    expect(JSON.parse(calls[0].body as string)).toEqual({ yaml: YAML });
  });

  describe('connector allowlist', () => {
    const yamlWith = (stepBody: string) =>
      `name: demo\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: a\n${stepBody}`;
    const fenced = (yaml: string) => `\`\`\`yaml\n${yaml}\n\`\`\``;
    const ranWorkflow = (calls: Call[]) => calls.some((call) => call.path.endsWith('/run'));

    it('skips the run for a connector id that is not allowlisted, but still deletes', async () => {
      const { evaluator, calls } = setup();
      const result = await run(
        evaluator,
        fenced(yamlWith('    type: slack\n    connector-id: prod-slack\n'))
      );
      expect(result.score).toBe(0);
      expect(result.metadata).toMatchObject({
        outcome: 'run_skipped_external_connector',
        external_references: ['prod-slack'],
        delete_attempts: 1,
      });
      expect(ranWorkflow(calls)).toBe(false);
      expect(calls[calls.length - 1].method).toBe('DELETE');
    });

    it('runs a workflow that only references the seeded stub connector', async () => {
      const { evaluator, calls } = setup();
      const result = await run(
        evaluator,
        fenced(
          yamlWith(
            `    type: http\n    connector-id: ${STUB_CONNECTOR_ID}\n    with:\n      path: /x\n`
          )
        )
      );
      expect(result.score).toBe(1);
      expect(ranWorkflow(calls)).toBe(true);
    });

    it('honours a custom allowlist', async () => {
      const { evaluator, calls } = setup({ allowedConnectorIds: ['mine'] });
      const allowed = await run(
        evaluator,
        fenced(yamlWith('    type: http\n    connector-id: mine\n'))
      );
      expect(allowed.score).toBe(1);
      expect(ranWorkflow(calls)).toBe(true);

      const stub = setup({ allowedConnectorIds: ['mine'] });
      const rejected = await run(
        stub.evaluator,
        fenced(yamlWith(`    type: http\n    connector-id: ${STUB_CONNECTOR_ID}\n`))
      );
      expect(rejected.metadata).toMatchObject({ outcome: 'run_skipped_external_connector' });
    });

    it('skips an http step that sets its own url even with the stub connector', async () => {
      const { evaluator, calls } = setup();
      const result = await run(
        evaluator,
        fenced(
          yamlWith(
            `    type: http\n    connector-id: ${STUB_CONNECTOR_ID}\n    with:\n      url: https://example.com/hook\n`
          )
        )
      );
      expect(result.metadata).toMatchObject({
        outcome: 'run_skipped_external_connector',
        external_references: ['url:https://example.com/hook'],
      });
      expect(ranWorkflow(calls)).toBe(false);
    });

    it('skips a connector id found by the text fallback when the YAML does not parse', async () => {
      const { evaluator, calls } = setup();
      const broken =
        'name: demo\nsteps:\n  - name: a\n    connector-id: prod-slack\n  bad: [unclosed\n';
      const result = await run(evaluator, fenced(broken));
      expect(result.metadata).toMatchObject({
        outcome: 'run_skipped_external_connector',
        external_references: ['prod-slack'],
      });
      expect(ranWorkflow(calls)).toBe(false);
    });
  });
});
