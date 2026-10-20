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
 * Reads the `persisted_discoveries` array from the persist step's output.
 * This is the preferred source for ad-hoc executions: it reflects the
 * post-transform, deduplicated state of what was actually written to the
 * index. Custom validation workflows may transform discoveries before
 * persisting, so this captures those changes.
 *
 * `validateAttackDiscoveries` de-duplicates on write (bulk `create`) and
 * returns ONLY the genuinely-new discoveries created this run, so
 * `persisted_discoveries` already contains exactly the net-new set — no
 * subtraction or slicing is needed here.
 *
 * @returns The net-new persisted discoveries (possibly empty when everything
 * was a duplicate), or `null` if the persist step is absent or its output lacks
 * a `persisted_discoveries` array.
 */
export const getPersistedOutputDiscoveries = ({
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

  const persistOutput = persistStep?.output as
    | { persisted_discoveries?: unknown }
    | undefined
    | null;

  if (!Array.isArray(persistOutput?.persisted_discoveries)) {
    return null;
  }

  return persistOutput.persisted_discoveries as AttackDiscoveryApiAlert[];
};
