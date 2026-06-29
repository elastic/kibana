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

  return [
    GenerateStepTypeId,
    ...(workflowConfig.alert_retrieval_mode !== 'custom_only'
      ? [DefaultAlertRetrievalStepTypeId]
      : []),
    ...(usesDefaultValidation ? [DefaultValidationStepTypeId, PersistDiscoveriesStepTypeId] : []),
  ].sort();
};
