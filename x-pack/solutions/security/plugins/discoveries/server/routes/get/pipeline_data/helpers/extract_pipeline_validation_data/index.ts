/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { getScheduledInputDiscoveries } from './helpers/get_scheduled_input_discoveries';
import { getPersistedOutputDiscoveries } from './helpers/get_persisted_output_discoveries';
import { getValidationStepDiscoveries } from './helpers/get_validation_step_discoveries';

/**
 * Extracts validated attack discoveries from a validation workflow execution.
 *
 * Resolution order:
 * 1. **Scheduled mode** — when `source === 'scheduled'` the persist step
 *    intentionally skips ad-hoc persistence. The step's *input*
 *    `attack_discoveries` is the post-transform data that the alerting
 *    framework actually persisted, so we prefer it here.
 * 2. **Ad-hoc persisted** — the persist step's `persisted_discoveries`
 *    output reflects the post-transform, deduplicated final state.
 * 3. **Fallback** — `validated_discoveries` from the default validation
 *    step, adjusted for any `duplicates_dropped_count`. Used for old
 *    executions where the persist step did not write `persisted_discoveries`.
 */
export const extractPipelineValidationData = ({
  execution,
}: {
  execution: WorkflowExecutionDto | null;
}): AttackDiscoveryApiAlert[] | null => {
  if (execution == null) {
    return null;
  }

  // 1. Scheduled: alerting framework persisted; read persist step input instead.
  const scheduledDiscoveries = getScheduledInputDiscoveries({ execution });
  if (scheduledDiscoveries !== null) {
    return scheduledDiscoveries;
  }

  // 2. Ad-hoc: prefer actually-persisted (post-transform, deduplicated) output.
  const persistedDiscoveries = getPersistedOutputDiscoveries({ execution });
  if (persistedDiscoveries !== null) {
    return persistedDiscoveries;
  }

  // 3. Fallback for old executions without persisted_discoveries in output.
  return getValidationStepDiscoveries({ execution });
};
