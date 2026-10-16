/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows';
import { validateWorkflowYaml } from '@kbn/workflows-management-plugin/common/lib/validate_workflow_yaml';

/**
 * Errors from validating rendered YAML against the generic `WorkflowSchema`, or undefined. Install
 * also checks connectors and trigger definitions, so passing here does not prove `valid: true`.
 */
export const workflowSchemaFailure = (yaml: string): string | undefined => {
  const result = validateWorkflowYaml(yaml, WorkflowSchema);
  if (result.valid) {
    return undefined;
  }
  const details = result.diagnostics
    .filter((diagnostic) => diagnostic.severity === 'error')
    .map((diagnostic) => {
      const path = diagnostic.path?.map(String).join('.');
      if (!path || diagnostic.message.includes(path)) {
        return diagnostic.message;
      }
      return `${diagnostic.message} (${path})`;
    })
    .join('; ');
  return details.length > 0 ? details : 'workflow is not valid';
};
