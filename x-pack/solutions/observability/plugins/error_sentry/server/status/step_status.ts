/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { CollectLogPatternsStepTypeId } from '../../common/step_types/collect_log_patterns';
import type { ComponentStatus } from '../../common/constants';

export const getStepStatus = (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): ComponentStatus => {
  const registered = workflowsExtensions.hasStepDefinition(CollectLogPatternsStepTypeId);
  return {
    id: 'step',
    label: 'collectLogPatterns step',
    state: registered ? 'ok' : 'missing',
    detail: registered
      ? undefined
      : 'The custom step type is not registered. Ensure the errorSentry plugin is loaded.',
    repairable: false,
  };
};
