/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';

import type { AggregatedWorkflowExecution, StepExecutionWithLink } from '../../../../types';
import { classifyErrorCategory } from '../../../failure_actions/helpers/classify_error_category';
import type { FailureClassification } from '../../../failure_actions/helpers/classify_failure';
import type { EnvironmentContext } from '../../../helpers/get_environment_context';
import { groupStepsByPhase, type PhaseGroup } from '../../../helpers/group_steps_by_phase';
import { sanitizeErrorMessage } from '../../../helpers/sanitize_error_message';
import type { DiagnosticsContext } from '../../../../../hooks/use_pipeline_data';

export interface BuildDiagnosticReportParams {
  aggregatedExecution: AggregatedWorkflowExecution;
  alertsContextCount?: number | null;
  connectorName?: string;
  diagnosticsContext?: DiagnosticsContext;
  discoveriesCount?: number | null;
  environmentContext?: EnvironmentContext;
  executionUuid?: string;
  failureClassification?: FailureClassification;
  failureReason?: string;
  generationStatus?: string;
}

/** Escapes Markdown table cell content to prevent formatting issues. */
const escapeCell = (value: string | number | undefined | null): string => {
  if (value == null) return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
};

/** Formats a duration in milliseconds for display. */
const formatDuration = (ms: number | undefined): string => {
  if (ms == null) return '-';
  return `${ms} ms`;
};

/** Builds the Environment section. */
const buildEnvironmentSection = (environmentContext: EnvironmentContext | undefined): string => {
  if (environmentContext == null) return '';

  const { kibanaVersion, spaceId } = environmentContext;
  if (kibanaVersion == null && spaceId == null) return '';

  const rows: string[] = [];
  if (kibanaVersion != null) rows.push(`| Kibana Version | ${escapeCell(kibanaVersion)} |`);
  if (spaceId != null) rows.push(`| Space ID | ${escapeCell(spaceId)} |`);

  return ['## Environment', '', '| Field | Value |', '|-------|-------|', ...rows, ''].join('\n');
};

/** Builds the Execution Summary section. */
const buildExecutionSummarySection = ({
  alertsContextCount,
  connectorName,
  discoveriesCount,
  executionUuid,
  failureClassification,
  generationStatus,
  overallStatus,
}: {
  alertsContextCount?: number | null;
  connectorName?: string;
  discoveriesCount?: number | null;
  executionUuid?: string;
  failureClassification?: FailureClassification;
  generationStatus?: string;
  overallStatus: string;
}): string => {
  const rows: string[] = [`| Overall Status | ${escapeCell(overallStatus)} |`];

  if (generationStatus != null)
    rows.push(`| Generation Status | ${escapeCell(generationStatus)} |`);
  if (failureClassification != null)
    rows.push(`| Error Category | ${escapeCell(failureClassification.category)} |`);
  if (executionUuid != null) rows.push(`| Execution UUID | ${escapeCell(executionUuid)} |`);
  if (connectorName != null) rows.push(`| Connector | ${escapeCell(connectorName)} |`);
  if (alertsContextCount !== undefined && alertsContextCount !== null) {
    rows.push(`| Alerts Context Count | ${escapeCell(alertsContextCount)} |`);
  }
  if (discoveriesCount !== undefined && discoveriesCount !== null) {
    rows.push(`| Discoveries Count | ${escapeCell(discoveriesCount)} |`);
  }

  return ['## Execution Summary', '', '| Field | Value |', '|-------|-------|', ...rows, ''].join(
    '\n'
  );
};

/** Builds the Failure Reason section. */
const buildFailureReasonSection = (
  failureReason: string | undefined,
  failureClassification: FailureClassification | undefined
): string => {
  if (failureReason == null && failureClassification == null) return '';

  const lines: string[] = ['## Failure Details', ''];
  if (failureClassification != null) {
    lines.push(`**Summary:** ${failureClassification.summary}`, '');
    lines.push(`**Category:** \`${failureClassification.category}\``, '');
  }
  if (failureReason != null) {
    lines.push(`**Reason:** ${failureReason}`, '');
  }

  return lines.join('\n');
};

