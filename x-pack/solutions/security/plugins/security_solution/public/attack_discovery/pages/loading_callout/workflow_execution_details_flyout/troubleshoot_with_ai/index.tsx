/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { THREAT_HUNTING_AGENT_ID } from '../../../../../../common/constants';

// Re-exported from @kbn/discoveries-plugin/common/constants
const DIAGNOSTIC_REPORT_ATTACHMENT_TYPE = 'diagnostic_report';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../../common/lib/telemetry';
import type { AggregatedWorkflowExecution } from '../../types';
import { buildDiagnosticReport } from '../diagnostic_report/helpers/build_diagnostic_report';
import type {
  PerWorkflowAlertRetrieval,
  SourceMetadata,
} from '../diagnostic_report/helpers/build_diagnostic_report';
import type { FailureCategory } from '../failure_actions/helpers/classify_error_category';
import { classifyFailure } from '../failure_actions/helpers/classify_failure';
import type { EnvironmentContext } from '../helpers/get_environment_context';
import type { DiagnosticsContext } from '../../../hooks/use_pipeline_data';
import * as i18n from './translations';

export interface TroubleshootWithAiProps {
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
}

const TROUBLESHOOTABLE_STATUSES = new Set(['failed', 'canceled', 'dismissed']);

const TroubleshootWithAiComponent: React.FC<TroubleshootWithAiProps> = ({
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
}) => {
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const { agentBuilder, telemetry } = useKibana().services;

  const isTroubleshootable =
    generationStatus != null && TROUBLESHOOTABLE_STATUSES.has(generationStatus);

  const isDisabled = !isAgentBuilderEnabled || !isTroubleshootable;

  const failureClassification = useMemo(
    () =>
      failureReason != null
        ? classifyFailure(failureReason, aggregatedExecution, errorCategory, failedWorkflowId)
        : undefined,
    [aggregatedExecution, errorCategory, failedWorkflowId, failureReason]
  );

  const diagnosticReportAttachment = useMemo(
    () => ({
      data: {
        content: buildDiagnosticReport({
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
        }),
      },
      type: DIAGNOSTIC_REPORT_ATTACHMENT_TYPE,
    }),
    [
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
    ]
  );

  const handleClick = useCallback(() => {
    if (agentBuilder?.openChat == null) {
      return;
    }

    telemetry.reportEvent(AttackDiscoveryEventTypes.TroubleshootWithAiClicked, {});

    agentBuilder.openChat({
      agentId: THREAT_HUNTING_AGENT_ID,
      attachments: [diagnosticReportAttachment],
      autoSendInitialMessage: false,
      initialMessage: i18n.INITIAL_MESSAGE,
      newConversation: true,
      sessionTag: 'security',
    });
  }, [agentBuilder, diagnosticReportAttachment, telemetry]);

  const button = (
    <EuiButtonEmpty
      data-test-subj="troubleshootWithAiButton"
      disabled={isDisabled}
      iconType="sparkles"
      onClick={handleClick}
      size="s"
    >
      {i18n.TROUBLESHOOT_WITH_AI}
    </EuiButtonEmpty>
  );

  if (!isAgentBuilderEnabled) {
    return (
      <span data-test-subj="troubleshootWithAiTooltip">
        <EuiToolTip content={i18n.AGENT_BUILDER_REQUIRED}>{button}</EuiToolTip>
      </span>
    );
  }

  return button;
};

TroubleshootWithAiComponent.displayName = 'TroubleshootWithAi';

export const TroubleshootWithAi = React.memo(TroubleshootWithAiComponent);
