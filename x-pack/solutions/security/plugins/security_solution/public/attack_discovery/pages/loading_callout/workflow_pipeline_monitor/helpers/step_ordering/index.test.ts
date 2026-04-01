/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepExecutionWithLink } from '../../../types';
import {
  CANONICAL_STEP_ORDER,
  getCanonicalOrder,
  groupStepsByWorkflow,
  isAlertRetrievalStep,
  isPersistenceStep,
} from '.';

const createStep = (overrides: Partial<StepExecutionWithLink> = {}): StepExecutionWithLink =>
  ({
    id: 'step-1',
    pipelinePhase: undefined,
    status: ExecutionStatus.COMPLETED,
    stepId: 'test_step',
    topologicalIndex: 0,
    workflowId: undefined,
    ...overrides,
  } as unknown as StepExecutionWithLink);

describe('isAlertRetrievalStep', () => {
  it('returns true when pipelinePhase is retrieve_alerts', () => {
    expect(isAlertRetrievalStep(createStep({ pipelinePhase: 'retrieve_alerts' }))).toBe(true);
  });

  it('returns true when stepId is retrieve_alerts', () => {
    expect(isAlertRetrievalStep(createStep({ stepId: 'retrieve_alerts' }))).toBe(true);
  });

  it('returns false for a generation step', () => {
    expect(isAlertRetrievalStep(createStep({ stepId: 'generate_discoveries' }))).toBe(false);
  });

  it('returns true for a custom stepId with retrieve_alerts pipelinePhase', () => {
    expect(
      isAlertRetrievalStep(
        createStep({ pipelinePhase: 'retrieve_alerts', stepId: 'ask_agent_for_alerts' })
      )
    ).toBe(true);
  });
});

describe('CANONICAL_STEP_ORDER', () => {
  it('assigns 0 to generate_discoveries', () => {
    expect(CANONICAL_STEP_ORDER.generate_discoveries).toBe(0);
  });

  it('assigns 1 to validate_discoveries', () => {
    expect(CANONICAL_STEP_ORDER.validate_discoveries).toBe(1);
  });

  it('assigns 1 to promote_discoveries (backward compat)', () => {
    expect(CANONICAL_STEP_ORDER.promote_discoveries).toBe(1);
  });
});

describe('getCanonicalOrder', () => {
  it('returns 0 for generate_discoveries stepId', () => {
    expect(getCanonicalOrder(createStep({ stepId: 'generate_discoveries' }))).toBe(0);
  });

  it('returns 1 for validate_discoveries stepId', () => {
    expect(getCanonicalOrder(createStep({ stepId: 'validate_discoveries' }))).toBe(1);
  });

  it('falls back to pipelinePhase when stepId is not in CANONICAL_STEP_ORDER', () => {
    expect(
      getCanonicalOrder(createStep({ pipelinePhase: 'generate_discoveries', stepId: 'custom_gen' }))
    ).toBe(0);
  });

  it('returns the number of known steps for unknown step/phase', () => {
    const unknownOrder = getCanonicalOrder(createStep({ stepId: 'unknown' }));

    expect(unknownOrder).toBe(Object.keys(CANONICAL_STEP_ORDER).length);
  });
});

describe('isPersistenceStep', () => {
  it('returns true when stepId is persist_discoveries', () => {
    expect(isPersistenceStep(createStep({ stepId: 'persist_discoveries' }))).toBe(true);
  });

  it('returns true when pipelinePhase is persist_discoveries', () => {
    expect(
      isPersistenceStep(
        createStep({ pipelinePhase: 'persist_discoveries', stepId: 'custom_persist' })
      )
    ).toBe(true);
  });

  it('returns false for a generation step', () => {
    expect(isPersistenceStep(createStep({ stepId: 'generate_discoveries' }))).toBe(false);
  });

  it('returns false for a validation step', () => {
    expect(isPersistenceStep(createStep({ stepId: 'validate_discoveries' }))).toBe(false);
  });

  it('returns false for an alert retrieval step', () => {
    expect(isPersistenceStep(createStep({ stepId: 'retrieve_alerts' }))).toBe(false);
  });
});

describe('groupStepsByWorkflow', () => {
  it('returns empty array for empty input', () => {
    expect(groupStepsByWorkflow([])).toEqual([]);
  });

  it('groups steps with the same workflowId together', () => {
    const steps = [
      createStep({ id: 's1', workflowId: 'wf-a' }),
      createStep({ id: 's2', workflowId: 'wf-b' }),
      createStep({ id: 's3', workflowId: 'wf-a' }),
    ];

    const groups = groupStepsByWorkflow(steps);

    expect(groups).toHaveLength(2);
    expect(groups[0].map((s) => s.id)).toEqual(['s1', 's3']);
    expect(groups[1].map((s) => s.id)).toEqual(['s2']);
  });

  it('treats steps without workflowId as individual groups', () => {
    const steps = [
      createStep({ id: 's1', workflowId: undefined }),
      createStep({ id: 's2', workflowId: undefined }),
    ];

    const groups = groupStepsByWorkflow(steps);

    expect(groups).toHaveLength(2);
    expect(groups[0].map((s) => s.id)).toEqual(['s1']);
    expect(groups[1].map((s) => s.id)).toEqual(['s2']);
  });

  it('preserves insertion order of groups', () => {
    const steps = [
      createStep({ id: 's1', workflowId: 'wf-b' }),
      createStep({ id: 's2', workflowId: 'wf-a' }),
      createStep({ id: 's3', workflowId: 'wf-b' }),
    ];

    const groups = groupStepsByWorkflow(steps);

    expect(groups[0][0].workflowId).toBe('wf-b');
    expect(groups[1][0].workflowId).toBe('wf-a');
  });
});
