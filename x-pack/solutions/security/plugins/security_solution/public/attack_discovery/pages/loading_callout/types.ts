/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import type { ExecutionStatus, WorkflowStepExecutionDto } from '@kbn/workflows';

/** Extended step execution with workflow linking information. */
export interface StepExecutionWithLink
  extends Omit<WorkflowStepExecutionDto, 'workflowId' | 'workflowRunId'> {
  /**
   * The pipeline phase this step belongs to ('retrieve_alerts', 'generate_discoveries',
   * 'validate_discoveries'). Used by the pipeline monitor to group multiple alert retrieval
   * workflow steps under the single "Alert retrieval" parent step.
   */
  pipelinePhase?: string;
  /** Description of the workflow this step belongs to (from workflowDefinition) */
  workflowDescription?: string;
  /** The workflow ID this step belongs to (for manual orchestration workaround) */
  workflowId?: string;
  /** Name of the workflow this step belongs to (from workflowName or workflowDefinition) */
  workflowName?: string;
  /** The workflow execution ID this step belongs to */
  workflowRunId?: string;
}

/**
 * Metadata about a workflow, passed from inspect buttons to the step data modal
 * so the modal can render a description with a link to the workflow editor.
 */
export interface WorkflowInspectMetadata {
  workflowId?: string;
  workflowName?: string;
  workflowRunId?: string;
}

export interface AggregatedWorkflowExecution {
  /** Combined steps from all workflows, sorted by topological index */
  steps: StepExecutionWithLink[];
  /** Overall execution status */
  status: ExecutionStatus;
  /** Workflow execution tracking from the event log */
  workflowExecutions?: WorkflowExecutionsTracking | null;
}
