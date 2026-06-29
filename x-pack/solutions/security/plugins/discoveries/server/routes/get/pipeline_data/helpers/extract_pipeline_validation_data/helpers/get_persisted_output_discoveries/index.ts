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
 * `persisted_discoveries` is the set queried back by `validateAttackDiscoveries`,
 * which re-fetches the pre-existing duplicates ALONGSIDE the newly-created
 * discoveries. We subtract the persist step's `duplicates_dropped_count` so the
 * returned length reflects only the discoveries this execution newly stored
 * (mirrors `getValidationStepDiscoveries`); otherwise the validation badge would
 * count pre-existing discoveries from earlier runs.
 *
 * @returns The net-new persisted discoveries (possibly empty after dedup), or
 * `null` if the persist step is absent or its output lacks a
 * `persisted_discoveries` array.
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
    | { duplicates_dropped_count?: unknown; persisted_discoveries?: unknown }
    | undefined
    | null;

  if (!Array.isArray(persistOutput?.persisted_discoveries)) {
    return null;
  }

  const persistedDiscoveries = persistOutput.persisted_discoveries as AttackDiscoveryApiAlert[];

  const duplicatesDroppedCount =
    typeof persistOutput?.duplicates_dropped_count === 'number'
      ? persistOutput.duplicates_dropped_count
      : 0;

  const newCount = Math.max(0, persistedDiscoveries.length - duplicatesDroppedCount);

  return persistedDiscoveries.slice(0, newCount);
};