/** Builds the Pipeline Timeline section. */
const buildPipelineTimelineSection = (phases: PhaseGroup[]): string => {
  if (phases.length === 0) return '';

  const header = [
    '## Pipeline Timeline',
    '',
    '| Phase | Workflow ID | Status | Duration | Error Category |',
    '|-------|------------|--------|----------|----------------|',
  ];

  const rows = phases.map((phase) => {
    const errorCategory =
      phase.error?.message != null ? classifyErrorCategory(phase.error.message) : '-';
    return `| ${escapeCell(phase.pipelinePhase)} | ${escapeCell(phase.workflowId)} | ${escapeCell(
      phase.worstStatus
    )} | ${formatDuration(phase.durationMs)} | ${errorCategory} |`;
  });

  return [...header, ...rows, ''].join('\n');
};

/** Builds the Step Execution Details section. */
const buildStepExecutionDetailsSection = (steps: StepExecutionWithLink[]): string => {
  if (steps.length === 0) return '';

  const header = [
    '## Step Execution Details',
    '',
    '| Step ID | Step Type | Status | Duration | Workflow | Error |',
    '|---------|----------|--------|----------|----------|-------|',
  ];

  const rows = steps.map((step) => {
    const workflowLabel = step.workflowName ?? step.workflowId ?? '-';
    const errorMsg = step.error?.message != null ? sanitizeErrorMessage(step.error.message) : '-';
    return `| ${escapeCell(step.stepId)} | ${escapeCell(step.stepType)} | ${escapeCell(
      step.status
    )} | ${formatDuration(step.executionTimeMs)} | ${escapeCell(workflowLabel)} | ${escapeCell(
      errorMsg
    )} |`;
  });

  return [...header, ...rows, ''].join('\n');
};

/** Builds the error sub-section for a single phase that has an error. */
const buildPhaseErrorLines = (phase: PhaseGroup): string[] => {
  const { error } = phase;
  if (error == null) return [];

  const phaseLabel = phase.pipelinePhase ?? phase.workflowId ?? phase.key;
  const lines: string[] = [`### Phase: ${phaseLabel}`, ''];
  lines.push(`**Type:** \`${error.type}\``, '');
  lines.push(`**Message:** ${sanitizeErrorMessage(error.message)}`, '');

  if (error.details != null && Object.keys(error.details).length > 0) {
    lines.push('**Details:**', '', '```json');
    lines.push(JSON.stringify(error.details, null, 2));
    lines.push('```', '');
  }

  return lines;
};

/** Builds the Error Details section (one sub-section per phase with errors). */
const buildErrorDetailsSection = (phases: PhaseGroup[]): string => {
  const phasesWithErrors = phases.filter((p) => p.error != null);
  if (phasesWithErrors.length === 0) return '';

  const phaseLines = phasesWithErrors.flatMap(buildPhaseErrorLines);

  return ['## Error Details', '', ...phaseLines].join('\n');
};

/** Builds the Configured Workflows section. */
const buildConfiguredWorkflowsSection = (
  workflowExecutions: WorkflowExecutionsTracking | null | undefined
): string => {
  if (workflowExecutions == null) return '';

  const { alertRetrieval, generation, validation } = workflowExecutions;
  const hasData =
    (alertRetrieval != null && alertRetrieval.length > 0) ||
    generation != null ||
    validation != null;

  if (!hasData) return '';

  const header = [
    '## Configured Workflows',
    '',
    '| Role | Workflow ID | Workflow Run ID |',
    '|------|------------|----------------|',
  ];

  const rows: string[] = [];

  if (alertRetrieval != null) {
    for (const ref of alertRetrieval) {
      rows.push(
        `| Alert Retrieval | ${escapeCell(ref.workflowId)} | ${escapeCell(ref.workflowRunId)} |`
      );
    }
  }

  if (generation != null) {
    rows.push(
      `| Generation | ${escapeCell(generation.workflowId)} | ${escapeCell(
        generation.workflowRunId
      )} |`
    );
  }

  if (validation != null) {
    rows.push(
      `| Validation | ${escapeCell(validation.workflowId)} | ${escapeCell(
        validation.workflowRunId
      )} |`
    );
  }

  return [...header, ...rows, ''].join('\n');
};

