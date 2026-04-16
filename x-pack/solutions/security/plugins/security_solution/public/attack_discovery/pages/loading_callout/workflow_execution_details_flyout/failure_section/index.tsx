/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';

import type { AggregatedWorkflowExecution } from '../../types';
import type { DiagnosticsContext } from '../../../hooks/use_pipeline_data';
import { DiagnosticReport } from '../diagnostic_report';
import { FailureActions } from '../failure_actions';
import type { FailureCategory } from '../failure_actions/helpers/classify_error_category';
import type { EnvironmentContext } from '../helpers/get_environment_context';
import { TroubleshootWithAi } from '../troubleshoot_with_ai';
import type {
  PerWorkflowAlertRetrieval,
  SourceMetadata,
} from '../diagnostic_report/helpers/build_diagnostic_report';

interface Props {
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
  errorCategory?: FailureCategory;
  executionUuid?: string;
  failedWorkflowId?: string;
  failureReason?: string;
  generatedCount?: number;
  generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  hallucinationsFilteredCount?: number;
  perWorkflowAlertRetrieval?: PerWorkflowAlertRetrieval[];
  persistedCount?: number;
  sourceMetadata?: SourceMetadata | null;
  workflowId?: string;
}

/**
 * Renders the failure-related actions and AI troubleshooting controls shown
 * when a generation attempt has failed, been canceled, or been dismissed, or
 * when any individual workflow step has a FAILED status.
 *
 * `FailureActions` (error classification + retry suggestions) is only rendered
 * when a `failureReason` is provided.
 */
const FailureSectionComponent: React.FC<Props> = ({
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
  errorCategory,
  executionUuid,
  failedWorkflowId,
  failureReason,
  generatedCount,
  generationStatus,
  hallucinationsFilteredCount,
  perWorkflowAlertRetrieval,
  persistedCount,
  sourceMetadata,
  workflowId,
}) => (
  <>
    {failureReason != null && (
      <>
        <EuiSpacer size="m" />

        <FailureActions
          aggregatedExecution={aggregatedExecution}
          errorCategory={errorCategory}
          failedWorkflowId={failedWorkflowId}
          reason={failureReason}
          workflowId={workflowId}
        />
      </>
    )}

    <EuiSpacer size="m" />

    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <TroubleshootWithAi
          aggregatedExecution={aggregatedExecution}
          alertsContextCount={alertsContextCount}
          averageSuccessfulDurationMs={averageSuccessfulDurationMs}
          configuredMaxAlerts={configuredMaxAlerts}
          connectorActionTypeId={connectorActionTypeId}
          connectorModel={connectorModel}
          connectorName={connectorName}
          dateRangeEnd={dateRangeEnd}
          dateRangeStart={dateRangeStart}
          diagnosticsContext={diagnosticsContext}
          discoveriesCount={discoveriesCount}
          duplicatesDroppedCount={duplicatesDroppedCount}
          environmentContext={environmentContext}
          errorCategory={errorCategory}
          executionUuid={executionUuid}
          failedWorkflowId={failedWorkflowId}
          failureReason={failureReason}
          generatedCount={generatedCount}
          generationStatus={generationStatus}
          hallucinationsFilteredCount={hallucinationsFilteredCount}
          perWorkflowAlertRetrieval={perWorkflowAlertRetrieval}
          persistedCount={persistedCount}
          sourceMetadata={sourceMetadata}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <DiagnosticReport
          aggregatedExecution={aggregatedExecution}
          alertsContextCount={alertsContextCount}
          averageSuccessfulDurationMs={averageSuccessfulDurationMs}
          configuredMaxAlerts={configuredMaxAlerts}
          connectorActionTypeId={connectorActionTypeId}
          connectorModel={connectorModel}
          connectorName={connectorName}
          dateRangeEnd={dateRangeEnd}
          dateRangeStart={dateRangeStart}
          diagnosticsContext={diagnosticsContext}
          discoveriesCount={discoveriesCount}
          duplicatesDroppedCount={duplicatesDroppedCount}
          environmentContext={environmentContext}
          executionUuid={executionUuid}
          failureReason={failureReason}
          generatedCount={generatedCount}
          generationStatus={generationStatus}
          hallucinationsFilteredCount={hallucinationsFilteredCount}
          persistedCount={persistedCount}
          sourceMetadata={sourceMetadata}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

FailureSectionComponent.displayName = 'FailureSection';

export const FailureSection = React.memo(FailureSectionComponent);
