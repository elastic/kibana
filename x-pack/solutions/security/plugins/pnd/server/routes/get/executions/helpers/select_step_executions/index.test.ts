/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

import { selectStepExecutions } from '.';

const stepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> & Pick<WorkflowStepExecutionDto, 'id' | 'stepId'>
): WorkflowStepExecutionDto =>
  ({
    startedAt: '2026-08-02T00:00:00.000Z',
    status: ExecutionStatus.COMPLETED,
    stepExecutionIndex: 0,
    workflowId: 'wf-deep',
    workflowRunId: 'run-1',
    ...overrides,
  } as unknown as WorkflowStepExecutionDto);

describe('selectStepExecutions', () => {
  it('returns an empty map for no executions', () => {
    expect(selectStepExecutions([]).size).toBe(0);
  });

  it('keys each step execution by its stepId', () => {
    const map = selectStepExecutions([
      stepExecution({ id: 'se-1', stepId: 'derive_ids' }),
      stepExecution({ id: 'se-2', stepId: 'open_investigation' }),
    ]);

    expect(map.get('derive_ids')?.id).toBe('se-1');
    expect(map.get('open_investigation')?.id).toBe('se-2');
  });

  it('keeps the later instance of a repeated stepId by stepExecutionIndex', () => {
    const map = selectStepExecutions([
      stepExecution({ id: 'se-old', stepId: 'assess_investigation', stepExecutionIndex: 0 }),
      stepExecution({ id: 'se-new', stepId: 'assess_investigation', stepExecutionIndex: 2 }),
    ]);

    expect(map.get('assess_investigation')?.id).toBe('se-new');
  });

  it('is order-independent when picking the later instance', () => {
    const map = selectStepExecutions([
      stepExecution({ id: 'se-new', stepId: 'assess_investigation', stepExecutionIndex: 2 }),
      stepExecution({ id: 'se-old', stepId: 'assess_investigation', stepExecutionIndex: 0 }),
    ]);

    expect(map.get('assess_investigation')?.id).toBe('se-new');
  });

  it('tie-breaks equal execution indexes by startedAt', () => {
    const map = selectStepExecutions([
      stepExecution({
        id: 'se-early',
        startedAt: '2026-08-02T00:00:00.000Z',
        stepExecutionIndex: 0,
        stepId: 'derive_ids',
      }),
      stepExecution({
        id: 'se-late',
        startedAt: '2026-08-02T01:00:00.000Z',
        stepExecutionIndex: 0,
        stepId: 'derive_ids',
      }),
    ]);

    expect(map.get('derive_ids')?.id).toBe('se-late');
  });

  it('aggregates disjoint steps from both orchestrator executions', () => {
    const map = selectStepExecutions([
      stepExecution({ id: 'se-deep', stepId: 'derive_ids', workflowId: 'wf-deep' }),
      stepExecution({ id: 'se-detection', stepId: 'draft_tuning', workflowId: 'wf-detection' }),
    ]);

    expect(map.get('derive_ids')?.workflowId).toBe('wf-deep');
    expect(map.get('draft_tuning')?.workflowId).toBe('wf-detection');
  });
});
