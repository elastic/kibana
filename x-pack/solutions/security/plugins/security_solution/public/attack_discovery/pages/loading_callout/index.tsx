/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingElastic,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import type { ErrorCategory } from '@kbn/discoveries-schemas';
import { Countdown } from './countdown';
import { LoadingMessages } from './loading_messages';
import { WorkflowExecutionDetailsFlyout } from './workflow_execution_details_flyout';
import type { SourceMetadata } from './workflow_execution_details_flyout/diagnostic_report/helpers/build_diagnostic_report';
import * as i18n from './translations';
import { getIsTerminalState } from './get_is_terminal_state';
import { useDismissAttackDiscoveryGeneration } from '../use_dismiss_attack_discovery_generations';
import { useHasWorkflowsPrivileges } from '../hooks/use_has_workflows_privileges';
import { ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../common/lib/telemetry';

const BACKGROUND_COLOR_LIGHT = '#E6F1FA';
const BACKGROUND_COLOR_DARK = '#0B2030';

const BORDER_COLOR_DARK = '#0B2030';

interface Props {
  alertsContextCount: number | null;
  approximateFutureTime: Date | null;
  averageSuccessfulDurationNanoseconds?: number;
  connectorActionTypeId?: string;
  connectorModel?: string;
  connectorName?: string;
  discoveries?: number;
  duplicatesDroppedCount?: number;
  end?: string | null;
  errorCategory?: ErrorCategory;
  eventActions?: string[] | null;
  executionUuid?: string;
  failedWorkflowId?: string;
  generatedCount?: number;
  generationEndTime?: string;
  hallucinationsFilteredCount?: number;
  /** When true, hides the Details and Dismiss buttons (used when rendered inside the flyout) */
  hideActions?: boolean;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  loadingMessage?: string;
  /**
   * When provided, clicking "View details" delegates to this callback instead of
   * opening the local `WorkflowExecutionDetailsFlyout`. Used by the master-detail
   * control center to swap its flyout body in place (avoiding a stacked flyout).
   */
  onViewDetails?: (executionUuid: string) => void;
  onRefresh?: () => void;
  persistedCount?: number;
  reason?: string;
  refetchGenerations?: () => void;
  sourceMetadata?: SourceMetadata | null;
  start?: string | null;
  status?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  successfulGenerations?: number;
  workflowId?: string;
  workflowExecutions?: WorkflowExecutionsTracking | null;
  workflowRunId?: string;
}

const LoadingCalloutComponent: React.FC<Props> = ({
  alertsContextCount,
  approximateFutureTime,
  averageSuccessfulDurationNanoseconds,
  connectorActionTypeId,
  connectorModel,
  connectorName,
  discoveries,
  duplicatesDroppedCount,
  end,
  errorCategory,
  eventActions,
  executionUuid,
  failedWorkflowId,
  generatedCount,
  generationEndTime,
  hallucinationsFilteredCount,
  hideActions = false,
  localStorageAttackDiscoveryMaxAlerts,
  loadingMessage,
  onViewDetails,
  onRefresh,
  persistedCount,
  reason,
  refetchGenerations,
  sourceMetadata,
  start,
  status,
  successfulGenerations,
  workflowId,
  workflowExecutions,
  workflowRunId,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();
  const { featureFlags, http, telemetry, uiSettings } = useKibana().services;

  const [isWorkflowsEnabled, setIsWorkflowsEnabled] = useState<boolean>(false);

  const { hasWorkflowsRead } = useHasWorkflowsPrivileges();

  // Load feature flag value and combine with per-space uiSetting opt-in
  useEffect(() => {
    const loadFeatureFlag = async () => {
      const ffEnabled = await featureFlags.getBooleanValue(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        true
      );
      setIsWorkflowsEnabled(
        ffEnabled && uiSettings.get(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING, false)
      );
    };
    loadFeatureFlag();
  }, [featureFlags, uiSettings]);

  const isTerminalState = useMemo(() => getIsTerminalState(status), [status]);

  const leftContent = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" data-test-subj="leftContent" gutterSize="none">
        <EuiFlexItem grow={false}>
          {isTerminalState ? (
            <EuiIcon type="logoElastic" size="l" aria-hidden={true} />
          ) : (
            <EuiLoadingElastic data-test-subj="loadingElastic" size="l" />
          )}
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            margin-left: ${euiTheme.size.m};
          `}
          grow={false}
        >
          <LoadingMessages
            alertsContextCount={alertsContextCount}
            connectorName={connectorName}
            discoveries={discoveries}
            duplicatesDroppedCount={duplicatesDroppedCount}
            end={end}
            generatedCount={generatedCount}
            generationEndTime={generationEndTime}
            hallucinationsFilteredCount={hallucinationsFilteredCount}
            loadingMessage={loadingMessage}
            localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
            persistedCount={persistedCount}
            reason={reason}
            start={start}
            status={status}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [
      alertsContextCount,
      connectorName,
      discoveries,
      duplicatesDroppedCount,
      end,
      euiTheme.size.m,
      generatedCount,
      generationEndTime,
      hallucinationsFilteredCount,
      isTerminalState,
      loadingMessage,
      localStorageAttackDiscoveryMaxAlerts,
      persistedCount,
      reason,
      start,
      status,
    ]
  );

  const backgroundColor = useMemo(() => {
    const defaultBackgroundColor = isDarkMode ? BACKGROUND_COLOR_DARK : BACKGROUND_COLOR_LIGHT;
    const successBackgroundColor = euiTheme.colors.backgroundBaseSuccess;
    const failedBackgroundColor = euiTheme.colors.backgroundBaseDanger;

    if (status === 'succeeded') {
      return successBackgroundColor;
    }

    if (status === 'failed') {
      return failedBackgroundColor;
    }

    return defaultBackgroundColor;
  }, [
    euiTheme.colors.backgroundBaseDanger,
    euiTheme.colors.backgroundBaseSuccess,
    isDarkMode,
    status,
  ]);

  const borderColor = useMemo(() => {
    const defaultBorderColor = isDarkMode ? BORDER_COLOR_DARK : euiTheme.colors.lightShade;
    const successBorderColor = euiTheme.colors.borderBaseSuccess;
    const failedBorderColor = euiTheme.colors.borderBaseDanger;

    if (status === 'succeeded') {
      return successBorderColor;
    }

    if (status === 'failed') {
      return failedBorderColor;
    }

    return defaultBorderColor;
  }, [
    euiTheme.colors.borderBaseDanger,
    euiTheme.colors.borderBaseSuccess,
    euiTheme.colors.lightShade,
    isDarkMode,
    status,
  ]);

  const { mutateAsync: dismissAttackDiscoveryGeneration } = useDismissAttackDiscoveryGeneration();

  const [isDismissing, setIsDismissing] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const dismissGeneration = useCallback(async () => {
    try {
      if (executionUuid != null) {
        setIsDismissing(true);
        telemetry.reportEvent(AttackDiscoveryEventTypes.GenerationDismissed, {});
        await dismissAttackDiscoveryGeneration({ executionUuid });
        refetchGenerations?.(); // force a refresh of the generations list
      }
    } finally {
      setIsDismissing(false);
    }
  }, [dismissAttackDiscoveryGeneration, executionUuid, refetchGenerations, telemetry]);

  const openFlyout = useCallback(() => {
    telemetry.reportEvent(AttackDiscoveryEventTypes.ExecutionDetailsOpened, {});

    // When a delegate is provided, hand off "View details" to the parent (e.g.
    // the master-detail control center) instead of opening a nested flyout.
    if (onViewDetails != null && executionUuid != null) {
      onViewDetails(executionUuid);
      return;
    }

    setIsFlyoutOpen(true);
  }, [executionUuid, onViewDetails, telemetry]);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  const showDetailsButton = useMemo(
    () => !hideActions && isWorkflowsEnabled && hasWorkflowsRead && workflowId != null,
    [hasWorkflowsRead, hideActions, isWorkflowsEnabled, workflowId]
  );

  return (
    <div
      css={css`
        background-color: ${backgroundColor};
        border: 1px solid ${borderColor};
        border-radius: 6px;
        padding: ${euiTheme.size.base};
      `}
      data-test-subj="loadingCallout"
    >
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{leftContent}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            {!isTerminalState && (
              <EuiFlexItem grow={false}>
                <Countdown
                  approximateFutureTime={approximateFutureTime}
                  averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
                  successfulGenerations={successfulGenerations}
                />
              </EuiFlexItem>
            )}

            {showDetailsButton && (
              <EuiFlexItem
                css={css`
                  margin-left: ${euiTheme.size.m};
                `}
                grow={false}
              >
                <EuiToolTip content={i18n.VIEW_DETAILS} disableScreenReaderOutput position="top">
                  <EuiButtonIcon
                    aria-label={i18n.VIEW_DETAILS}
                    data-test-subj="detailsButton"
                    iconType="inspect"
                    onClick={openFlyout}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}

            {!hideActions && (
              <EuiFlexItem
                css={css`
                  margin-left: ${euiTheme.size.m};
                `}
                grow={false}
              >
                {isDismissing ? (
                  <EuiLoadingSpinner
                    data-test-subj="loadingSpinner"
                    size="m"
                    css={css`
                      color: ${euiTheme.colors.text};
                    `}
                  />
                ) : (
                  <EuiToolTip content={i18n.CLOSE} disableScreenReaderOutput>
                    <EuiButtonIcon
                      aria-label={i18n.CLOSE}
                      disabled={isDismissing}
                      iconType="cross"
                      onClick={dismissGeneration}
                      data-test-subj="dismissButton"
                    />
                  </EuiToolTip>
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {onViewDetails == null && isFlyoutOpen && (
        <WorkflowExecutionDetailsFlyout
          alertsContextCount={alertsContextCount}
          approximateFutureTime={approximateFutureTime}
          averageSuccessfulDurationMs={
            averageSuccessfulDurationNanoseconds != null
              ? Math.round(averageSuccessfulDurationNanoseconds / 1_000_000)
              : undefined
          }
          averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
          configuredMaxAlerts={
            localStorageAttackDiscoveryMaxAlerts != null
              ? parseInt(localStorageAttackDiscoveryMaxAlerts, 10) || undefined
              : undefined
          }
          connectorActionTypeId={connectorActionTypeId}
          connectorModel={connectorModel}
          connectorName={connectorName}
          dateRangeEnd={end ?? undefined}
          dateRangeStart={start ?? undefined}
          discoveriesCount={discoveries}
          duplicatesDroppedCount={duplicatesDroppedCount}
          end={end}
          errorCategory={errorCategory}
          eventActions={eventActions}
          executionUuid={executionUuid}
          failedWorkflowId={failedWorkflowId}
          generatedCount={generatedCount}
          generationEndTime={generationEndTime}
          generationStatus={status}
          hallucinationsFilteredCount={hallucinationsFilteredCount}
          http={http}
          loadingMessage={loadingMessage}
          localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
          onClose={closeFlyout}
          onRefresh={onRefresh}
          persistedCount={persistedCount}
          reason={reason}
          sourceMetadata={sourceMetadata}
          start={start}
          successfulGenerations={successfulGenerations}
          workflowExecutions={workflowExecutions}
          workflowId={workflowId}
          workflowRunId={workflowRunId}
        />
      )}
    </div>
  );
};

LoadingCalloutComponent.displayName = 'LoadingCallout';

export const LoadingCallout = React.memo(LoadingCalloutComponent);
