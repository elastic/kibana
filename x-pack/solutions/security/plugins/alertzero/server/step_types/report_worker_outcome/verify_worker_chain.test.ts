/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ReportWorkerOutcomeSkipReason } from './skip_reasons';
import type { VerifyWorkerChainParams, WorkerChainExecution } from './verify_worker_chain';
import { MAX_LINEAGE_HOPS, verifyWorkerChain } from './verify_worker_chain';
import {
  REVIEW_EXECUTION_ID,
  ROOT_EXECUTION_ID,
  ROOT_HOP,
  RUNNER_EXECUTION_ID,
  RUNNER_HOP,
  SPACE_ID,
  createAttackDiscoveryChain,
  createExecution,
  createExecutionReader,
} from './worker_chain.mock';

const createParams = (
  overrides: Partial<VerifyWorkerChainParams> = {}
): VerifyWorkerChainParams => ({
  abortSignal: new AbortController().signal,
  executionId: REVIEW_EXECUTION_ID,
  getExecution: createExecutionReader(createAttackDiscoveryChain()),
  hopTimeoutMs: 5000,
  logger: loggingSystemMock.createLogger(),
  spaceId: SPACE_ID,
  ...overrides,
});

const withChange = (executionId: string, change: Partial<WorkerChainExecution>) => {
  const chain = createAttackDiscoveryChain();
  return createExecutionReader({ ...chain, [executionId]: { ...chain[executionId], ...change } });
};

const withReviewContext = (context: Record<string, unknown>) =>
  withChange(REVIEW_EXECUTION_ID, { context });

/**
 * A catalog root `exec-0` and `depth` descendants, where `exec-N` lists `exec-0` .. `exec-N-1` in
 * its chain. The reporting execution is `exec-${depth}`.
 */
const createChainOfDepth = (depth: number): Record<string, WorkerChainExecution> =>
  Object.fromEntries(
    Array.from({ length: depth + 1 }, (_, index) => {
      const id = `exec-${index}`;
      const executionChain = Array.from({ length: index }, (__, ancestor) => ({
        executionId: `exec-${ancestor}`,
        invocation: 'sync',
        workflowId: `wf-${ancestor}`,
      }));
      return [
        id,
        index === 0
          ? createExecution({
              id,
              originManagedWorkflowId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
              triggeredBy: 'scheduled',
              workflowId: 'wf-0',
            })
          : createExecution({
              context: { executionChain, parentWorkflowExecutionId: `exec-${index - 1}` },
              id,
              workflowId: `wf-${index}`,
            }),
      ];
    })
  );

const readIds = (getExecution: jest.Mock) => getExecution.mock.calls.map(([id]) => id);

