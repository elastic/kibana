/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ORCHESTRATOR_STEP_IDS,
  PHASE_CATALOG,
  PND_GATE_PHASE_STEP_IDS,
  PND_GATE_STEP_IDS,
  type PndPhaseStepProjection,
} from '@kbn/pnd-common';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

import { NOT_STARTED_STEP_STATUS, UPSTREAM_STEP_STATUS, buildExecutionSteps } from '.';

const stepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> & Pick<WorkflowStepExecutionDto, 'id' | 'stepId'>
): WorkflowStepExecutionDto =>
  ({
    finishedAt: '2026-08-02T00:05:00.000Z',
    startedAt: '2026-08-02T00:00:00.000Z',
    status: ExecutionStatus.COMPLETED,
    stepExecutionIndex: 0,
    workflowId: 'system-security-watch-deep',
    workflowRunId: 'run-deep',
    ...overrides,
  } as unknown as WorkflowStepExecutionDto);

const byPhaseStepId = (steps: PndPhaseStepProjection[]): Map<string, PndPhaseStepProjection> =>
  new Map(steps.map((step) => [step.phaseStepId, step]));

const LIVE_ENTRY_IDS = PHASE_CATALOG.filter((entry) => entry.liveness === 'live').map(
  (entry) => entry.id
);
const UPSTREAM_ENTRY_IDS = PHASE_CATALOG.filter((entry) => entry.liveness === 'upstream').map(
  (entry) => entry.id
);

/**
 * The catalog rows that share a gate's `orchestratorStepId` with the gate row itself — derived from
 * the catalog rather than restated, so this stays honest if the catalog changes.
 */
const DUPLICATED_PAIRS: Array<[string, string]> = Object.values(PND_GATE_PHASE_STEP_IDS).flatMap(
  (gatePhaseStepId) => {
    const gateRow = PHASE_CATALOG.find((entry) => entry.id === gatePhaseStepId);
    const stepRows = PHASE_CATALOG.filter(
      (entry) =>
        entry.id !== gatePhaseStepId && entry.orchestratorStepId === gateRow?.orchestratorStepId
    );
    return stepRows.map((entry): [string, string] => [entry.id, gatePhaseStepId]);
  }
);

