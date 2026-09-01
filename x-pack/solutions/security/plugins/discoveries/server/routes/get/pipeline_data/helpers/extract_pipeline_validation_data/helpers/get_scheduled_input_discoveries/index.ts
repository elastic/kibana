/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { PersistDiscoveriesStepTypeId } from '../../../../../../../../common/step_types/persist_discoveries_step';

/**
 * When a workflow runs in scheduled mode, the persist step skips ad-hoc
 * persistence and returns `{ persisted_discoveries: [] }` — the alerting
 * framework handles persistence separately. Reading the step's *input*
 * instead gives us the post-transform discoveries that were actually
 * submitted for persistence, which is the correct source of truth for the
 * inspect button in this case.
 *
 * @returns The `attack_discoveries` from the persist step's input when
 * `source === 'scheduled'`, or `null` if the execution is not a scheduled
 * run or the required data is unavailable.
 */
export const getScheduledInputDiscoveries = ({
  execution,
}: {
  execution: WorkflowExecutionDto | null;
}): AttackDiscoveryApiAlert[] | null => {
  if (execution == null) {
    return null;
  }

  const persistStep = execution.stepExecutions.find(
    (step) => step.stepType === PersistDiscoveriesStepTypeId
  );

  if (persistStep == null) {
    return null;
  }

  const persistInput = persistStep.input as
    | { attack_discoveries?: unknown; source?: unknown }
    | undefined;

  if (persistInput?.source !== 'scheduled') {
    return null;
  }

  if (!Array.isArray(persistInput?.attack_discoveries)) {
    return null;
  }

  return persistInput.attack_discoveries as AttackDiscoveryApiAlert[];
};
