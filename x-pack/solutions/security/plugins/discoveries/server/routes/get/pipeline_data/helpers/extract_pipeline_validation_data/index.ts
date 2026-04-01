/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

const VALIDATION_STEP_TYPE = 'attack-discovery.defaultValidation';

/**
 * Extracts validated attack discoveries from a validation workflow execution.
 *
 * Finds the step with `stepType === 'attack-discovery.defaultValidation'` in the
 * execution's step list and reads its `validated_discoveries` output.
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
    (step) => step.stepType === VALIDATION_STEP_TYPE
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

  return output.validated_discoveries as AttackDiscoveryApiAlert[];
};