describe('buildExecutionSteps', () => {
  it('pins the three gate rows that a step row duplicates', () => {
    expect(DUPLICATED_PAIRS).toEqual([
      ['step-4-3', PND_GATE_PHASE_STEP_IDS.applyTuning],
      ['step-3-5', PND_GATE_PHASE_STEP_IDS.incidentContained],
      ['step-2-7', PND_GATE_PHASE_STEP_IDS.promoteIncident],
    ]);
  });

  describe('nothing has run yet', () => {
    const steps = buildExecutionSteps({ stepExecutionsByStepId: new Map() });
    const stepsById = byPhaseStepId(steps);

    it('returns every catalog row in catalog order', () => {
      expect(steps.map((step) => step.phaseStepId)).toEqual(PHASE_CATALOG.map((entry) => entry.id));
    });

    it('marks every upstream row upstream with no execution fields', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)).toEqual({ phaseStepId: id, status: UPSTREAM_STEP_STATUS });
      });
    });

    it('marks every live row not_started with no execution fields', () => {
      LIVE_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)).toEqual({ phaseStepId: id, status: NOT_STARTED_STEP_STATUS });
      });
    });

    it('never marks an upstream row skipped, which means only a real engine skip', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)?.status).not.toBe('skipped');
      });
    });
  });

  describe('Watch Floor parked at the first gate', () => {
    const stepExecutionsByStepId = new Map<string, WorkflowStepExecutionDto>([
      [
        ORCHESTRATOR_STEP_IDS.deriveIds,
        stepExecution({ id: 'se-derive', stepId: ORCHESTRATOR_STEP_IDS.deriveIds }),
      ],
      [
        ORCHESTRATOR_STEP_IDS.openInvestigation,
        stepExecution({
          finishedAt: '',
          id: 'se-open',
          status: ExecutionStatus.RUNNING,
          stepId: ORCHESTRATOR_STEP_IDS.openInvestigation,
        }),
      ],
      [
        PND_GATE_STEP_IDS.awaitPromoteIncident,
        stepExecution({
          finishedAt: '',
          id: 'se-gate',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          stepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
        }),
      ],
    ]);
    const stepsById = byPhaseStepId(buildExecutionSteps({ stepExecutionsByStepId }));

    it('completes phase 1 step 1.1 with execution fields and a step-level deep link', () => {
      expect(stepsById.get('step-1-1')).toEqual({
        deepLinkPath:
          '/system-security-watch-deep?tab=executions&executionId=run-deep&stepExecutionId=se-derive',
        finishedAt: '2026-08-02T00:05:00.000Z',
        phaseStepId: 'step-1-1',
        startedAt: '2026-08-02T00:00:00.000Z',
        status: 'completed',
        stepExecutionId: 'se-derive',
        workflowId: 'system-security-watch-deep',
        workflowRunId: 'run-deep',
      });
    });

    it('gives each live row its own deep link rather than one shared per run (F1)', () => {
      expect(stepsById.get('step-2-1')?.deepLinkPath).toEqual(
        '/system-security-watch-deep?tab=executions&executionId=run-deep&stepExecutionId=se-open'
      );
    });

    it('shows step 2.1 running and omits finishedAt while it is in progress', () => {
      const step = stepsById.get('step-2-1');
      expect(step?.status).toBe('running');
      expect(step?.stepExecutionId).toBe('se-open');
      expect(step).not.toHaveProperty('finishedAt');
    });

    it('shows the promote gate pending (both the step row and the gate row)', () => {
      expect(stepsById.get('step-2-7')?.status).toBe('waiting_for_input');
      expect(stepsById.get('gate-promote-incident')?.status).toBe('waiting_for_input');
    });

    it('leaves later live steps not_started', () => {
      expect(stepsById.get('step-2-6')?.status).toBe(NOT_STARTED_STEP_STATUS);
      expect(stepsById.get('step-4-4')?.status).toBe(NOT_STARTED_STEP_STATUS);
    });

    it('keeps every upstream row upstream', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)?.status).toBe(UPSTREAM_STEP_STATUS);
      });
    });

    it.each(DUPLICATED_PAIRS)(
      'resolves %s and %s to the same step execution',
      (stepRowId, gateId) => {
        expect({ ...stepsById.get(stepRowId), phaseStepId: gateId }).toEqual(stepsById.get(gateId));
      }
    );
  });

  describe('both orchestrators complete', () => {
    const stepExecutionsByStepId = new Map<string, WorkflowStepExecutionDto>([
      ...Object.values(ORCHESTRATOR_STEP_IDS).map((stepId): [string, WorkflowStepExecutionDto] => [
        stepId,
        stepExecution({
          id: `se-${stepId}`,
          stepId,
          workflowId: stepId.includes('tuning')
            ? 'system-security-watch-post-incident'
            : 'system-security-watch-deep',
          workflowRunId: stepId.includes('tuning') ? 'run-detection' : 'run-deep',
        }),
      ]),
      ...Object.values(PND_GATE_STEP_IDS).map((stepId): [string, WorkflowStepExecutionDto] => [
        stepId,
        stepExecution({ id: `se-${stepId}`, stepId }),
      ]),
    ]);
    const stepsById = byPhaseStepId(buildExecutionSteps({ stepExecutionsByStepId }));

    it('resolves Phase 4 tuning steps from the Detection Watch execution', () => {
      expect(stepsById.get('step-4-2')).toEqual(
        expect.objectContaining({
          status: 'completed',
          workflowId: 'system-security-watch-post-incident',
          workflowRunId: 'run-detection',
        })
      );
      expect(stepsById.get('step-4-4')).toEqual(
        expect.objectContaining({
          status: 'completed',
          workflowId: 'system-security-watch-post-incident',
          workflowRunId: 'run-detection',
        })
      );
    });

    it('completes every live row', () => {
      LIVE_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)?.status).toBe('completed');
      });
    });

    it('links every live row to its own step execution, not just to the run (F1)', () => {
      LIVE_ENTRY_IDS.forEach((id) => {
        const step = stepsById.get(id);
        expect(step?.deepLinkPath).toContain(`&stepExecutionId=${step?.stepExecutionId}`);
      });
    });

    it.each(DUPLICATED_PAIRS)(
      'resolves %s and %s to the same step execution',
      (stepRowId, gateId) => {
        expect({ ...stepsById.get(stepRowId), phaseStepId: gateId }).toEqual(stepsById.get(gateId));
      }
    );
  });

  /**
   * kibana-phf4.12 retired the lifecycle stub, so an upstream row is resolved from the **catalog
   * alone**. These assertions are what the stub's own describe used to prove the other way round: an
   * upstream row must never pick up an execution, because Attack Discovery does that work before PND
   * is invoked and no PND step execution can stand for it.
   */
  describe('upstream rows are resolved from the catalog, never from an execution', () => {
    // Deliberately keyed by the upstream rows' own catalog ids as well as by every real step id: even
    // if some future workflow declared a step named `step-1-2`, the row may not adopt it.
    const stepExecutionsByStepId = new Map<string, WorkflowStepExecutionDto>([
      ...Object.values(ORCHESTRATOR_STEP_IDS).map((stepId): [string, WorkflowStepExecutionDto] => [
        stepId,
        stepExecution({ id: `se-${stepId}`, stepId }),
      ]),
      ...UPSTREAM_ENTRY_IDS.map((id): [string, WorkflowStepExecutionDto] => [
        id,
        stepExecution({ id: `se-${id}`, stepId: id }),
      ]),
    ]);
    const stepsById = byPhaseStepId(buildExecutionSteps({ stepExecutionsByStepId }));

    it('carries only the id and the status, with no execution fields at all', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)).toEqual({ phaseStepId: id, status: UPSTREAM_STEP_STATUS });
      });
    });

    it('never renders an upstream row completed, which would claim a PND step ran', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)?.status).not.toBe('completed');
      });
    });

    it('never renders an upstream row not_started, which would suggest one is about to', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)?.status).not.toBe(NOT_STARTED_STEP_STATUS);
      });
    });

    it('offers no deep link, because there is no PND step execution to open', () => {
      UPSTREAM_ENTRY_IDS.forEach((id) => {
        expect(stepsById.get(id)).not.toHaveProperty('deepLinkPath');
      });
    });
  });

  describe('an answered gate is the waitForInput step itself', () => {
    const stepExecutionsByStepId = new Map<string, WorkflowStepExecutionDto>([
      [
        PND_GATE_STEP_IDS.awaitOpenInvestigation,
        stepExecution({
          finishedAt: '2026-08-02T00:01:01.000Z',
          id: 'se-gate-open',
          startedAt: '2026-08-02T00:01:00.000Z',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        }),
      ],
    ]);
    const stepsById = byPhaseStepId(buildExecutionSteps({ stepExecutionsByStepId }));

    it('reads completed on the open-investigation gate, with the gate step timestamps and link', () => {
      expect(stepsById.get('gate-open-investigation')).toEqual({
        deepLinkPath:
          '/system-security-watch-deep?tab=executions&executionId=run-deep&stepExecutionId=se-gate-open',
        finishedAt: '2026-08-02T00:01:01.000Z',
        phaseStepId: 'gate-open-investigation',
        startedAt: '2026-08-02T00:01:00.000Z',
        status: 'completed',
        stepExecutionId: 'se-gate-open',
        workflowId: 'system-security-watch-deep',
        workflowRunId: 'run-deep',
      });
    });

    it.each([PND_GATE_PHASE_STEP_IDS.incidentContained, PND_GATE_PHASE_STEP_IDS.applyTuning])(
      'leaves the unreached gate row %s not_started',
      (gateId) => {
        expect(stepsById.get(gateId)).toEqual({
          phaseStepId: gateId,
          status: NOT_STARTED_STEP_STATUS,
        });
      }
    );
  });
});
