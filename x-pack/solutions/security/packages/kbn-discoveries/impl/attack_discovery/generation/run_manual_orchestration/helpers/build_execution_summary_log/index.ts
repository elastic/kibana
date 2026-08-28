/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type StepStatus = 'failed' | 'not_started' | 'succeeded';

export interface StepExecution {
  workflowId: string;
  workflowRunId: string;
}

export interface StepSummary {
  durationMs: number;
  error?: string;
  executions: StepExecution[];
  status: StepStatus;
}

export interface BuildExecutionSummaryLogParams {
  alertsContextCount: number;
  basePath: string;
  generationStep: StepSummary;
  persistedCount: number;
  retrievalStep: StepSummary;
  totalDurationMs: number;
  validationStep: StepSummary;
}

const buildWorkflowLink = ({
  basePath,
  workflowId,
  workflowRunId,
}: {
  basePath: string;
  workflowId: string;
  workflowRunId: string;
}): string => `${basePath}/app/workflows/${workflowId}?tab=executions&executionId=${workflowRunId}`;

const formatExecutions = ({
  basePath,
  executions,
}: {
  basePath: string;
  executions: StepExecution[];
}): string =>
  executions
    .map(
      ({ workflowId, workflowRunId }) =>
        `[${workflowId}] ${buildWorkflowLink({ basePath, workflowId, workflowRunId })}`
    )
    .join(' | ');

const formatStep = ({
  basePath,
  step,
  stepName,
}: {
  basePath: string;
  step: StepSummary;
  stepName: string;
}): string => {
  if (step.status === 'not_started') {
    return `${stepName}: not started`;
  }

  const durationPart = `(${step.durationMs}ms)`;

  if (step.status === 'failed') {
    const errorPart = step.error != null ? ` error="${step.error}"` : '';
    return `${stepName}: failed ${durationPart}${errorPart}`;
  }

  const executionsPart = formatExecutions({ basePath, executions: step.executions });

  return `${stepName}: succeeded ${durationPart} ${executionsPart}`;
};

const getOverallOutcome = ({
  generationStep,
  retrievalStep,
  validationStep,
}: {
  generationStep: StepSummary;
  retrievalStep: StepSummary;
  validationStep: StepSummary;
}): 'failed' | 'succeeded' =>
  retrievalStep.status === 'failed' ||
  generationStep.status === 'failed' ||
  validationStep.status === 'failed'
    ? 'failed'
    : 'succeeded';

export const buildExecutionSummaryLog = ({
  alertsContextCount,
  basePath,
  generationStep,
  persistedCount,
  retrievalStep,
  totalDurationMs,
  validationStep,
}: BuildExecutionSummaryLogParams): string => {
  const overallOutcome = getOverallOutcome({ generationStep, retrievalStep, validationStep });

  const header = `Orchestration summary [${overallOutcome}] in ${totalDurationMs}ms | alerts: ${alertsContextCount}, discoveries: ${persistedCount}`;

  const steps = [
    formatStep({ basePath, step: retrievalStep, stepName: 'retrieval' }),
    formatStep({ basePath, step: generationStep, stepName: 'generation' }),
    formatStep({ basePath, step: validationStep, stepName: 'validation' }),
  ]
    .map((s) => `  ${s}`)
    .join('\n');

  return `${header}\n${steps}`;
};
