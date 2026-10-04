/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows';
import { validateWorkflowYaml } from '@kbn/workflows-management-plugin/common/lib/validate_workflow_yaml';

/**
 * Managed install runs the platform validator and stores `valid: false` when it fails, without
 * throwing. A parse that returns success is not that flag: trigger, graph and template checks can
 * still mark the document invalid. Callers must treat a returned string as an install failure.
 */
export const renderedWorkflowInstallFailure = (yaml: string): string | undefined => {
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