describe('verifyWorkerChain', () => {
  // A failed read becomes `lineage_unavailable`; the debug log says why, without the document.
  it('logs why an execution read failed, at debug', async () => {
    const params = createParams({
      getExecution: jest.fn().mockRejectedValue(new Error('security_exception: unauthorized')),
    });

    await verifyWorkerChain(params);

    const debug = params.logger.debug as jest.Mock;
    const messages = debug.mock.calls.map(([message]) =>
      typeof message === 'function' ? message() : message
    );
    expect(messages).toEqual([
      `Could not read execution ${REVIEW_EXECUTION_ID}: Error: security_exception: unauthorized`,
    ]);
  });

  it('stops waiting on a read once the signal aborts', async () => {
    const controller = new AbortController();
    const result = verifyWorkerChain(
      createParams({
        abortSignal: controller.signal,
        getExecution: jest.fn(() => new Promise<never>(() => {})),
      })
    );
    controller.abort();

    expect(await result).toEqual({ reason: 'aborted', verified: false });
  });

  it.each([
    ['the review, two hops below the root', REVIEW_EXECUTION_ID],
    ['the runner, one hop below the root', RUNNER_EXECUTION_ID],
    ['the root Worker itself', ROOT_EXECUTION_ID],
  ])('verifies %s up to its catalog root', async (_label, executionId) => {
    const result = await verifyWorkerChain(createParams({ executionId }));

    expect(result).toEqual({
      root: expect.objectContaining({ id: ROOT_EXECUTION_ID }),
      verified: true,
    });
  });

  it('reads the reporting execution, then every ancestor its chain lists, root first', async () => {
    const getExecution = createExecutionReader(createAttackDiscoveryChain());

    await verifyWorkerChain(createParams({ getExecution }));

    expect(readIds(getExecution)).toEqual([
      REVIEW_EXECUTION_ID,
      ROOT_EXECUTION_ID,
      RUNNER_EXECUTION_ID,
    ]);
  });

  it('requests every ancestor before any of them answers', async () => {
    const chain = createAttackDiscoveryChain();
    const pending: Array<() => void> = [];
    const getExecution = jest.fn((executionId: string) =>
      executionId === REVIEW_EXECUTION_ID
        ? Promise.resolve(chain[executionId])
        : new Promise<WorkerChainExecution>((resolve) => {
            pending.push(() => resolve(chain[executionId]));
          })
    );

    const verification = verifyWorkerChain(createParams({ getExecution }));
    await new Promise(process.nextTick);
    const requestedBeforeAnswers = readIds(getExecution);
    pending.forEach((answer) => answer());

    expect({ requestedBeforeAnswers, verified: (await verification).verified }).toEqual({
      requestedBeforeAnswers: [REVIEW_EXECUTION_ID, ROOT_EXECUTION_ID, RUNNER_EXECUTION_ID],
      verified: true,
    });
  });

  it('reads only the root when the root Worker reports for itself', async () => {
    const getExecution = createExecutionReader(createAttackDiscoveryChain());

    await verifyWorkerChain(createParams({ executionId: ROOT_EXECUTION_ID, getExecution }));

    expect(readIds(getExecution)).toEqual([ROOT_EXECUTION_ID]);
  });

  it(`verifies a chain of ${MAX_LINEAGE_HOPS} hops with ${
    MAX_LINEAGE_HOPS + 1
  } reads`, async () => {
    const getExecution = createExecutionReader(createChainOfDepth(MAX_LINEAGE_HOPS));

    const result = await verifyWorkerChain(
      createParams({ executionId: `exec-${MAX_LINEAGE_HOPS}`, getExecution })
    );

    expect({ reads: getExecution.mock.calls.length, verified: result.verified }).toEqual({
      reads: MAX_LINEAGE_HOPS + 1,
      verified: true,
    });
  });

  it('keeps only the root fields the envelope reads, and only the consts of its definition', async () => {
    const result = await verifyWorkerChain(createParams());

    expect(result.verified && result.root).toEqual({
      context: {},
      id: ROOT_EXECUTION_ID,
      originManagedWorkflowId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      spaceId: SPACE_ID,
      triggeredBy: 'scheduled',
      workflowDefinition: { consts: { worker_settings: { autonomy: 'assisted' } } },
    });
  });

  it.each<{
    overrides: () => Partial<VerifyWorkerChainParams>;
    reason: ReportWorkerOutcomeSkipReason;
    title: string;
  }>([
    {
      overrides: () => ({ getExecution: withChange(REVIEW_EXECUTION_ID, { isTestRun: true }) }),
      reason: 'test_run',
      title: 'rejects a reporting execution that is a test run',
    },
    {
      overrides: () => ({ getExecution: withChange(RUNNER_EXECUTION_ID, { isTestRun: true }) }),
      reason: 'test_run',
      title: 'rejects a test-run ancestor',
    },
    {
      overrides: () => ({ getExecution: withChange(RUNNER_EXECUTION_ID, { managed: false }) }),
      reason: 'not_managed',
      title: 'rejects an unmanaged ancestor',
    },
    {
      overrides: () => ({ getExecution: withChange(REVIEW_EXECUTION_ID, { managed: false }) }),
      reason: 'not_managed',
      title: 'rejects an unmanaged reporting execution below the root',
    },
    {
      overrides: () => ({
        executionId: ROOT_EXECUTION_ID,
        getExecution: withChange(ROOT_EXECUTION_ID, {
          managed: undefined,
          managedBy: undefined,
          originManagedWorkflowId: undefined,
        }),
      }),
      reason: 'not_managed',
      title:
        'rejects an unmanaged top-level reporting execution, like an inline run under a catalog Worker id',
    },
    {
      overrides: () => ({
        getExecution: withChange(ROOT_EXECUTION_ID, { managedBy: 'proposals' }),
      }),
      reason: 'not_managed',
      title: 'rejects an ancestor managed by another plugin',
    },
    {
      overrides: () => ({ getExecution: withChange(RUNNER_EXECUTION_ID, { spaceId: 'space-b' }) }),
      reason: 'lineage_unavailable',
      title: 'rejects an ancestor in another space',
    },
    {
      overrides: () => ({ getExecution: withChange(RUNNER_EXECUTION_ID, { spaceId: undefined }) }),
      reason: 'lineage_unavailable',
      title: 'rejects a legacy ancestor with no space id',
    },
    {
      overrides: () => {
        const { [RUNNER_EXECUTION_ID]: _missing, ...chain } = createAttackDiscoveryChain();
        return { getExecution: createExecutionReader(chain) };
      },
      reason: 'lineage_unavailable',
      title: 'rejects a chain whose ancestor is missing',
    },
    {
      overrides: () => ({
        getExecution: withChange(RUNNER_EXECUTION_ID, { workflowId: 'wf-other' }),
      }),
      reason: 'lineage_unavailable',
      title: 'rejects an ancestor whose workflow is not the one the chain names',
    },
    {
      overrides: () => ({
        getExecution: jest.fn().mockRejectedValue(new Error('search_phase_execution_exception')),
      }),
      reason: 'lineage_unavailable',
      title: 'rejects a chain whose lookup throws',
    },
    {
      overrides: () => ({
        getExecution: jest.fn(() => new Promise<never>(() => {})),
        hopTimeoutMs: 1,
      }),
      reason: 'lineage_unavailable',
      title: 'rejects a chain whose lookup outlives the hop timeout',
    },
    {
      overrides: () => ({
        getExecution: withReviewContext({ parentWorkflowExecutionId: RUNNER_EXECUTION_ID }),
      }),
      reason: 'lineage_unavailable',
      title: 'rejects a child with no chain (it started before the engine recorded chains)',
    },
    {
      overrides: () => ({
        getExecution: withReviewContext({
          executionChain: [ROOT_HOP, { ...RUNNER_HOP, invocation: 'later' }],
          parentWorkflowExecutionId: RUNNER_EXECUTION_ID,
        }),
      }),
      reason: 'lineage_unavailable',
      title: 'rejects a malformed chain',
    },
    {
      overrides: () => ({
        getExecution: withReviewContext({
          executionChain: [ROOT_HOP],
          parentWorkflowExecutionId: RUNNER_EXECUTION_ID,
        }),
      }),
      reason: 'lineage_unavailable',
      title: "rejects a chain whose last hop is not the execution's parent",
    },
    {
      overrides: () => ({
        getExecution: withReviewContext({
          executionChain: [
            ROOT_HOP,
            { ...RUNNER_HOP, executionId: REVIEW_EXECUTION_ID },
            RUNNER_HOP,
          ],
          parentWorkflowExecutionId: RUNNER_EXECUTION_ID,
        }),
      }),
      reason: 'lineage_unavailable',
      title: 'rejects a chain that lists the reporting execution itself',
    },
    {
      overrides: () => ({
        executionId: `exec-${MAX_LINEAGE_HOPS + 1}`,
        getExecution: createExecutionReader(createChainOfDepth(MAX_LINEAGE_HOPS + 1)),
      }),
      reason: 'lineage_unavailable',
      title: `rejects a chain longer than ${MAX_LINEAGE_HOPS} hops`,
    },
    {
      overrides: () => ({
        getExecution: withChange(ROOT_EXECUTION_ID, { triggeredBy: 'workflow-step' }),
      }),
      reason: 'lineage_unavailable',
      title: 'rejects a chain whose first hop is not a top-level execution',
    },
    {
      overrides: () => ({
        getExecution: withChange(ROOT_EXECUTION_ID, { originManagedWorkflowId: 'custom-workflow' }),
      }),
      reason: 'not_catalog_root',
      title: 'rejects a root outside the Worker catalog',
    },
    {
      overrides: () => ({
        executionId: ROOT_EXECUTION_ID,
        getExecution: withChange(ROOT_EXECUTION_ID, { originManagedWorkflowId: null }),
      }),
      reason: 'not_catalog_root',
      title: 'rejects a top-level reporting execution with no origin managed workflow',
    },
  ])('$title', async ({ overrides, reason }) => {
    const result = await verifyWorkerChain(createParams(overrides()));

    expect(result).toEqual({ reason, verified: false });
  });

  it('names the ancestor closest to the reporting execution when several fail', async () => {
    const chain = createAttackDiscoveryChain();
    const getExecution = createExecutionReader({
      ...chain,
      [ROOT_EXECUTION_ID]: { ...chain[ROOT_EXECUTION_ID], managed: false },
      [RUNNER_EXECUTION_ID]: { ...chain[RUNNER_EXECUTION_ID], isTestRun: true },
    });

    expect(await verifyWorkerChain(createParams({ getExecution }))).toEqual({
      reason: 'test_run',
      verified: false,
    });
  });

  it.each<{
    abortOn: string | undefined;
    reads: number;
    title: string;
  }>([
    { abortOn: undefined, reads: 0, title: 'before the first read when already aborted' },
    {
      abortOn: REVIEW_EXECUTION_ID,
      reads: 1,
      title: 'before the ancestors when aborted after the first read',
    },
    {
      abortOn: RUNNER_EXECUTION_ID,
      reads: 3,
      title: 'without verifying when aborted while the ancestors are read',
    },
  ])('stops $title', async ({ abortOn, reads }) => {
    const controller = new AbortController();
    if (abortOn === undefined) {
      controller.abort();
    }
    const chain = createAttackDiscoveryChain();
    const getExecution = jest.fn(async (executionId: string) => {
      if (executionId === abortOn) {
        controller.abort();
      }
      return chain[executionId] ?? null;
    });

    const result = await verifyWorkerChain(
      createParams({ abortSignal: controller.signal, getExecution })
    );

    expect({ reads: getExecution.mock.calls.length, result }).toEqual({
      reads,
      result: { reason: 'aborted', verified: false },
    });
  });
});
