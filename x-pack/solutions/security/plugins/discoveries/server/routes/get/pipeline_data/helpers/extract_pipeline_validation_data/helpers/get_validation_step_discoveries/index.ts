/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { DefaultValidationStepTypeId } from '../../../../../../../../common/step_types/default_validation_step';
import { PersistDiscoveriesStepTypeId } from '../../../../../../../../common/step_types/persist_discoveries_step';

/**
 * Fallback for executions where the persist step did not write a
 * `persisted_discoveries` array (e.g., old executions). Reads
 * `validated_discoveries` from the default validation step and subtracts
 * any `duplicates_dropped_count` recorded in the persist step output so
 * the returned length reflects the number of truly new discoveries.
 *
 * NOTE: This is a count-accurate, best-effort fallback. Duplicates are
 * dropped by hard de-duplication in the persist step (bulk `create` version
 * conflicts keyed by discovery hash), so the dropped discoveries are NOT
 * guaranteed to be the trailing elements of `validated_discoveries`, and the
 * persist step only records the dropped *count* (not which ids were dropped)
 * on this path. The exact non-duplicate subset is therefore unrecoverable
 * here — only the count is. Current executions never hit this fallback: they
 * return the actually-persisted, deduplicated set via `persisted_discoveries`
 * (see `getPersistedOutputDiscoveries`) or the scheduled input path.
 *
 * @returns The validated discoveries sliced to the non-duplicate count, or
 * `null` if the validation step is absent or its output lacks a valid
 * `validated_discoveries` array.
 */
export const getValidationStepDiscoveries = ({
  execution,
}: {
  execution: WorkflowExecutionDto | null;
}): AttackDiscoveryApiAlert[] | null => {
  if (execution == null) {
    return null;
  }

  const validationStep = execution.stepExecutions.find(
    (step) => step.stepType === DefaultValidationStepTypeId
  );

  if (validationStep == null) {
    return null;
  }

  if (validationStep.output == null) {
    return null;
  }

  const validationOutput = validationStep.output as { validated_discoveries?: unknown };

  if (!Array.isArray(validationOutput.validated_discoveries)) {
    return null;
  }

  const validatedDiscoveries = validationOutput.validated_discoveries as AttackDiscoveryApiAlert[];

  const persistStep = execution.stepExecutions.find(
    (step) => step.stepType === PersistDiscoveriesStepTypeId
  );

  const persistOutput = persistStep?.output as { duplicates_dropped_count?: unknown } | undefined;

  const duplicatesDroppedCount =
    typeof persistOutput?.duplicates_dropped_count === 'number'
      ? persistOutput.duplicates_dropped_count
      : 0;

  const newCount = Math.max(0, validatedDiscoveries.length - duplicatesDroppedCount);

  return validatedDiscoveries.slice(0, newCount);
};
