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

export interface PerWorkflowAlertRetrieval {
  alertsContextCount: number | null;
  extractionStrategy?: string;
  workflowId: string;
  workflowName?: string;
  workflowRunId: string;
}

export interface SourceMetadata {
  action_execution_uuid?: string;
  rule_id?: string;
  rule_name?: string;
}

export interface BuildDiagnosticReportParams {
  aggregatedExecution: AggregatedWorkflowExecution;
  alertsContextCount?: number | null;
  averageSuccessfulDurationMs?: number;
  configuredMaxAlerts?: number;
  connectorActionTypeId?: string;
  connectorModel?: string;
  connectorName?: string;
  dateRangeEnd?: string;
  dateRangeStart?: string;
  diagnosticsContext?: DiagnosticsContext;
  discoveriesCount?: number | null;
  duplicatesDroppedCount?: number;
  environmentContext?: EnvironmentContext;
  executionUuid?: string;
  failureClassification?: FailureClassification;
  failureReason?: string;
  generatedCount?: number;
  generationStatus?: string;
  hallucinationsFilteredCount?: number;
  perWorkflowAlertRetrieval?: PerWorkflowAlertRetrieval[];
  persistedCount?: number;
  sourceMetadata?: SourceMetadata | null;
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
  averageSuccessfulDurationMs,
  configuredMaxAlerts,
  connectorActionTypeId,
  connectorModel,
  connectorName,
  dateRangeEnd,
  dateRangeStart,
  discoveriesCount,
  executionUuid,
  failureClassification,
  generationStatus,
  overallStatus,
}: {
  alertsContextCount?: number | null;
  averageSuccessfulDurationMs?: number;
  configuredMaxAlerts?: number;
  connectorActionTypeId?: string;
  connectorModel?: string;
  connectorName?: string;
  dateRangeEnd?: string;
  dateRangeStart?: string;
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
  if (connectorActionTypeId != null)
    rows.push(`| Connector Type | ${escapeCell(connectorActionTypeId)} |`);
  if (connectorModel != null) rows.push(`| Connector Model | ${escapeCell(connectorModel)} |`);
  if (averageSuccessfulDurationMs != null)
    rows.push(`| Average Successful Duration | ${formatDuration(averageSuccessfulDurationMs)} |`);
  if (dateRangeStart != null || dateRangeEnd != null) {
    rows.push(`| Date Range | ${escapeCell(dateRangeStart)} to ${escapeCell(dateRangeEnd)} |`);
  }
  if (configuredMaxAlerts != null)
    rows.push(`| Configured Max Alerts | ${escapeCell(configuredMaxAlerts)} |`);
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
    '| Phase | Workflow ID | Workflow Name | Status | Duration | Error Category |',
    '|-------|------------|--------------|--------|----------|----------------|',
  ];

  const rows = phases.map((phase) => {
    const errorCategory =
      phase.error?.message != null ? classifyErrorCategory(phase.error.message) : '-';
    return `| ${escapeCell(phase.pipelinePhase)} | ${escapeCell(phase.workflowId)} | ${escapeCell(
      phase.workflowName
    )} | ${escapeCell(phase.worstStatus)} | ${formatDuration(
      phase.durationMs
    )} | ${errorCategory} |`;
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
    const workflowBase = step.workflowName ?? step.workflowId ?? '-';
    const workflowLabel =
      step.workflowDescription != null
        ? `${workflowBase} — ${step.workflowDescription}`
        : workflowBase;
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

/** Builds the Quality Metrics section. */
const buildQualityMetricsSection = ({
  duplicatesDroppedCount,
  generatedCount,
  hallucinationsFilteredCount,
  persistedCount,
}: {
  duplicatesDroppedCount?: number;
  generatedCount?: number;
  hallucinationsFilteredCount?: number;
  persistedCount?: number;
}): string => {
  const hasAnyMetric =
    generatedCount != null ||
    hallucinationsFilteredCount != null ||
    duplicatesDroppedCount != null ||
    persistedCount != null;

  if (!hasAnyMetric) return '';

  const rows: string[] = [];
  if (generatedCount != null)
    rows.push(`| Discoveries Generated | ${escapeCell(generatedCount)} |`);
  if (hallucinationsFilteredCount != null)
    rows.push(`| Hallucinations Filtered | ${escapeCell(hallucinationsFilteredCount)} |`);
  if (duplicatesDroppedCount != null)
    rows.push(`| Duplicates Dropped | ${escapeCell(duplicatesDroppedCount)} |`);
  if (persistedCount != null)
    rows.push(`| Discoveries Persisted | ${escapeCell(persistedCount)} |`);

  return ['## Quality Metrics', '', '| Metric | Value |', '|--------|-------|', ...rows, ''].join(
    '\n'
  );
};

/** Builds the Per-Workflow Alert Retrieval section. */
const buildPerWorkflowAlertRetrievalSection = (
  perWorkflowAlertRetrieval: PerWorkflowAlertRetrieval[] | undefined
): string => {
  if (perWorkflowAlertRetrieval == null || perWorkflowAlertRetrieval.length === 0) return '';

  const header = [
    '## Per-Workflow Alert Retrieval',
    '',
    '| Workflow Name | Alerts | Strategy | Workflow ID |',
    '|--------------|--------|----------|-------------|',
  ];

  const rows = perWorkflowAlertRetrieval.map((entry) => {
    const name = escapeCell(entry.workflowName ?? entry.workflowId);
    const alerts = escapeCell(entry.alertsContextCount);
    const strategy = escapeCell(entry.extractionStrategy);
    const workflowId = escapeCell(entry.workflowId);
    return `| ${name} | ${alerts} | ${strategy} | ${workflowId} |`;
  });

  const numericCounts = perWorkflowAlertRetrieval
    .map((e) => e.alertsContextCount)
    .filter((c): c is number => c != null);
  const combinedAlerts =
    numericCounts.length > 0 ? escapeCell(numericCounts.reduce((a, b) => a + b, 0)) : '-';
  const combinedRow = `| Combined | ${combinedAlerts} | - | - |`;

  return [...header, ...rows, combinedRow, ''].join('\n');
};

/** Infers the trigger type from sourceMetadata. */
const inferTriggerType = (sourceMetadata: SourceMetadata | null): string => {
  if (sourceMetadata == null) return 'Manual';
  if (sourceMetadata.rule_id != null) return 'Scheduled';
  if (sourceMetadata.action_execution_uuid != null) return 'Workflow Step';
  return 'Manual';
};

/** Builds the Execution Trigger section. */
const buildExecutionTriggerSection = (
  sourceMetadata: SourceMetadata | null | undefined
): string => {
  if (sourceMetadata === undefined) return '';

  const triggerType = inferTriggerType(sourceMetadata);
  const rows: string[] = [`| Trigger | ${escapeCell(triggerType)} |`];

  if (sourceMetadata != null) {
    if (sourceMetadata.rule_name != null)
      rows.push(`| Schedule Name | ${escapeCell(sourceMetadata.rule_name)} |`);
    if (sourceMetadata.rule_id != null)
      rows.push(`| Schedule ID | ${escapeCell(sourceMetadata.rule_id)} |`);
    if (sourceMetadata.action_execution_uuid != null)
      rows.push(`| Action Execution UUID | ${escapeCell(sourceMetadata.action_execution_uuid)} |`);
  }

  return ['## Execution Trigger', '', '| Field | Value |', '|-------|-------|', ...rows, ''].join(
    '\n'
  );
};

/** Builds a Map from workflowId to workflowName using the steps array. */
const buildWorkflowNameMap = (steps: StepExecutionWithLink[]): Map<string, string> =>
  steps.reduce<Map<string, string>>((acc, step) => {
    if (step.workflowId != null && step.workflowName != null) {
      return new Map(acc).set(step.workflowId, step.workflowName);
    }
    return acc;
  }, new Map());

/** Builds the Configured Workflows section. */
const buildConfiguredWorkflowsSection = (
  workflowExecutions: WorkflowExecutionsTracking | null | undefined,
  workflowNameMap: Map<string, string>
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
    '| Role | Workflow ID | Workflow Name | Workflow Run ID |',
    '|------|------------|--------------|----------------|',
  ];

  const rows: string[] = [];

  if (alertRetrieval != null) {
    for (const ref of alertRetrieval) {
      const name = ref.workflowId != null ? workflowNameMap.get(ref.workflowId) : undefined;
      rows.push(
        `| Alert Retrieval | ${escapeCell(ref.workflowId)} | ${escapeCell(name)} | ${escapeCell(
          ref.workflowRunId
        )} |`
      );
    }
  }

  if (generation != null) {
    const name =
      generation.workflowId != null ? workflowNameMap.get(generation.workflowId) : undefined;
    rows.push(
      `| Generation | ${escapeCell(generation.workflowId)} | ${escapeCell(name)} | ${escapeCell(
        generation.workflowRunId
      )} |`
    );
  }

  if (validation != null) {
    const name =
      validation.workflowId != null ? workflowNameMap.get(validation.workflowId) : undefined;
    rows.push(
      `| Validation | ${escapeCell(validation.workflowId)} | ${escapeCell(name)} | ${escapeCell(
        validation.workflowRunId
      )} |`
    );
  }

  return [...header, ...rows, ''].join('\n');
};

/** Builds the Configuration section from diagnosticsContext.config. */
const buildConfigurationSection = (diagnosticsContext: DiagnosticsContext | undefined): string => {
  if (diagnosticsContext == null) return '';

  const { alertRetrievalMode, alertRetrievalWorkflowCount, connectorType, hasCustomValidation } =
    diagnosticsContext.config;

  const rows = [
    `| Alert Retrieval Mode | ${escapeCell(alertRetrievalMode)} |`,
    `| Alert Retrieval Workflow Count | ${escapeCell(alertRetrievalWorkflowCount)} |`,
    `| Connector Type | ${escapeCell(connectorType)} |`,
    `| Custom Validation | ${escapeCell(String(hasCustomValidation))} |`,
  ];

  return ['## Configuration', '', '| Field | Value |', '|-------|-------|', ...rows, ''].join('\n');
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
 * 4. Execution Trigger (when sourceMetadata is defined)
 * 5. Pre-Execution Checks (when diagnosticsContext is available)
 * 6. Configuration (when diagnosticsContext is available)
 * 7. Quality Metrics (when at least one metric is present)
 * 8. Pipeline Timeline
 * 9. Step Execution Details
 * 10. Error Details
 * 11. Per-Workflow Alert Retrieval (when data is present)
 * 12. Configured Workflows
 * 13. Environment
 */
export const buildDiagnosticReport = ({
  aggregatedExecution,
  alertsContextCount,
  averageSuccessfulDurationMs,
  configuredMaxAlerts,
  connectorActionTypeId,
  connectorModel,
  connectorName,
  dateRangeEnd,
  dateRangeStart,
  diagnosticsContext,
  discoveriesCount,
  duplicatesDroppedCount,
  environmentContext,
  executionUuid,
  failureClassification,
  failureReason,
  generatedCount,
  generationStatus,
  hallucinationsFilteredCount,
  perWorkflowAlertRetrieval,
  persistedCount,
  sourceMetadata,
}: BuildDiagnosticReportParams): string => {
  const { status, steps, workflowExecutions } = aggregatedExecution;
  const phases = groupStepsByPhase(steps);
  const workflowNameMap = buildWorkflowNameMap(steps);

  const sections: string[] = [
    '# Attack Discovery Diagnostic Report',
    '',
    buildFailureReasonSection(failureReason, failureClassification),
    buildExecutionSummarySection({
      alertsContextCount,
      averageSuccessfulDurationMs,
      configuredMaxAlerts,
      connectorActionTypeId,
      connectorModel,
      connectorName,
      dateRangeEnd,
      dateRangeStart,
      discoveriesCount,
      executionUuid,
      failureClassification,
      generationStatus,
      overallStatus: status,
    }),
    buildExecutionTriggerSection(sourceMetadata),
    buildPreExecutionChecksSection(diagnosticsContext),
    buildConfigurationSection(diagnosticsContext),
    buildQualityMetricsSection({
      duplicatesDroppedCount,
      generatedCount,
      hallucinationsFilteredCount,
      persistedCount,
    }),
    buildPipelineTimelineSection(phases),
    buildStepExecutionDetailsSection(steps),
    buildErrorDetailsSection(phases),
    buildPerWorkflowAlertRetrievalSection(perWorkflowAlertRetrieval),
    buildConfiguredWorkflowsSection(workflowExecutions, workflowNameMap),
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
