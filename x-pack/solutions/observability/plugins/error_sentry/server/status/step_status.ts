/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { CollectLogPatternsStepTypeId } from '../../common/step_types/collect_log_patterns';
import { IntrospectLogsStepTypeId } from '../../common/step_types/introspect_logs';
import type { ComponentStatus } from '../../common/constants';

export const getStepStatuses = (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): ComponentStatus[] => {
  const collectRegistered = workflowsExtensions.hasStepDefinition(CollectLogPatternsStepTypeId);
  const introspectRegistered = workflowsExtensions.hasStepDefinition(IntrospectLogsStepTypeId);

  return [
    {
      id: 'step',
      label: 'collectLogPatterns step',
      state: collectRegistered ? 'ok' : 'missing',
      detail: collectRegistered
        ? undefined
        : 'The custom step type is not registered. Ensure the errorSentry plugin is loaded.',
      repairable: false,
    },
    {
      id: 'step_introspect',
      label: 'introspectLogs step',
      state: introspectRegistered ? 'ok' : 'missing',
      detail: introspectRegistered
        ? undefined
        : 'The custom step type is not registered. Ensure the errorSentry plugin is loaded.',
      repairable: false,
    },
  ];
};
