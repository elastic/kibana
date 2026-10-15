/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfig } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import {
  DefaultAlertRetrievalStepTypeId,
  DefaultValidationStepTypeId,
  GenerateStepTypeId,
  PersistDiscoveriesStepTypeId,
} from '../../../../../common/step_types';

export const getInferredPrebuiltStepTypes = ({
  defaultValidationWorkflowId,
  workflowConfig,
}: {
  defaultValidationWorkflowId: string;
  workflowConfig: WorkflowConfig;
}): string[] => {
  const usesDefaultValidation =
    workflowConfig.validation_workflow_id === '' ||
    workflowConfig.validation_workflow_id === defaultValidationWorkflowId;

  // The prebuilt `defaultAlertRetrieval` step runs only when the default
  // retrieval toggle is enabled (the always-on skill gate runs as a separate
  // `ai.agent` step in the generation phase, not as this prebuilt step).
  const usesDefaultAlertRetrieval = workflowConfig.default_retrieval_enabled;

  return [
    GenerateStepTypeId,
    ...(usesDefaultAlertRetrieval ? [DefaultAlertRetrievalStepTypeId] : []),
    ...(usesDefaultValidation ? [DefaultValidationStepTypeId, PersistDiscoveriesStepTypeId] : []),
  ].sort();
};