/** Builds the Pre-Execution Checks section from diagnosticsContext. */
const buildPreExecutionChecksSection = (
  diagnosticsContext: DiagnosticsContext | undefined
): string => {
  if (diagnosticsContext == null) return '';

  const { preExecutionChecks, workflowIntegrity } = diagnosticsContext;

  const header = [
    '## Pre-Execution Checks',
    '',
    '| Check | Status | Details |',
    '|-------|--------|---------|',
  ];

  const checkRows = preExecutionChecks.map(({ check, message, passed }) => {
    const sanitizedMessage = sanitizeErrorMessage(message);
    return `| ${escapeCell(check)} | ${passed ? '✅' : '❌'} | ${escapeCell(sanitizedMessage)} |`;
  });

  const { repaired, status, unrepairableErrors } = workflowIntegrity;
  const integrityPassed = status === 'all_intact' || status === 'repaired';
  let integrityDetails: string;
  if (status === 'all_intact') {
    integrityDetails = 'All required workflows intact';
  } else if (status === 'repaired') {
    integrityDetails = `Repaired: ${repaired.map((r) => r.key).join(', ')}`;
  } else {
    integrityDetails = `Repair failed: ${unrepairableErrors.map((e) => e.key).join(', ')}`;
  }

  const integrityRow = `| Workflow Integrity | ${integrityPassed ? '✅' : '❌'} | ${escapeCell(
    integrityDetails
  )} |`;

  return [...header, ...checkRows, integrityRow, ''].join('\n');
};

/**
 * Builds a privacy-preserving Markdown diagnostic report for Elastic Support escalation.
 * The report contains only execution metadata — no PII, alert content,
 * anonymization replacements, or LLM prompts.
 *
 * Section order:
 * 1. Title
 * 2. Failure Details
 * 3. Execution Summary
 * 4. Pre-Execution Checks (when diagnosticsContext is available)
 * 5. Pipeline Timeline
 * 6. Step Execution Details
 * 7. Error Details
 * 8. Configured Workflows
 * 9. Environment
 */
export const buildDiagnosticReport = ({
  aggregatedExecution,
  alertsContextCount,
  connectorName,
  diagnosticsContext,
  discoveriesCount,
  environmentContext,
  executionUuid,
  failureClassification,
  failureReason,
  generationStatus,
}: BuildDiagnosticReportParams): string => {
  const { status, steps, workflowExecutions } = aggregatedExecution;
  const phases = groupStepsByPhase(steps);

  const sections: string[] = [
    '# Attack Discovery Diagnostic Report',
    '',
    buildFailureReasonSection(failureReason, failureClassification),
    buildExecutionSummarySection({
      alertsContextCount,
      connectorName,
      discoveriesCount,
      executionUuid,
      failureClassification,
      generationStatus,
      overallStatus: status,
    }),
    buildPreExecutionChecksSection(diagnosticsContext),
    buildPipelineTimelineSection(phases),
    buildStepExecutionDetailsSection(steps),
    buildErrorDetailsSection(phases),
    buildConfiguredWorkflowsSection(workflowExecutions),
    buildEnvironmentSection(environmentContext),
    '---',
    '',
  ];

  // Filter empty sections and join, collapsing consecutive blank lines
  return sections
    .filter((s) => s !== '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
};
