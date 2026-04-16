/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { DefaultValidationStepTypeId } from '../../../../../../common/step_types/default_validation_step';
import { PersistDiscoveriesStepTypeId } from '../../../../../../common/step_types/persist_discoveries_step';

/**
 * Extracts validated attack discoveries from a validation workflow execution,
 * accounting for any duplicates dropped by the persist step.
 *
 * Finds the step with `stepType === 'security.attack-discovery.defaultValidation'` in the
 * execution's step list and reads its `validated_discoveries` output. If a persist step
 * is also present with a `duplicates_dropped_count`, that count is subtracted so the
 * returned length reflects the number of truly new discoveries persisted.
 *
 * @returns The validated discoveries as `AttackDiscoveryApiAlert[]`, or `null` if
 * the execution is not available, the validation step is missing, or the output
 * does not contain a valid `validated_discoveries` array.
 */
export const extractPipelineValidationData = ({
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

  const output = validationStep.output as {
    validated_discoveries?: unknown;
  };

  if (!Array.isArray(output.validated_discoveries)) {
    return null;
  }

  const validatedDiscoveries = output.validated_discoveries as AttackDiscoveryApiAlert[];

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
