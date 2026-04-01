/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';

import type { AggregatedWorkflowExecution } from '../../../../types';
import { classifyErrorCategory } from '../classify_error_category';
import type { FailureCategory } from '../classify_error_category';

/** The type of navigation the action link should trigger. */
export type FailureLinkType =
  | 'attack_discovery_settings'
  | 'connector_management'
  | 'external'
  | 'none'
  | 'workflow_editor';

/** A single contextual action to help the user resolve the failure. */
export interface FailureAction {
  /** Human-readable label for the action button/link. */
  label: string;
  /** Where the link navigates to. */
  linkType: FailureLinkType;
  /** Workflow ID for `workflow_editor` links. */
  workflowId?: string;
}

/** Structured result of classifying a workflow execution failure. */
export interface FailureClassification {
  /** Zero or more contextual actions to help the user resolve the failure. */
  actions: FailureAction[];
  /** Structured error category. */
  category: FailureCategory;
  /** Short human-readable summary of the failure. */
  summary: string;
}

/**
 * Extracts a workflowId from the aggregated execution's step data.
 *
 * For `workflow_disabled`, the disabled workflow appears as a failed placeholder
 * step (created by `buildAggregatedWorkflowExecution` when the workflow execution
 * fetch returns 404 because the synthetic workflowRunId never ran). Reading the
 * `workflowId` from the step is more reliable than parsing the reason string.
 */
const extractWorkflowIdFromExecution = (
  category: FailureCategory,
  aggregatedExecution: AggregatedWorkflowExecution
): string | undefined => {
  if (category !== 'workflow_disabled') {
    return undefined;
  }

  const failedAlertRetrievalStep = aggregatedExecution.steps.find(
    (step) => step.pipelinePhase === 'retrieve_alerts' && step.status === ExecutionStatus.FAILED
  );

  return failedAlertRetrievalStep?.workflowId;
};

/**
 * Extracts a workflowId from known failure reason patterns (fallback for when
 * structured execution data is unavailable):
 * - `Workflow 'wf-id' is disabled`
 * - `Alert retrieval workflow is not enabled: wf-id`
 * - `Generation workflow is not enabled: wf-id`
 * - `Validation workflow is not enabled: wf-id`
 */
const extractWorkflowIdFromReason = (reason: string): string | undefined => {
  const quotedMatch = /Workflow '([^']+)'/.exec(reason);
  if (quotedMatch != null) {
    return quotedMatch[1];
  }

  const colonMatch = /is not enabled: (.+)$/.exec(reason);
  if (colonMatch != null) {
    return colonMatch[1].trim().replace(/\)+$/, '');
  }

  return undefined;
};

const SUMMARIES: Record<FailureCategory, string> = {
  anonymization_error: 'An anonymization error occurred during generation.',
  cluster_health: 'An Elasticsearch cluster health issue prevented generation from completing.',
  concurrent_conflict: 'A concurrent conflict occurred. Retry generation.',
  connector_error: 'A connector error prevented generation from completing.',
  network_error: 'A network error occurred during generation.',
  permission_error: 'A permission error occurred. Check Kibana and Elasticsearch privileges.',
  rate_limit: 'A rate limit was reached. Wait a moment before retrying.',
  step_registration_error: 'A workflow step type is not registered. Check workflow configuration.',
  timeout: 'The workflow timed out before completing.',
  unknown: 'An unexpected error occurred during generation.',
  validation_error: 'A validation error occurred during generation.',
  workflow_deleted: 'A configured workflow was deleted or cannot be found.',
  workflow_disabled: 'A configured workflow is disabled. Enable it, then retry generation.',
  workflow_error: 'A workflow error occurred during generation.',
  workflow_invalid: 'A configured workflow has an invalid configuration. Edit the YAML to fix it.',
};

const buildActions = (
  category: FailureCategory,
  workflowId: string | undefined
): FailureAction[] => {
  switch (category) {
    case 'workflow_disabled':
      return [
        {
          label: 'Open workflow to enable',
          linkType: 'workflow_editor',
          ...(workflowId != null ? { workflowId } : {}),
        },
      ];

    case 'workflow_deleted':
      return [
        {
          label: 'Reconfigure in Attack Discovery settings',
          linkType: 'attack_discovery_settings',
        },
      ];

    case 'workflow_invalid':
      return [
        {
          label: 'Edit workflow YAML',
          linkType: 'workflow_editor',
          ...(workflowId != null ? { workflowId } : {}),
        },
      ];

    case 'connector_error':
      return [{ label: 'Manage connectors', linkType: 'connector_management' }];

    case 'timeout':
      return [
        {
          label: 'Edit workflow timeout',
          linkType: 'workflow_editor',
          ...(workflowId != null ? { workflowId } : {}),
        },
      ];

    default:
      return [];
  }
};

/**
 * Classifies a workflow execution failure into a structured result with
 * a category, a human-readable summary, and zero or more contextual actions.
 *
 * @param reason - The failure reason string from the execution event log.
 * @param aggregatedExecution - The aggregated workflow execution data.
 * @param serverErrorCategory - Optional server-provided error category. When present,
 *   it is used instead of regex-based classification via classifyErrorCategory.
 * @param serverWorkflowId - Optional server-provided workflow ID. When present,
 *   it is used instead of extracting the ID from execution data or the reason string.
 */
export const classifyFailure = (
  reason: string,
  aggregatedExecution: AggregatedWorkflowExecution,
  serverErrorCategory?: FailureCategory,
  serverWorkflowId?: string
): FailureClassification => {
  const category = serverErrorCategory ?? classifyErrorCategory(reason);
  const workflowId =
    serverWorkflowId ??
    extractWorkflowIdFromExecution(category, aggregatedExecution) ??
    extractWorkflowIdFromReason(reason);
  const actions = buildActions(category, workflowId);
  const summary = SUMMARIES[category];

  return { actions, category, summary };
};
