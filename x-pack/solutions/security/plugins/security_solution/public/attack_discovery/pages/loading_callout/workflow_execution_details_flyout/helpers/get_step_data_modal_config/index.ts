/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineDataResponse } from '../../../../hooks/use_pipeline_data';
import type { ExtractionStrategy, StepDataType } from '../../../step_data_modal';
import type { WorkflowRetrievalSummary } from '../../../step_data_modal/workflow_alerts_summary_line';
import type { WorkflowInspectMetadata } from '../../../types';

export interface StepDataModalConfig {
  dataCount: number | null;
  dataType: StepDataType;
  extractionStrategy?: ExtractionStrategy;
  items: unknown[];
  stepName: string;
  workflowId?: string;
  workflowName?: string;
  workflowRunId?: string;
  /** Per-workflow summaries for the combined alerts modal header */
  workflowSummaries?: WorkflowRetrievalSummary[];
}

const getRetrievalByIndexConfig = (
  step: string,
  pipelineData: PipelineDataResponse,
  metadata?: WorkflowInspectMetadata
): StepDataModalConfig | null => {
  const indexFallback = parseInt(step.split(':')[1], 10);

  const workflow =
    findAlertRetrievalByWorkflowRunId(pipelineData, metadata?.workflowRunId) ??
    pipelineData.alert_retrieval?.[indexFallback] ??
    null;

  if (workflow == null) {
    return null;
  }

  return {
    dataCount: workflow.alerts_context_count,
    dataType: 'alerts',
    extractionStrategy: workflow.extraction_strategy,
    items: workflow.alerts,
    stepName: 'Alert retrieval',
  };
};

const getCombinedAlertsData = (pipelineData: PipelineDataResponse) => ({
  count: pipelineData.combined_alerts?.alerts_context_count ?? null,
  items: pipelineData.combined_alerts?.alerts ?? [],
});

/** Maps a pipeline step name to StepDataModal configuration */
export const getStepDataModalConfig = (
  step: string,
  pipelineData: PipelineDataResponse,
  metadata?: WorkflowInspectMetadata
): StepDataModalConfig | null => {
  if (step.startsWith('retrieval:')) {
    return getRetrievalByIndexConfig(step, pipelineData, metadata);
  }

  switch (step) {
    case 'generation':
      return {
        dataCount: pipelineData.generation?.attack_discoveries.length ?? 0,
        dataType: 'discoveries',
        items: pipelineData.generation?.attack_discoveries ?? [],
        stepName: 'Generation',
      };
    case 'promotion':
    case 'validation': {
      const validatedItems =
        pipelineData.validated_discoveries ?? pipelineData.generation?.attack_discoveries ?? [];

      return {
        dataCount: validatedItems.length,
        dataType: 'validated_discoveries',
        items: validatedItems,
        stepName: 'Validation',
      };
    }
    case 'combined_retrieval': {
      const combined = getCombinedAlertsData(pipelineData);
      return {
        dataCount: combined.count,
        dataType: 'alerts',
        items: combined.items,
        stepName: 'Combined alert retrieval',
        workflowSummaries:
          pipelineData.alert_retrieval?.map((entry) => ({
            alertsCount: entry.alerts_context_count,
            workflowRunId: entry.workflow_run_id,
          })) ?? [],
      };
    }
    case 'retrieval': {
      const combined = getCombinedAlertsData(pipelineData);
      const commonStrategy = getCommonExtractionStrategy(pipelineData.alert_retrieval);

      return {
        dataCount: combined.count,
        dataType: 'alerts',
        ...(commonStrategy != null ? { extractionStrategy: commonStrategy } : {}),
        items: combined.items,
        stepName: 'Alert Retrieval',
      };
    }
    default:
      return null;
  }
};

const getCommonExtractionStrategy = (
  alertRetrieval: PipelineDataResponse['alert_retrieval']
): ExtractionStrategy | undefined => {
  if (alertRetrieval == null || alertRetrieval.length === 0) {
    return undefined;
  }

  const firstStrategy = alertRetrieval[0].extraction_strategy;

  return alertRetrieval.every((entry) => entry.extraction_strategy === firstStrategy)
    ? firstStrategy
    : undefined;
};

const findAlertRetrievalByWorkflowRunId = (
  pipelineData: PipelineDataResponse,
  workflowRunId?: string
) => {
  if (workflowRunId == null || pipelineData.alert_retrieval == null) {
    return undefined;
  }

  return pipelineData.alert_retrieval.find((entry) => entry.workflow_run_id === workflowRunId);
};
