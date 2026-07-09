/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { extractAlertRetrievalResult } from '@kbn/discoveries/impl/attack_discovery/generation/extract_alert_retrieval_result';
import { extractCustomWorkflowResult } from '@kbn/discoveries/impl/attack_discovery/generation/extract_custom_workflow_result';
import { isEsqlShape } from '@kbn/discoveries/impl/attack_discovery/generation/normalize_last_step_output';
import type { ParsedApiConfig } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import { DefaultAlertRetrievalStepTypeId } from '../../../../../../common/step_types/default_alert_retrieval_step';

export type ExtractionStrategy =
  | 'custom_workflow'
  | 'default_custom_query'
  | 'default_esql'
  | 'provided';

export interface PipelineAlertData {
  alerts: string[];
  alerts_context_count: number | null;
  extraction_strategy: ExtractionStrategy;
}

export interface ExtractPipelineAlertDataParams {
  apiConfig: ParsedApiConfig;
  execution: WorkflowExecutionDto;
  workflowId: string;
  workflowRunId: string;
}

/**
 * Returns the last non-trigger step execution that has output,
 * or `undefined` if none exists.
 */
const findLastStepWithOutput = (
  stepExecutions: WorkflowExecutionDto['stepExecutions']
): WorkflowExecutionDto['stepExecutions'][number] | undefined =>
  stepExecutions
    .slice()
    .reverse()
    .find((step) => step.stepId !== 'trigger' && step.output != null);

/**
 * Determines the extraction strategy for a workflow execution based
 * on the step types, inputs, and output shapes present.
 *
 * - **default_esql**: The execution contains a default alert retrieval step
 *   whose input included an `esql_query`
 * - **default_custom_query**: The execution contains a default alert retrieval
 *   step that did NOT receive an `esql_query` (i.e. Custom query mode)
 * - **custom_workflow**: A non-default workflow (any step type other than
 *   `attack-discovery.defaultAlertRetrieval`)
 */
const determineExtractionStrategy = (execution: WorkflowExecutionDto): ExtractionStrategy => {
  const defaultStep = execution.stepExecutions.find(
    (step) => step.stepType === DefaultAlertRetrievalStepTypeId
  );

  if (defaultStep != null) {
    const input = defaultStep.input as Record<string, unknown> | null | undefined;
    const hasEsqlQuery = input?.esql_query != null && input.esql_query !== '';

    return hasEsqlQuery ? 'default_esql' : 'default_custom_query';
  }

  return 'custom_workflow';
};

/**
 * Extracts alert data from an alert retrieval workflow execution,
 * determining the extraction strategy and returning properly typed results.
 *
 * - For **default_esql** and **default_custom_query** strategies,
 *   `alerts_context_count` is a number representing the count of alerts.
 * - For **custom_workflow** strategy, `alerts_context_count` is a number
 *   when the output has ES|QL shape, or `null` when it cannot be determined.
 *
 * Throws if the execution failed, was cancelled, or timed out (delegated
 * to the underlying extraction helpers).
 */
export const extractPipelineAlertData = ({
  apiConfig,
  execution,
  workflowId,
  workflowRunId,
}: ExtractPipelineAlertDataParams): PipelineAlertData => {
  const strategy = determineExtractionStrategy(execution);

  if (strategy === 'default_esql' || strategy === 'default_custom_query') {
    const result = extractAlertRetrievalResult({ apiConfig, execution });

    return {
      alerts: result.alerts,
      alerts_context_count: result.alertsContextCount,
      extraction_strategy: strategy,
    };
  }

  const result = extractCustomWorkflowResult({ execution, workflowId, workflowRunId });
  const lastStep = findLastStepWithOutput(execution.stepExecutions);
  const hasEsqlOutput = lastStep != null && isEsqlShape(lastStep.output);

  // When the workflow returned zero alerts we always know the count is 0, regardless of
  // whether the output has ES|QL shape.  For non-empty non-ES|QL results the count remains
  // unknown (null) because the workflow may have retrieved more alerts than it forwarded.
  const alertsContextCount =
    result.alerts.length === 0 ? 0 : hasEsqlOutput ? result.alertsContextCount : null;

  return {
    alerts: result.alerts,
    alerts_context_count: alertsContextCount,
    extraction_strategy: 'custom_workflow',
  };
};
