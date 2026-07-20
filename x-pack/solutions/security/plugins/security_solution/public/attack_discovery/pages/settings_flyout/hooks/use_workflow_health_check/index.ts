/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useListWorkflows } from '../../workflow_configuration/hooks/use_list_workflows';
import type { WorkflowConfiguration } from '../../workflow_configuration/types';
import * as workflowI18n from '../../workflow_configuration/translations';
import type { ValidationItem } from '../../types';

interface UseWorkflowHealthCheckParams {
  isWorkflowsEnabled: boolean;
  workflowConfiguration: WorkflowConfiguration;
}

export const useWorkflowHealthCheck = ({
  isWorkflowsEnabled,
  workflowConfiguration,
}: UseWorkflowHealthCheckParams): readonly ValidationItem[] => {
  const { data: workflows, isLoading } = useListWorkflows();

  return useMemo(() => {
    if (!isWorkflowsEnabled || isLoading || !workflows) {
      return [];
    }

    const workflowMap = new Map(workflows.map((w) => [w.id, w]));

    const alertRetrievalItems = workflowConfiguration.alertRetrievalWorkflowIds.reduce<
      ValidationItem[]
    >((acc, id) => {
      const workflow = workflowMap.get(id);

      if (!workflow) {
        return [
          ...acc,
          {
            level: 'warning' as const,
            message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_NOT_FOUND(id),
          },
        ];
      } else if (!workflow.enabled) {
        return [
          ...acc,
          {
            level: 'warning' as const,
            message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_DISABLED(workflow.name),
          },
        ];
      }

      return acc;
    }, []);

    const { validationWorkflowId } = workflowConfiguration;
    const hasCustomValidationWorkflow = validationWorkflowId && validationWorkflowId !== 'default';
    const validationWorkflow = hasCustomValidationWorkflow
      ? workflowMap.get(validationWorkflowId)
      : undefined;

    const validationItems: ValidationItem[] = [
      ...(hasCustomValidationWorkflow && !validationWorkflow
        ? [{ level: 'warning' as const, message: workflowI18n.VALIDATION_WORKFLOW_NOT_FOUND }]
        : []),
      ...(validationWorkflow && !validationWorkflow.enabled
        ? [
            {
              level: 'warning' as const,
              message: workflowI18n.VALIDATION_WORKFLOW_DISABLED(validationWorkflow.name),
            },
          ]
        : []),
    ];

    return [...alertRetrievalItems, ...validationItems];
  }, [isWorkflowsEnabled, isLoading, workflows, workflowConfiguration]);
};
