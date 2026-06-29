/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';

import { applyGenerationStatusOverride } from './apply_generation_status_override';
import type {
  AggregatedWorkflowExecution,
  StepExecutionWithLink,
} from '../../loading_callout/types';

const createStep = (
  overrides: Partial<StepExecutionWithLink> & Pick<StepExecutionWithLink, 'stepId'>
): StepExecutionWithLink => ({
  error: undefined,
  executionTimeMs: 100,
  finishedAt: '2024-01-01T00:00:01Z',
  globalExecutionIndex: 0,
  id: `${overrides.stepId}-id`,
  input: undefined,
  output: undefined,
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00Z',
  state: undefined,
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepType: 'test',
  topologicalIndex: 0,
  ...overrides,
});

const createAggregatedExecution = (
  overrides: Partial<AggregatedWorkflowExecution> = {}
): AggregatedWorkflowExecution => ({
  status: ExecutionStatus.COMPLETED,
  steps: [],
  workflowExecutions: null,
  ...overrides,
});

describe('applyGenerationStatusOverride', () => {
  describe('when generationStatus is "failed"', () => {
    it('overrides a generation step with COMPLETED status to FAILED (matched by stepId)', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
          }),
          createStep({
            status: ExecutionStatus.PENDING,
            stepId: 'validate_discoveries',
            topologicalIndex: 2,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.steps.map(({ status, stepId }) => ({ status, stepId }))).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'retrieve_alerts' },
        { status: ExecutionStatus.FAILED, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
      ]);
    });

    it('overrides a generation step with COMPLETED status to FAILED (matched by pipelinePhase)', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            pipelinePhase: 'retrieve_alerts',
            status: ExecutionStatus.COMPLETED,
            stepId: 'custom_retrieval',
            topologicalIndex: 0,
          }),
          createStep({
            pipelinePhase: 'generate_discoveries',
            status: ExecutionStatus.COMPLETED,
            stepId: 'custom_generation',
            topologicalIndex: 1,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      const generationStep = result.steps.find((s) => s.stepId === 'custom_generation');

      expect(generationStep?.status).toBe(ExecutionStatus.FAILED);
    });

    it('overrides a generation step with PENDING status to FAILED when generation workflow never ran', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.PENDING,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
            workflowRunId: undefined,
          }),
          createStep({
            status: ExecutionStatus.PENDING,
            stepId: 'validate_discoveries',
            topologicalIndex: 2,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.steps.map(({ status, stepId }) => ({ status, stepId }))).toEqual([
        { status: ExecutionStatus.COMPLETED, stepId: 'retrieve_alerts' },
        { status: ExecutionStatus.FAILED, stepId: 'generate_discoveries' },
        { status: ExecutionStatus.PENDING, stepId: 'validate_discoveries' },
      ]);
    });

    it('overrides aggregated status to FAILED when generation step is PENDING and generationStatus is failed', () => {
      const aggregatedExecution = createAggregatedExecution({
        status: ExecutionStatus.COMPLETED,
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.PENDING,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
            workflowRunId: undefined,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.status).toBe(ExecutionStatus.FAILED);
    });

    it('does NOT override a generation step that is already FAILED', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.FAILED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.steps[0].status).toBe(ExecutionStatus.FAILED);
    });

    it('does NOT override non-generation steps', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
          }),
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'validate_discoveries',
            topologicalIndex: 2,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.steps[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(result.steps[2].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('also overrides the aggregated status to FAILED when generation fails', () => {
      const aggregatedExecution = createAggregatedExecution({
        status: ExecutionStatus.COMPLETED,
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.status).toBe(ExecutionStatus.FAILED);
    });

    it('returns a new object (does not mutate the original)', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result).not.toBe(aggregatedExecution);
      expect(result.steps).not.toBe(aggregatedExecution.steps);
      expect(aggregatedExecution.steps[0].status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('when a validation step already has FAILED status', () => {
    it('returns aggregatedExecution unchanged when validate_discoveries is already FAILED', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
          }),
          createStep({
            status: ExecutionStatus.FAILED,
            stepId: 'validate_discoveries',
            topologicalIndex: 2,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result).toBe(aggregatedExecution);
    });

    it('does NOT mark generation step as FAILED when validation already failed (matched by pipelinePhase)', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            pipelinePhase: 'generate_discoveries',
            status: ExecutionStatus.COMPLETED,
            stepId: 'custom_generation',
            topologicalIndex: 0,
          }),
          createStep({
            pipelinePhase: 'validate_discoveries',
            status: ExecutionStatus.FAILED,
            stepId: 'custom_validation',
            topologicalIndex: 1,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result).toBe(aggregatedExecution);
      expect(result.steps.find((s) => s.stepId === 'custom_generation')?.status).toBe(
        ExecutionStatus.COMPLETED
      );
    });
  });

  describe('when eventActions contains "validation-failed"', () => {
    it('does NOT override generation step when validation-failed is in eventActions (validation step is PENDING)', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'retrieve_alerts',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 1,
          }),
          createStep({
            status: ExecutionStatus.PENDING,
            stepId: 'validate_discoveries',
            topologicalIndex: 2,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        eventActions: [
          'generation-started',
          'generate-step-succeeded',
          'validation-failed',
          'generation-failed',
        ],
        generationStatus: 'failed',
      });

      expect(result).toBe(aggregatedExecution);
    });

    it('leaves generation step status unchanged when validation-failed is in eventActions', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 0,
          }),
          createStep({
            status: ExecutionStatus.PENDING,
            stepId: 'validate_discoveries',
            topologicalIndex: 1,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        eventActions: ['validation-failed'],
        generationStatus: 'failed',
      });

      expect(result.steps[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('DOES override generation step when eventActions does NOT contain validation-failed', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 0,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        eventActions: ['generation-started', 'generate-step-failed', 'generation-failed'],
        generationStatus: 'failed',
      });

      expect(result.steps[0].status).toBe(ExecutionStatus.FAILED);
    });

    it('DOES override generation step when eventActions is null', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 0,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        eventActions: null,
        generationStatus: 'failed',
      });

      expect(result.steps[0].status).toBe(ExecutionStatus.FAILED);
    });

    it('DOES override generation step when eventActions is undefined', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
            topologicalIndex: 0,
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'failed',
      });

      expect(result.steps[0].status).toBe(ExecutionStatus.FAILED);
    });
  });

  describe('when generationStatus is NOT "failed"', () => {
    it('returns the aggregated execution unchanged when generationStatus is "succeeded"', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'succeeded',
      });

      expect(result).toBe(aggregatedExecution);
    });

    it('returns the aggregated execution unchanged when generationStatus is "started"', () => {
      const aggregatedExecution = createAggregatedExecution({
        status: ExecutionStatus.RUNNING,
        steps: [
          createStep({
            status: ExecutionStatus.RUNNING,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'started',
      });

      expect(result).toBe(aggregatedExecution);
    });

    it('returns the aggregated execution unchanged when generationStatus is undefined', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.COMPLETED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: undefined,
      });

      expect(result).toBe(aggregatedExecution);
    });

    it('returns the aggregated execution unchanged when generationStatus is "canceled"', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.CANCELLED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'canceled',
      });

      expect(result).toBe(aggregatedExecution);
    });

    it('returns the aggregated execution unchanged when generationStatus is "dismissed"', () => {
      const aggregatedExecution = createAggregatedExecution({
        steps: [
          createStep({
            status: ExecutionStatus.CANCELLED,
            stepId: 'generate_discoveries',
          }),
        ],
      });

      const result = applyGenerationStatusOverride({
        aggregatedExecution,
        generationStatus: 'dismissed',
      });

      expect(result).toBe(aggregatedExecution);
    });
  });
});
