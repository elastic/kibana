/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export const invalidWorkflowMessage = (errors: string[] = []): string =>
  errors.length > 0
    ? `The automation workflow is not valid: ${errors.join(', ')}.`
    : 'The automation workflow is not valid.';

export const assertValidWorkflowYaml = async ({
  management,
  yaml,
  spaceId,
  request,
}: {
  management: WorkflowsServerPluginSetup['management'];
  yaml: string;
  spaceId: string;
  request: KibanaRequest;
}): Promise<void> => {
  const { valid, diagnostics } = await management.validateWorkflow(yaml, spaceId, request);
  if (valid) return;
  throw badRequest(
    invalidWorkflowMessage(diagnostics.filter((d) => d.severity === 'error').map((d) => d.message))
  );
};
