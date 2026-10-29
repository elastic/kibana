/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { WORKER_HARVEST_STEP_ID, WORKER_OUTPUT_STEP_ID } from './constants';
import { assertHarvestSucceeded, readWorkerOutput } from './workflow_task';

const workerWith = (steps: Array<{ stepId: string; output?: unknown; error?: unknown }>) =>
  ({
    id: 'exec-worker-1',
    status: 'completed',
    stepExecutions: steps,
  } as unknown as WorkflowExecutionDto);

const outputStep = (output: Record<string, unknown>, error?: string) => ({
  stepId: WORKER_OUTPUT_STEP_ID,
  output,
  ...(error ? { error } : {}),
});

describe('readWorkerOutput', () => {
  it('reads the counters the worker emitted', () => {
    const worker = workerWith([
      { stepId: 'fetch_rule', output: { rule_id: 'r1' } },
      outputStep({ reviews_requested: 2, reviews_approved: 1, harvest_failed: false }),
    ]);

    expect(readWorkerOutput(worker)).toMatchObject({
      reviews_requested: 2,
      reviews_approved: 1,
      harvest_failed: false,
    });
  });

  it('returns undefined when the worker never reached its output step', () => {
    expect(readWorkerOutput(workerWith([{ stepId: 'fetch_rule' }]))).toBeUndefined();
  });

  it('ignores a non-object output', () => {
    expect(readWorkerOutput(workerWith([outputStep({}, 'boom')]))).toBeDefined();
    expect(
      readWorkerOutput(workerWith([{ stepId: WORKER_OUTPUT_STEP_ID, output: 'nope' }]))
    ).toBeUndefined();
  });
});

describe('assertHarvestSucceeded', () => {
  it('returns the counters of a harvest that ran', () => {
    const worker = workerWith([
      { stepId: WORKER_HARVEST_STEP_ID, output: { alerts: 12 } },
      outputStep({ reviews_requested: 3, harvest_failed: false }),
    ]);

    expect(assertHarvestSucceeded(worker)).toMatchObject({ reviews_requested: 3 });
  });

  it('THROWS when the worker reported harvest_failed, naming the harvest step', () => {
    // The un-fixed behaviour: a failed harvest leaves the sweep `completed` with
    // reviews_requested: 0, and the suite reported "0 reviews, nothing to tune".
    const worker = workerWith([
      {
        stepId: WORKER_HARVEST_STEP_ID,
        error: 'verification_exception: Unknown column [kibana.alert.workflow_tags]',
      },
      outputStep({ reviews_requested: 0, harvest_failed: true }),
    ]);

    expect(() => assertHarvestSucceeded(worker)).toThrow(/harvest_failed=true/);
    expect(() => assertHarvestSucceeded(worker)).toThrow(/Unknown column/);
  });

  it('does not throw for a sweep that harvested and found nothing to tune', () => {
    // A legitimate empty sweep: the harvest ran, it just matched no alert.
    const worker = workerWith([
      { stepId: WORKER_HARVEST_STEP_ID, output: { alerts: 0 } },
      outputStep({ reviews_requested: 0, harvest_failed: false }),
    ]);

    expect(() => assertHarvestSucceeded(worker)).not.toThrow();
  });

  it('does not throw when the worker emitted no counters at all', () => {
    // No output step means an earlier failure; the child-lookup error reports that.
    expect(() => assertHarvestSucceeded(workerWith([{ stepId: 'fetch_rule' }]))).not.toThrow();
  });
});
