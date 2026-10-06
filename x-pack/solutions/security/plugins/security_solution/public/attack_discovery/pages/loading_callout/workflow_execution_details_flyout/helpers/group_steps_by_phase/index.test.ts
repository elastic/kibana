/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepExecutionWithLink } from '../../../types';
import { groupStepsByPhase } from '.';

const makeStep = (overrides: Partial<StepExecutionWithLink> = {}): StepExecutionWithLink => ({
  executionTimeMs: 100,
  finishedAt: '2024-01-01T00:00:01Z',
  globalExecutionIndex: 0,
  id: 'step-exec-1',
  isTestRun: false,
  pipelinePhase: 'generate_discoveries',
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00Z',
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId: 'step-1',
  stepType: 'ai.prompt',
  topologicalIndex: 0,
  workflowId: 'wf-1',
  workflowName: 'My Workflow',
  workflowRunId: 'run-1',
  ...overrides,
});

describe('groupStepsByPhase', () => {
  describe('grouping by workflowRunId', () => {
    it('returns an empty array when steps is empty', () => {
      expect(groupStepsByPhase([])).toEqual([]);
    });

    it('returns one group per unique workflowRunId', () => {
      const steps = [
        makeStep({ stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ stepId: 'b', workflowRunId: 'run-1' }),
        makeStep({ stepId: 'c', workflowRunId: 'run-2' }),
      ];

      const groups = groupStepsByPhase(steps);

      expect(groups).toHaveLength(2);
      expect(groups[0].key).toBe('run-1');
      expect(groups[1].key).toBe('run-2');
    });

    it('preserves insertion order of groups', () => {
      const steps = [
        makeStep({ stepId: 'a', workflowRunId: 'run-2' }),
        makeStep({ stepId: 'b', workflowRunId: 'run-1' }),
        makeStep({ stepId: 'c', workflowRunId: 'run-3' }),
      ];

      const groups = groupStepsByPhase(steps);

      expect(groups.map((g) => g.key)).toEqual(['run-2', 'run-1', 'run-3']);
    });

    it('groups steps with undefined workflowRunId under a single unknown group', () => {
      const steps = [
        makeStep({ stepId: 'a', workflowRunId: undefined }),
        makeStep({ stepId: 'b', workflowRunId: undefined }),
      ];

      const groups = groupStepsByPhase(steps);

      expect(groups).toHaveLength(1);
      expect(groups[0].steps).toHaveLength(2);
    });

    it('carries representative pipelinePhase, workflowId, and workflowName from first step', () => {
      const steps = [
        makeStep({
          pipelinePhase: 'retrieve_alerts',
          stepId: 'a',
          workflowId: 'wf-abc',
          workflowName: 'Alert Retrieval',
          workflowRunId: 'run-1',
        }),
        makeStep({ pipelinePhase: 'other', stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.pipelinePhase).toBe('retrieve_alerts');
      expect(group.workflowId).toBe('wf-abc');
      expect(group.workflowName).toBe('Alert Retrieval');
    });
  });

  describe('duration summation', () => {
    it('sums executionTimeMs across all steps in a group', () => {
      const steps = [
        makeStep({ executionTimeMs: 300, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ executionTimeMs: 400, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.durationMs).toBe(700);
    });

    it('returns undefined durationMs when all steps lack executionTimeMs', () => {
      const steps = [makeStep({ executionTimeMs: undefined, stepId: 'a', workflowRunId: 'run-1' })];

      const [group] = groupStepsByPhase(steps);

      expect(group.durationMs).toBeUndefined();
    });

    it('includes only defined executionTimeMs values in the sum', () => {
      const steps = [
        makeStep({ executionTimeMs: 200, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ executionTimeMs: undefined, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.durationMs).toBe(200);
    });
  });

  describe('worstStatus computation (STATUS_PRIORITY)', () => {
    it('reports "failed" as worst status when any step has failed', () => {
      const steps = [
        makeStep({ status: ExecutionStatus.COMPLETED, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ status: ExecutionStatus.FAILED, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.worstStatus).toBe('failed');
    });

    it('reports "timed_out" as worse than "cancelled"', () => {
      const steps = [
        makeStep({ status: ExecutionStatus.CANCELLED, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ status: ExecutionStatus.TIMED_OUT, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.worstStatus).toBe('timed_out');
    });

    it('reports "running" as worse than "completed"', () => {
      const steps = [
        makeStep({ status: ExecutionStatus.COMPLETED, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ status: ExecutionStatus.RUNNING, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.worstStatus).toBe('running');
    });

    it('reports "completed" when all steps are completed', () => {
      const steps = [
        makeStep({ status: ExecutionStatus.COMPLETED, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ status: ExecutionStatus.COMPLETED, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.worstStatus).toBe('completed');
    });

    it('uses the first step status as initial worst when group has one step', () => {
      const steps = [makeStep({ status: ExecutionStatus.FAILED, workflowRunId: 'run-1' })];

      const [group] = groupStepsByPhase(steps);

      expect(group.worstStatus).toBe('failed');
    });
  });

  describe('first error extraction', () => {
    it('returns undefined error when no steps have errors', () => {
      const steps = [makeStep({ workflowRunId: 'run-1' })];

      const [group] = groupStepsByPhase(steps);

      expect(group.error).toBeUndefined();
    });

    it('returns the first error found in the group', () => {
      const firstError = { message: 'first error', type: 'ErrorA' };
      const secondError = { message: 'second error', type: 'ErrorB' };

      const steps = [
        makeStep({ error: firstError, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ error: secondError, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.error).toEqual(firstError);
    });

    it('skips steps without errors to find the first error', () => {
      const error = { message: 'only error', type: 'ErrorA' };

      const steps = [
        makeStep({ error: undefined, stepId: 'a', workflowRunId: 'run-1' }),
        makeStep({ error, stepId: 'b', workflowRunId: 'run-1' }),
      ];

      const [group] = groupStepsByPhase(steps);

      expect(group.error).toEqual(error);
    });
  });
});
