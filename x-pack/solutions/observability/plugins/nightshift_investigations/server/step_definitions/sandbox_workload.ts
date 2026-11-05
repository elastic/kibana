/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SandboxWorkload } from '../sandbox_audit';

/**
 * What the sandbox audit events of a workflow step say issued them: the step and this run of its
 * workflow. Every step that obtains a session passes this, since a session cannot be had without it.
 */
export const getSandboxStepWorkload = (context: {
  stepId: string;
  stepType: string;
  contextManager: { getContext: () => { execution?: { id?: string } } };
}): SandboxWorkload => ({
  type: 'workflow_step',
  stepType: context.stepType,
  stepId: context.stepId,
  workflowExecutionId: context.contextManager.getContext().execution?.id,
});
