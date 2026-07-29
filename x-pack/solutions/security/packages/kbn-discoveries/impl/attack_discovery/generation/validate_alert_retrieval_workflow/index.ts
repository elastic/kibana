/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';

/**
 * Validated workflow type with required definition.
 */
export type ValidatedWorkflow = WorkflowDetailDto & {
  definition: NonNullable<WorkflowDetailDto['definition']>;
};

/**
 * Validates that the workflow exists and is executable.
 * Throws an AttackDiscoveryError if the workflow is invalid.
 * Returns the validated workflow with guaranteed non-null definition.
 */
export const validateAlertRetrievalWorkflow = (
  workflow: WorkflowDetailDto | null,
  workflowId: string
): ValidatedWorkflow => {
  if (!workflow) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_deleted',
      message: `Alert retrieval workflow (id: ${workflowId}) not found. It may have been deleted. Reconfigure the alert retrieval workflow in Attack Discovery settings.`,
      workflowId,
    });
  }

  if (!workflow.enabled) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_disabled',
      message: `Alert retrieval workflow '${workflow.name}' (id: ${workflowId}) is not enabled. Enable it in the Workflows UI to resume generation.`,
      workflowId,
    });
  }

  if (!workflow.definition) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_invalid',
      message: `Alert retrieval workflow '${workflow.name}' (id: ${workflowId}) is missing a definition. Edit the workflow YAML to add a valid definition.`,
      workflowId,
    });
  }

  if (!workflow.valid) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_invalid',
      message: `Alert retrieval workflow '${workflow.name}' (id: ${workflowId}) is not valid. The workflow YAML contains errors. Edit the workflow to fix configuration issues.`,
      workflowId,
    });
  }

  return workflow as ValidatedWorkflow;
};
