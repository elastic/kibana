/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  getGateDefinition,
  isGateAutoAcceptable,
  resolvePndWatchDefinitionId,
} from '@kbn/pnd-common';
import type { PndGateDefinition, WatchAutonomyLevel } from '@kbn/pnd-common';

/** A pending gate `_auto_respond` will accept, addressed for `approveGate`. */
export interface AutoRespondableGate {
  autoApproveResponse: NonNullable<PndGateDefinition['autoApproveResponse']>;
  stepExecutionId: string;
  stepId: string;
  workflowId: string;
  workflowRunId: string;
}

export interface PartitionAutoRespondableGatesParams {
  autonomyLevel: WatchAutonomyLevel;
  /** Space the steps were listed in, used to resolve per-space document ids. */
  spaceId: string;
  /** Pending `waitForInput` steps in the space (from `listPendingPndGates`). */
  steps: WorkflowStepExecutionDto[];
  /** The managed watch id being auto-responded (already allow-listed by the route). */
  watchId: string;
}

export interface PartitionedGates {
  /** Pending gates the current autonomy level auto-accepts. */
  autoRespondable: AutoRespondableGate[];
  /** Pending gates left in place — refused `alwaysGate` gates plus gates the level does not permit. */
  skipped: number;
}

/**
 * Split a watch's pending gates into those `_auto_respond` may accept and those it must
 * leave in place.
 *
 * Security finding S5: `alwaysGate` gates (containment, apply-tuning) are refused
 * **unconditionally, at every level** — the explicit `!gate.alwaysGate` guard is
 * defense in depth on top of {@link isGateAutoAcceptable} (which also refuses them),
 * because the YAML's structural `if`-less protection does not apply to a gate that is
 * already pending. Everything that is not an auto-acceptable gate counts as skipped, so
 * the caller's `{ approved, skipped }` total reflects every pending gate the watch owns.
 *
 * Each accepted gate carries `workflowId` + `stepId` so `approveGate` can
 * independently re-read the registry (S5-b), plus `autoApproveResponse` from this
 * pass so callers can inspect what the filter decided without a second lookup.
 */
export const partitionAutoRespondableGates = ({
  autonomyLevel,
  spaceId,
  steps,
  watchId,
}: PartitionAutoRespondableGatesParams): PartitionedGates => {
  const gates = steps
    .filter((step) => resolvePndWatchDefinitionId(step.workflowId, spaceId) === watchId)
    .flatMap((step) => {
      const gate = getGateDefinition(step.workflowId, step.stepId, spaceId);
      return gate == null ? [] : [{ gate, step }];
    });

  const autoRespondable = gates.flatMap(({ gate, step }) => {
    if (
      gate.alwaysGate ||
      gate.autoApproveResponse == null ||
      !isGateAutoAcceptable(gate.workflowId, step.stepId, autonomyLevel)
    ) {
      return [];
    }

    return [
      {
        autoApproveResponse: gate.autoApproveResponse,
        stepExecutionId: step.id,
        stepId: step.stepId,
        workflowId: gate.workflowId,
        workflowRunId: step.workflowRunId,
      },
    ];
  });

  return { autoRespondable, skipped: gates.length - autoRespondable.length };
};
