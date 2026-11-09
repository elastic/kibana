/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRunInputs,
  createWorkflowValidityEvaluator,
  extractWorkflowYaml,
} from './workflow_validity_evaluator';
import { parse } from 'yaml';
import { buildOutput } from '../__fixtures__/task_output_builders';
import { STUB_CONNECTOR_ID } from '../fixtures/stub_connector';

const YAML =
  'name: demo\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n';

interface Call {
  path: string;
  method?: string;
  body?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

const INTERNAL_VERSION = '1';
const PUBLIC_VERSION = '2023-10-31';

/** The fixture fetch ignores `version`, so each call must carry the header itself. */
const expectVersionHeaders = (calls: Call[]) => {
  expect(calls.length).toBeGreaterThan(0);
  calls.forEach((call) => {
    const expected = call.path === '/api/workflows/validate' ? INTERNAL_VERSION : PUBLIC_VERSION;
    expect({ path: call.path, method: call.method, headers: call.headers }).toEqual({
      path: call.path,
      method: call.method,
      headers: { 'elastic-api-version': expected },
    });
  });
};

const setup = ({
  workflow = { id: 'wf-1', enabled: true } as Record<string, unknown>,
  statuses = ['running', 'completed'],
  failOn,
  failDelete = false,
  deleteFailures = failDelete ? Number.POSITIVE_INFINITY : 0,
  failCancel = false,
  failPoll,
  statusAfterCancel = 'cancelled',
  stubVerified = true,
  validateResult = { valid: true, errors: [] } as { valid: boolean; errors: string[] } | 'throw',
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
  stubVerified?: boolean;
  validateResult?: { valid: boolean; errors: string[] } | 'throw';
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
    if (method === 'POST' && path === '/api/workflows/validate') {
      if (validateResult === 'throw') throw new Error('validate unavailable');
      return validateResult;
    }
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
    stubVerified: () => stubVerified,
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

  it('sends elastic-api-version on create, enable, run, poll and delete', async () => {
    const { evaluator, calls } = setup({ workflow: { id: 'wf-1', enabled: false } });
    await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(calls.map((call) => call.method)).toEqual(
      expect.arrayContaining(['POST', 'PUT', 'GET', 'DELETE'])
    );
    expectVersionHeaders(calls);
  });

  it('sends elastic-api-version on cancel and the settle poll too', async () => {
    const { evaluator, calls } = setup({ statuses: ['running'] });
    await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(true);
    expectVersionHeaders(calls);
  });

  describe('trigger rewrite', () => {
    const withTriggers = (triggers: string) =>
      `name: demo\nenabled: true\n${triggers}steps:\n  - name: a\n    type: console\n    with:\n      message: hi\n`;
    const createBody = (calls: Call[]) =>
      JSON.parse(
        calls.find((call) => call.method === 'POST' && call.path === '/api/workflows/workflow')
          ?.body as string
      ) as { yaml: string };

    it('replaces a scheduled trigger with a manual one before create', async () => {
      const { evaluator, calls } = setup();
      const result = await run(
        evaluator,
        `\`\`\`yaml\n${withTriggers(
          'triggers:\n  - type: scheduled\n    with:\n      every: 1m\n'
        )}\`\`\``
      );
      expect(result.metadata).toMatchObject({ outcome: 'completed', triggers_rewritten: true });
      const { yaml } = createBody(calls);
      expect(parse(yaml)).toMatchObject({
        name: 'demo',
        triggers: [{ type: 'manual' }],
        steps: [{ name: 'a', type: 'console' }],
      });
      expect(yaml).not.toContain('scheduled');
    });

    it('rewrites a mixed trigger list that holds any non-manual trigger', async () => {
      const { evaluator, calls } = setup();
      const result = await run(
        evaluator,
        `\`\`\`yaml\n${withTriggers('triggers:\n  - type: manual\n  - type: alert\n')}\`\`\``
      );
      expect(result.metadata).toMatchObject({ triggers_rewritten: true });
      expect(parse(createBody(calls).yaml).triggers).toEqual([{ type: 'manual' }]);
    });

    it('leaves a manual-only workflow byte-for-byte untouched and unflagged', async () => {
      const { evaluator, calls } = setup();
      const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
      expect(createBody(calls).yaml).toBe(YAML.trim());
      expect(result.metadata).not.toHaveProperty('triggers_rewritten');
    });

    it('leaves a workflow with no triggers key untouched', async () => {
      const { evaluator, calls } = setup();
      const yaml = withTriggers('');
      const result = await run(evaluator, `\`\`\`yaml\n${yaml}\`\`\``);
      expect(createBody(calls).yaml).toBe(yaml.trim());
      expect(result.metadata).not.toHaveProperty('triggers_rewritten');
    });
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

  it('records settle_error, not cancel_error, when a status read fails while settling', async () => {
    const { evaluator, fetch } = setup({ statuses: ['running'] });
    // Fail every GET after the cancel was sent (the settle loop's reads).
    const inner = fetch.getMockImplementation() as (call: Call) => Promise<unknown>;
    let cancelSent = false;
    fetch.mockImplementation(async (call: Call) => {
      if (call.method === 'POST' && call.path.endsWith('/cancel')) cancelSent = true;
      if (cancelSent && call.method === 'GET') throw new Error('status read failed');
      return (await inner(call)) as Record<string, unknown>;
    });
    const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    expect(result.metadata).toMatchObject({
      outcome: 'timed_out',
      settle_error: 'status read failed',
    });
    expect(result.metadata).not.toHaveProperty('cancel_error');
  });

  describe('guard', () => {
    const yamlWith = (stepBody: string) =>
      `name: demo\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n${stepBody}`;
    const fenced = (yaml: string) => `\`\`\`yaml\n${yaml}\n\`\`\``;
    const ranWorkflow = (calls: Call[]) => calls.some((call) => call.path.endsWith('/run'));
    const created = (calls: Call[]) =>
      calls.some((call) => call.method === 'POST' && call.path === '/api/workflows/workflow');
    const stubStep = (extra = '') =>
      `  - name: a\n    type: http\n    connector-id: ${STUB_CONNECTOR_ID}\n    with:\n      path: /api/status/chat.postMessage\n      method: POST\n${extra}`;

    it('runs a correct stub-bound workflow to completed', async () => {
      const { evaluator, calls } = setup();
      const result = await run(evaluator, fenced(yamlWith(stubStep())));
      expect(result.score).toBe(1);
      expect(result.metadata).toMatchObject({ outcome: 'completed' });
      expect(ranWorkflow(calls)).toBe(true);
    });

    it('allows console, data.set/map/filter/dedupe, wait, if, foreach and nested stub http steps', async () => {
      const { evaluator, calls } = setup();
      const steps = [
        '  - name: c\n    type: console\n    with:\n      message: hi',
        '  - name: d\n    type: data.set\n    with:\n      x: 1',
        '  - name: d2\n    type: data.map\n    with:\n      items: []',
        '  - name: d3\n    type: data.filter\n    with:\n      items: []',
        '  - name: d4\n    type: data.dedupe\n    with:\n      items: []',
        '  - name: w\n    type: wait\n    with:\n      duration: 1s',
        `  - name: i\n    type: if\n    condition: "true"\n    steps:\n      - name: n\n        type: http\n        connector-id: ${STUB_CONNECTOR_ID}\n        with:\n          path: /x\n    else:\n      - name: e\n        type: console\n        with:\n          message: no`,
        `  - name: f\n    type: foreach\n    foreach: "{{ inputs.xs }}"\n    steps:\n      - name: n2\n        type: http\n        connector-id: ${STUB_CONNECTOR_ID}\n        with:\n          path: /y`,
      ].join('\n');
      const result = await run(evaluator, fenced(yamlWith(steps)));
      expect(result.metadata).toMatchObject({ outcome: 'completed' });
      expect(ranWorkflow(calls)).toBe(true);
    });

    it('still runs a stub http step whose body carries a field named url', async () => {
      const { evaluator, calls } = setup();
      const result = await run(
        evaluator,
        fenced(
          yamlWith(
            stubStep(
              '      body:\n        url: https://example.com/not-a-host\n        nested:\n          url: x\n'
            )
          )
        )
      );
      expect(result.metadata).toMatchObject({ outcome: 'completed' });
      expect(ranWorkflow(calls)).toBe(true);
    });

    describe.each([
      [
        'an http step with another connector id',
        '  - name: a\n    type: http\n    connector-id: prod-slack\n    with:\n      path: /x',
      ],
      [
        'a templated connector id',
        '  - name: a\n    type: http\n    connector-id: "{{ inputs.connector }}"\n    with:\n      path: /x',
      ],
      [
        'an http step without a connector id',
        '  - name: a\n    type: http\n    with:\n      path: /x',
      ],
      [
        'a slack step',
        '  - name: a\n    type: slack\n    connector-id: prod-slack\n    with:\n      message: hi',
      ],
      ['a .slack connector step', '  - name: a\n    type: .slack\n    connector-id: prod-slack'],
      [
        'kibana.request to the connector _execute API',
        `  - name: a\n    type: kibana.request\n    with:\n      method: POST\n      path: /api/actions/connector/prod-slack/_execute`,
      ],
      [
        'workflow.execute',
        '  - name: a\n    type: workflow.execute\n    with:\n      workflow-id: other',
      ],
      [
        'workflow.executeAsync',
        '  - name: a\n    type: workflow.executeAsync\n    with:\n      workflow-id: other',
      ],
      [
        'a HITL waitForInput step carrying a url channel',
        '  - name: a\n    type: waitForInput\n    with:\n      channels:\n        - type: http\n          url: https://example.com/hook',
      ],
      ['a step with no type', '  - name: a\n    with:\n      x: 1'],
      [
        'an http step to the stub connector that overrides the url',
        `  - name: a\n    type: http\n    connector-id: ${STUB_CONNECTOR_ID}\n    with:\n      url: https://example.com/hook\n      path: /x`,
      ],
      [
        'a data step outside the explicit allowlist',
        '  - name: a\n    type: data.unknown\n    with:\n      x: 1',
      ],
      [
        'a stub http step whose with is not a mapping',
        `  - name: a\n    type: http\n    connector-id: ${STUB_CONNECTOR_ID}\n    with: "{{ inputs.params }}"`,
      ],
      [
        'an external http step nested in a foreach',
        `  - name: f\n    type: foreach\n    foreach: "{{ inputs.xs }}"\n    steps:\n      - name: n\n        type: http\n        connector-id: prod-slack\n        with:\n          path: /x`,
      ],
      [
        'an external step in an if/else branch',
        `  - name: i\n    type: if\n    condition: "true"\n    steps:\n      - name: ok\n        type: console\n        with:\n          message: ok\n    else:\n      - name: bad\n        type: slack\n        connector-id: prod-slack`,
      ],
      [
        'an external step in a parallel branch',
        `  - name: p\n    type: parallel\n    branches:\n      - name: b1\n        steps:\n          - name: bad\n            type: kibana.request\n            with:\n              path: /x`,
      ],
      [
        'an external step in an on-failure fallback',
        `  - name: a\n    type: console\n    with:\n      message: hi\n    on-failure:\n      fallback:\n        - name: bad\n          type: slack\n          connector-id: prod-slack`,
      ],
    ])('bypass shape: %s', (_name, stepBody) => {
      it('is skipped before anything is created or run, and validated structurally', async () => {
        const { evaluator, calls } = setup();
        const result = await run(evaluator, fenced(yamlWith(stepBody)));
        expect(result.score).toBe(0);
        expect(result.metadata).toMatchObject({
          outcome: 'run_skipped_external_connector',
          valid_not_run: true,
        });
        expect(
          (result.metadata as { skipped_steps: string[] }).skipped_steps.length
        ).toBeGreaterThan(0);
        expect(created(calls)).toBe(false);
        expect(ranWorkflow(calls)).toBe(false);
        expect(calls.some((call) => call.method === 'DELETE')).toBe(false);
        expect(calls).toContainEqual(
          expect.objectContaining({
            method: 'POST',
            path: '/api/workflows/validate',
            version: '1',
            headers: { 'elastic-api-version': '1' },
          })
        );
        expectVersionHeaders(calls);
      });
    });

    it('skips an external step in settings.on-failure.fallback', async () => {
      const { evaluator, calls } = setup();
      const yaml =
        'name: demo\nenabled: true\nsettings:\n  on-failure:\n    fallback:\n      - name: bad\n        type: slack\n        connector-id: prod-slack\ntriggers:\n  - type: manual\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n';
      const result = await run(evaluator, fenced(yaml));
      expect(result.metadata).toMatchObject({ outcome: 'run_skipped_external_connector' });
      expect(created(calls)).toBe(false);
    });

    it('records valid_not_run false when the structural validation rejects the workflow', async () => {
      const { evaluator } = setup({ validateResult: { valid: false, errors: ['bad'] } });
      const result = await run(
        evaluator,
        fenced(yamlWith('  - name: a\n    type: slack\n    connector-id: prod-slack'))
      );
      expect(result.metadata).toMatchObject({
        outcome: 'run_skipped_external_connector',
        valid_not_run: false,
      });
    });

    it('still skips, with a validate_error, when the validate route throws', async () => {
      const { evaluator, calls } = setup({ validateResult: 'throw' });
      const result = await run(
        evaluator,
        fenced(yamlWith('  - name: a\n    type: slack\n    connector-id: prod-slack'))
      );
      expect(result.metadata).toMatchObject({
        outcome: 'run_skipped_external_connector',
        validate_error: 'validate unavailable',
      });
      expect(created(calls)).toBe(false);
    });

    it('skips a workflow YAML that does not parse: run_skipped_unparsed, score 0, no create', async () => {
      const { evaluator, calls } = setup();
      const broken =
        'name: demo\nsteps:\n  - name: a\n    connector-id: prod-slack\n  bad: [unclosed\n';
      const result = await run(evaluator, fenced(broken));
      expect(result.score).toBe(0);
      expect(result.metadata).toMatchObject({ outcome: 'run_skipped_unparsed' });
      expect(calls).toHaveLength(0);
    });

    it('skips a document whose steps are not a list', async () => {
      const { evaluator, calls } = setup();
      const result = await run(evaluator, fenced('name: demo\nsteps: nope\n'));
      expect(result.metadata).toMatchObject({ outcome: 'run_skipped_unparsed' });
      expect(calls).toHaveLength(0);
    });

    describe('unverified stub connector', () => {
      it('skips a stub-bound workflow with run_skipped_unverified_stub when the seed could not verify the connector', async () => {
        const { evaluator, calls } = setup({ stubVerified: false });
        const result = await run(evaluator, fenced(yamlWith(stubStep())));
        expect(result.score).toBe(0);
        expect(result.metadata).toMatchObject({
          outcome: 'run_skipped_unverified_stub',
          valid_not_run: true,
        });
        expect(created(calls)).toBe(false);
        expect(ranWorkflow(calls)).toBe(false);
      });

      it('still runs a workflow that references no connector', async () => {
        const { evaluator, calls } = setup({ stubVerified: false });
        const result = await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
        expect(result.metadata).toMatchObject({ outcome: 'completed' });
        expect(ranWorkflow(calls)).toBe(true);
      });

      it('lets an unsafe step outrank the unverified stub in the outcome', async () => {
        const { evaluator } = setup({ stubVerified: false });
        const result = await run(
          evaluator,
          fenced(
            yamlWith(`${stubStep()}\n  - name: b\n    type: slack\n    connector-id: prod-slack`)
          )
        );
        expect(result.metadata).toMatchObject({ outcome: 'run_skipped_external_connector' });
      });
    });
  });
});

describe('run inputs', () => {
  const withInputs = (inputs: string) =>
    `name: demo\nenabled: true\ntriggers:\n  - type: manual\ninputs:\n${inputs}steps:\n  - name: a\n    type: console\n    with:\n      message: "{{ inputs.message }}"\n`;

  it('supplies fixture values for declared inputs without a default when it runs the workflow', async () => {
    const { evaluator, calls } = setup();
    await run(
      evaluator,
      `\`\`\`yaml\n${withInputs(
        '  - name: message\n    type: string\n    required: true\n  - name: count\n    type: number\n    required: true\n'
      )}\`\`\``
    );
    const started = calls.find((call) => call.path.endsWith('/run'));
    expect(JSON.parse(started?.body as string)).toEqual({
      inputs: { message: 'persona-matrix-fixture', count: 1 },
    });
  });

  it('sends empty inputs for a workflow that declares none', async () => {
    const { evaluator, calls } = setup();
    await run(evaluator, `\`\`\`yaml\n${YAML}\`\`\``);
    const started = calls.find((call) => call.path.endsWith('/run'));
    expect(JSON.parse(started?.body as string)).toEqual({ inputs: {} });
  });

  it('fills only required inputs without a default, by declared type (list form)', () => {
    expect(
      buildRunInputs({
        inputs: [
          { name: 'a', type: 'string', required: true, default: 'x' },
          { name: 'b', type: 'boolean', required: true },
          { name: 'c', type: 'array', required: true },
          { name: 'd', type: 'object', required: true },
          { name: 'e', type: 'choice', required: true, options: ['p', 'q'] },
          { name: 'f', type: 'string', required: true },
          { type: 'string', required: true },
        ],
      })
    ).toEqual({ b: true, c: [], d: {}, e: 'p', f: 'persona-matrix-fixture' });
  });

  it('omits optional inputs in the list form, so an optional minItems array is not sent as []', () => {
    expect(
      buildRunInputs({
        inputs: [
          { name: 'tags', type: 'array', minItems: 1 },
          { name: 'note', type: 'string', required: false },
          { name: 'count', type: 'number' },
        ],
      })
    ).toEqual({});
  });

  it('reads the JSON-schema inputs form, filling only required properties without a default', () => {
    expect(
      buildRunInputs({
        inputs: {
          properties: {
            summary: { type: 'string' },
            n: { type: 'integer', default: 3 },
            ids: { type: 'array', minItems: 1 },
            verbose: { type: 'boolean' },
          },
          required: ['summary', 'n'],
        },
      })
    ).toEqual({ summary: 'persona-matrix-fixture' });
  });

  it('gives a required array minItems fixture items so the engine accepts it', () => {
    expect(
      buildRunInputs({
        inputs: [
          { name: 'tags', type: 'array', required: true, minItems: 2 },
          { name: 'any', type: 'array', required: true },
          { name: 'zero', type: 'array', required: true, minItems: 0 },
        ],
      })
    ).toEqual({
      tags: ['persona-matrix-fixture', 'persona-matrix-fixture'],
      any: [],
      zero: [],
    });
  });

  it('builds required array items of the declared item type (JSON-schema form)', () => {
    expect(
      buildRunInputs({
        inputs: {
          properties: {
            ids: { type: 'array', minItems: 2, items: { type: 'number' } },
            names: { type: 'array', minItems: 1 },
          },
          required: ['ids', 'names'],
        },
      })
    ).toEqual({ ids: [1, 1], names: ['persona-matrix-fixture'] });
  });

  it('omits every JSON-schema property when none is listed as required', () => {
    expect(
      buildRunInputs({ inputs: { properties: { ids: { type: 'array', minItems: 1 } } } })
    ).toEqual({});
  });

  it('ignores malformed inputs declarations', () => {
    expect(buildRunInputs({ inputs: 'nope' })).toEqual({});
    expect(buildRunInputs({ inputs: ['x', null] })).toEqual({});
  });
});
