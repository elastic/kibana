/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';

import type { StepExecutionWithLink } from '../../../../loading_callout/types';
import {
  ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS,
  addAttackDiscoveryPipelinePlaceholders,
  shouldAddAttackDiscoveryPipelinePlaceholders,
} from '.';

const createStep = (
  overrides: Partial<StepExecutionWithLink> & { stepId: string }
): StepExecutionWithLink => ({
  error: undefined,
  executionTimeMs: 100,
  finishedAt: '2024-01-01T00:00:01Z',
  globalExecutionIndex: 0,
  id: `step-${overrides.stepId}`,
  input: undefined,
  output: undefined,
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00Z',
  state: undefined,
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepType: 'custom',
  topologicalIndex: 0,
  ...overrides,
});

describe('ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS', () => {
  it('defines three placeholder steps in canonical order', () => {
    expect(ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS.map((s) => s.stepId)).toEqual([
      'retrieve_alerts',
      'generate_discoveries',
      'validate_discoveries',
    ]);
  });

  it('uses a negative topologicalIndex for retrieve_alerts', () => {
    const retrieveAlerts = ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS.find(
      (s) => s.stepId === 'retrieve_alerts'
    );

    expect(retrieveAlerts?.topologicalIndex).toBeLessThan(0);
  });
});

describe('shouldAddAttackDiscoveryPipelinePlaceholders', () => {
  it('returns true when a step has an attack_discovery step type', () => {
    const steps = [createStep({ stepId: 'gen', stepType: 'attack-discovery.generate' })];

    expect(shouldAddAttackDiscoveryPipelinePlaceholders(steps)).toBe(true);
  });

  it('returns true when a step has a matching placeholder stepId', () => {
    const steps = [createStep({ stepId: 'retrieve_alerts', stepType: 'esql' })];

    expect(shouldAddAttackDiscoveryPipelinePlaceholders(steps)).toBe(true);
  });

  it('returns true when a step has a matching pipeline phase', () => {
    const steps = [
      createStep({ pipelinePhase: 'retrieve_alerts', stepId: 'query_alerts', stepType: 'esql' }),
    ];

    expect(shouldAddAttackDiscoveryPipelinePlaceholders(steps)).toBe(true);
  });

  it('returns false for steps with no attack discovery relevance', () => {
    const steps = [createStep({ stepId: 'some_random_step', stepType: 'generic' })];

    expect(shouldAddAttackDiscoveryPipelinePlaceholders(steps)).toBe(false);
  });

  it('returns false for an empty steps array', () => {
    expect(shouldAddAttackDiscoveryPipelinePlaceholders([])).toBe(false);
  });
});

