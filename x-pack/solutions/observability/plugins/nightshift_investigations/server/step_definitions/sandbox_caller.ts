/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SandboxCaller } from '../sandbox_audit';

/**
 * What the sandbox audit events of a workflow step say issued them: the step and this run of its
 * workflow, and the fake request the step runs with, which names the user or service account the
 * workflow runs as. Every step that obtains a session passes this, since a session cannot be had
 * without it.
 */
export const getSandboxStepCaller = (context: {
  stepId: string;
  stepType: string;
  contextManager: {
    getContext: () => { execution?: { id?: string } };
    getFakeRequest?: () => KibanaRequest | undefined;
  };
}): SandboxCaller => ({
  type: 'workflow_step',
  stepType: context.stepType,
  stepId: context.stepId,
  workflowExecutionId: context.contextManager.getContext().execution?.id,
  request: context.contextManager.getFakeRequest?.(),
});
