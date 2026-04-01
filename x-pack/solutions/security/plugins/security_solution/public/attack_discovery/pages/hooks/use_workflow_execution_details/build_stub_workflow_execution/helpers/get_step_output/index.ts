/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';

export const getStepOutput = ({
  alertsContextCount,
  discoveriesCount,
  stepId,
}: {
  alertsContextCount: number | null | undefined;
  discoveriesCount: number | null | undefined;
  stepId: string;
}): WorkflowStepExecutionDto['output'] | undefined => {
  if (stepId === 'retrieve_alerts' && alertsContextCount != null) {
    return { alerts_context_count: alertsContextCount };
  }

  if (stepId === 'generate_discoveries' && discoveriesCount != null) {
    return { discoveries_count: discoveriesCount };
  }

  if (stepId === 'validate_discoveries' && discoveriesCount != null) {
    return { discoveries_persisted: discoveriesCount };
  }

  return undefined;
};