describe('addAttackDiscoveryPipelinePlaceholders', () => {
  it('returns the original steps unchanged when no placeholders are needed', () => {
    const steps = [createStep({ stepId: 'unrelated', stepType: 'generic' })];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    expect(result).toBe(steps);
  });

  it('adds missing placeholder steps for a partial pipeline', () => {
    const steps = [
      createStep({
        stepId: 'retrieve_alerts',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
      }),
    ];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    expect(result.map((s) => s.stepId)).toEqual([
      'retrieve_alerts',
      'generate_discoveries',
      'validate_discoveries',
    ]);

    const genPlaceholder = result.find((s) => s.stepId === 'generate_discoveries');
    expect(genPlaceholder?.status).toBe(ExecutionStatus.PENDING);

    const valPlaceholder = result.find((s) => s.stepId === 'validate_discoveries');
    expect(valPlaceholder?.status).toBe(ExecutionStatus.PENDING);
  });

  it('does not add a placeholder when the step already exists', () => {
    const steps = [
      createStep({
        stepId: 'retrieve_alerts',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
      }),
      createStep({
        stepId: 'generate_discoveries',
        stepType: 'attack-discovery.generate',
        topologicalIndex: 1,
      }),
      createStep({
        stepId: 'validate_discoveries',
        stepType: 'attack-discovery.defaultValidation',
        topologicalIndex: 2,
      }),
    ];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    expect(result).toBe(steps);
  });

  it('suppresses retrieve_alerts placeholder when pipelinePhase covers it', () => {
    const steps = [
      createStep({
        pipelinePhase: 'retrieve_alerts',
        stepId: 'query_alerts',
        stepType: 'esql',
        topologicalIndex: 0,
      }),
    ];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    expect(result.some((s) => s.stepId === 'retrieve_alerts')).toBe(false);
    expect(result.some((s) => s.stepId === 'generate_discoveries')).toBe(true);
    expect(result.some((s) => s.stepId === 'validate_discoveries')).toBe(true);
  });

  it('suppresses validate_discoveries placeholder when promote_discoveries exists', () => {
    const steps = [
      createStep({
        stepId: 'retrieve_alerts',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
      }),
      createStep({
        stepId: 'generate_discoveries',
        stepType: 'attack-discovery.generate',
        topologicalIndex: 1,
      }),
      createStep({
        stepId: 'promote_discoveries',
        stepType: 'attack_discovery.promote',
        topologicalIndex: 2,
      }),
    ];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    expect(result.some((s) => s.stepId === 'validate_discoveries')).toBe(false);
  });

  it('places generation and validation placeholders after all real steps', () => {
    const steps = [
      createStep({
        pipelinePhase: 'retrieve_alerts',
        stepId: 'alert_step_1',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
      }),
      createStep({
        pipelinePhase: 'retrieve_alerts',
        stepId: 'alert_step_2',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 1000,
      }),
      createStep({
        pipelinePhase: 'retrieve_alerts',
        stepId: 'alert_step_3',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 2000,
      }),
    ];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    const genStep = result.find((s) => s.stepId === 'generate_discoveries');
    const valStep = result.find((s) => s.stepId === 'validate_discoveries');

    expect(genStep?.topologicalIndex).toBeGreaterThan(2000);
    expect(valStep?.topologicalIndex).toBeGreaterThan(genStep?.topologicalIndex ?? 0);
  });

  it('sorts the final result by topologicalIndex', () => {
    const steps = [
      createStep({
        stepId: 'retrieve_alerts',
        stepType: 'attack-discovery.defaultAlertRetrieval',
        topologicalIndex: 0,
      }),
    ];

    const result = addAttackDiscoveryPipelinePlaceholders(steps);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].topologicalIndex).toBeGreaterThanOrEqual(result[i - 1].topologicalIndex);
    }
  });

  describe('retrieve_alerts placeholder status inference', () => {
    it('sets the retrieve_alerts placeholder to COMPLETED when generation has started', () => {
      const steps = [
        createStep({
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
          status: ExecutionStatus.RUNNING,
          topologicalIndex: 1000,
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const retrieveStep = result.find((s) => s.stepId === 'retrieve_alerts');

      expect(retrieveStep?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('sets the retrieve_alerts placeholder to COMPLETED when generation has completed', () => {
      const steps = [
        createStep({
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 1000,
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const retrieveStep = result.find((s) => s.stepId === 'retrieve_alerts');

      expect(retrieveStep?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('sets the retrieve_alerts placeholder to COMPLETED when validation has started', () => {
      const steps = [
        createStep({
          pipelinePhase: 'generate_discoveries',
          stepId: 'custom_gen',
          stepType: 'attack-discovery.generate',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 1000,
        }),
        createStep({
          stepId: 'validate_discoveries',
          stepType: 'attack-discovery.defaultValidation',
          status: ExecutionStatus.RUNNING,
          topologicalIndex: 2000,
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const retrieveStep = result.find((s) => s.stepId === 'retrieve_alerts');

      expect(retrieveStep?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('keeps the retrieve_alerts placeholder as PENDING when all downstream steps are PENDING', () => {
      const steps = [
        createStep({
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
          status: ExecutionStatus.PENDING,
          topologicalIndex: 1000,
        }),
        createStep({
          stepId: 'validate_discoveries',
          stepType: 'attack-discovery.defaultValidation',
          status: ExecutionStatus.PENDING,
          topologicalIndex: 2000,
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const retrieveStep = result.find((s) => s.stepId === 'retrieve_alerts');

      expect(retrieveStep?.status).toBe(ExecutionStatus.PENDING);
    });

    it('keeps generate_discoveries PENDING when a retrieve_alerts step has FAILED status', () => {
      const steps = [
        createStep({
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
          status: ExecutionStatus.FAILED,
          topologicalIndex: 0,
          workflowRunId: 'retrieval-run-id',
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const genStep = result.find((s) => s.stepId === 'generate_discoveries');

      expect(genStep?.status).toBe(ExecutionStatus.PENDING);
    });

    it('keeps generate_discoveries PENDING when one of multiple retrieval steps failed (mixed success and failure)', () => {
      // Scenario: two alert retrieval workflows configured; first succeeded, second failed
      // (e.g., workflow definition was deleted). Generation must NOT show RUNNING.
      const steps = [
        createStep({
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 0,
          workflowRunId: 'first-retrieval-run-id',
        }),
        createStep({
          pipelinePhase: 'retrieve_alerts',
          stepId: 'retrieve_alerts',
          status: ExecutionStatus.FAILED,
          topologicalIndex: 1000,
          workflowRunId: 'second-retrieval-run-id',
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const genStep = result.find((s) => s.stepId === 'generate_discoveries');

      expect(genStep?.status).toBe(ExecutionStatus.PENDING);
    });

    it('keeps generate_discoveries PENDING when a custom retrieval step (pipelinePhase) has FAILED status', () => {
      const steps = [
        createStep({
          pipelinePhase: 'retrieve_alerts',
          stepId: 'query_alerts',
          stepType: 'esql',
          status: ExecutionStatus.FAILED,
          topologicalIndex: 0,
          workflowRunId: 'custom-retrieval-run-id',
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const genStep = result.find((s) => s.stepId === 'generate_discoveries');

      expect(genStep?.status).toBe(ExecutionStatus.PENDING);
    });

    it('keeps generate_discoveries PENDING when retrieve_alerts has no workflowRunId', () => {
      // No workflowRunId means the retrieval step is itself a placeholder — generation
      // is not yet in flight.
      const steps = [
        createStep({
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 0,
          // workflowRunId intentionally absent
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const genStep = result.find((s) => s.stepId === 'generate_discoveries');

      expect(genStep?.status).toBe(ExecutionStatus.PENDING);
    });

    it('sets generate_discoveries to RUNNING when a real retrieve_alerts step is completed', () => {
      // A real step has a workflowRunId; its completion means the generation workflow
      // is actively running (but won't return a run ID until the LLM finishes).
      const steps = [
        createStep({
          finishedAt: '2024-01-01T00:01:00Z',
          startedAt: '2024-01-01T00:00:00Z',
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 0,
          workflowRunId: 'retrieval-run-id',
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const genStep = result.find((s) => s.stepId === 'generate_discoveries');

      expect(genStep?.status).toBe(ExecutionStatus.RUNNING);
    });

    it('sets generate_discoveries startedAt to the retrieval finishedAt when RUNNING', () => {
      // The LiveTimer uses startedAt to show elapsed time since generation began.
      // Without this, closing and reopening the flyout resets the timer to zero.
      const steps = [
        createStep({
          finishedAt: '2024-01-01T00:01:00Z',
          startedAt: '2024-01-01T00:00:00Z',
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 0,
          workflowRunId: 'retrieval-run-id',
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const genStep = result.find((s) => s.stepId === 'generate_discoveries');

      expect(genStep?.startedAt).toBe('2024-01-01T00:01:00Z');
    });

    it('does NOT infer status for validation placeholders', () => {
      const steps = [
        createStep({
          stepId: 'retrieve_alerts',
          stepType: 'attack-discovery.defaultAlertRetrieval',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 0,
        }),
        createStep({
          stepId: 'generate_discoveries',
          stepType: 'attack-discovery.generate',
          status: ExecutionStatus.COMPLETED,
          topologicalIndex: 1000,
        }),
      ];

      const result = addAttackDiscoveryPipelinePlaceholders(steps);

      const valStep = result.find((s) => s.stepId === 'validate_discoveries');

      expect(valStep?.status).toBe(ExecutionStatus.PENDING);
    });
  });
});
