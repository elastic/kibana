/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowApi } from '@kbn/workflows-ui';
import type {
  RunWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowListDto,
} from '@kbn/workflows';
import {
  parseYamlToJSONWithoutValidation,
  stringifyWorkflowDefinition,
} from '@kbn/workflows-yaml';
import { TINES_MIGRATION_WORKFLOW_TAG } from '../../../../common/siem_migrations/workflows/constants';
import { KibanaServices } from '../../../common/lib/kibana';

const getWorkflowApi = (): WorkflowApi => new WorkflowApi(KibanaServices.get().http);

/**
 * Ensures translated YAML is enabled and tagged for discovery on the
 * Translated workflows list before creating it in Workflows.
 */
export const prepareYamlForWorkflowsSave = (yaml: string): string => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success) {
    throw parsed.error;
  }

  const definition = { ...parsed.json };
  definition.enabled = true;

  const existingTags = Array.isArray(definition.tags)
    ? definition.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  definition.tags = existingTags.includes(TINES_MIGRATION_WORKFLOW_TAG)
    ? existingTags
    : [...existingTags, TINES_MIGRATION_WORKFLOW_TAG];

  return stringifyWorkflowDefinition(definition);
};

export const saveTranslatedWorkflow = async ({
  yaml,
}: {
  yaml: string;
}): Promise<WorkflowDetailDto> => {
  const preparedYaml = prepareYamlForWorkflowsSave(yaml);
  return getWorkflowApi().createWorkflow({ yaml: preparedYaml });
};

export const listTranslatedWorkflows = async (): Promise<WorkflowListDto> => {
  return getWorkflowApi().getWorkflows({
    tags: [TINES_MIGRATION_WORKFLOW_TAG],
    size: 100,
    page: 1,
    sortField: 'name',
    sortOrder: 'asc',
  });
};

export const runTranslatedWorkflow = async (
  workflowId: string
): Promise<RunWorkflowResponseDto> => {
  return getWorkflowApi().runWorkflow(workflowId, { inputs: {} });
};

export const saveAndRunTranslatedWorkflow = async ({
  yaml,
}: {
  yaml: string;
}): Promise<{ workflow: WorkflowDetailDto; execution: RunWorkflowResponseDto }> => {
  const workflow = await saveTranslatedWorkflow({ yaml });
  const execution = await runTranslatedWorkflow(workflow.id);
  return { workflow, execution };
};
