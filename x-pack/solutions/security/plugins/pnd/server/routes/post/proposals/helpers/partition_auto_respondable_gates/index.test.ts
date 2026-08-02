/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import {
  PND_GATE_REGISTRY,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  WATCH_AUTONOMY_LEVELS,
} from '@kbn/pnd-common';
import type { WatchAutonomyLevel } from '@kbn/pnd-common';
import { partitionAutoRespondableGates } from '.';

const step = (stepId: string, overrides: Partial<EsWorkflowStepExecution> = {}) =>
  ({
    id: `exec-${stepId}`,
    status: 'waiting_for_input',
    stepId,
    workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    workflowRunId: `run-${stepId}`,
    ...overrides,
  } as EsWorkflowStepExecution);

describe('partitionAutoRespondableGates', () => {
  it('marks a reversible gate auto-respondable at the assisted level', () => {
    const { autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'assisted',
      steps: [step('await_open_investigation')],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(autoRespondable).toEqual([
      {
        autoApproveResponse: { decision: 'approve' },
        stepExecutionId: 'exec-await_open_investigation',
        stepId: 'await_open_investigation',
        workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        workflowRunId: 'run-await_open_investigation',
      },
    ]);
  });

  it('leaves every gate in place at the manual level', () => {
    const { skipped, autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'manual',
      steps: [step('await_open_investigation'), step('await_promote_incident')],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect({ skipped, autoRespondableCount: autoRespondable.length }).toEqual({
      autoRespondableCount: 0,
      skipped: 2,
    });
  });

  /**
   * ⛔ D15 / security finding S5, asserted **unconditionally** rather than at one level for one gate.
   *
   * Driven by `PND_GATE_REGISTRY` × `WATCH_AUTONOMY_LEVELS`, so a fifth `alwaysGate` gate or a fourth
   * autonomy level is covered the day it is added, and each case names the gate it is about.
   *
   * This is one of the three places D15 is written down, and since bead kibana-phf4.33 it is the only
   * *runtime* one a reader can find from the product: the Watch settings page's Approval gates table
   * displayed the invariant, and the 2026-08-10 design deleted it. The other two are the `alwaysGate`
   * flag itself (`gate_registry/index.test.ts`) and the absence of an `if` wrapper in the watch YAML
   * (`managed_workflow_drift.test.ts`).
   */
  describe.each(PND_GATE_REGISTRY.filter((gate) => gate.alwaysGate))(
    '$gateId (alwaysGate, D15): never auto-respondable',
    (gate) => {
      it.each([...WATCH_AUTONOMY_LEVELS])('is refused at the %s level', (autonomyLevel) => {
        const { skipped, autoRespondable } = partitionAutoRespondableGates({
          autonomyLevel,
          steps: [step(gate.stepId, { workflowId: gate.workflowId })],
          watchId: gate.workflowId,
        });

        expect({ skipped, autoRespondableCount: autoRespondable.length }).toEqual({
          autoRespondableCount: 0,
          skipped: 1,
        });
      });
    }
  );

  it('accepts a non-alwaysGate gate at the supervised level', () => {
    const { autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'supervised',
      steps: [step('await_promote_incident')],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(autoRespondable).toHaveLength(1);
  });

  it('carries autoApproveResponse from the registry so the route does not hardcode the payload', () => {
    const { autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'supervised',
      steps: [step('await_promote_incident')],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect(autoRespondable[0]?.autoApproveResponse).toEqual({ decision: 'approve' });
  });

  it('ignores pending gates that belong to another watch', () => {
    const { skipped, autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'supervised',
      steps: [
        step('await_open_investigation', { workflowId: 'system-security-watch-post-incident' }),
      ],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect({ skipped, autoRespondableCount: autoRespondable.length }).toEqual({
      autoRespondableCount: 0,
      skipped: 0,
    });
  });

  it('ignores pending steps that are not registered gates', () => {
    const { skipped, autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'supervised',
      steps: [step('some_other_wait_step')],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect({ skipped, autoRespondableCount: autoRespondable.length }).toEqual({
      autoRespondableCount: 0,
      skipped: 0,
    });
  });

  it('fail-closes for a level outside the shared scale', () => {
    const { skipped, autoRespondable } = partitionAutoRespondableGates({
      autonomyLevel: 'autonomous' as WatchAutonomyLevel,
      steps: [step('await_open_investigation')],
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });

    expect({ skipped, autoRespondableCount: autoRespondable.length }).toEqual({
      autoRespondableCount: 0,
      skipped: 1,
    });
  });
});
