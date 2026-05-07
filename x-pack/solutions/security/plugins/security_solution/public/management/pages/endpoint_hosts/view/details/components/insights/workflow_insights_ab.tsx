/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import { EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import {
  WorkflowInsightType,
  WorkflowInsightActionType,
} from '../../../../../../../../common/endpoint/types/workflow_insights';
import { useToasts } from '../../../../../../../common/lib/kibana';
import { useTriggerScanAB } from '../../../hooks/insights/use_trigger_scan_ab';
import { useFetchPendingScans } from '../../../hooks/insights/use_fetch_pending_scans';
import { useFetchInsightsAB } from '../../../hooks/insights/use_fetch_insights_ab';
import { WORKFLOW_INSIGHTS } from '../../../translations';
import { WorkflowInsightsResults } from './workflow_insights_results';
import { WorkflowInsightsScanSectionAB } from './workflow_insights_scan_ab';

interface WorkflowInsightsABProps {
  endpointId: string;
}

const AB_INSIGHT_TYPES: WorkflowInsightType[] = [
  WorkflowInsightType.enum.incompatible_antivirus,
  WorkflowInsightType.enum.policy_response_failure,
];

export const WorkflowInsightsAB = ({ endpointId }: WorkflowInsightsABProps) => {
  const toasts = useToasts();

  // Start as true — mount poll checks /pending to detect in-progress scans.
  const [isScanRunning, setIsScanRunning] = useState(true);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [scanTimestamp, setScanTimestamp] = useState(0);
  const [userTriggeredScan, setUserTriggeredScan] = useState(false);
  const [isUserScanLoading, setIsUserScanLoading] = useState(false);

  // Reset state when endpoint changes
  useEffect(() => {
    setIsScanRunning(true);
    setScanCompleted(false);
    setScanFailed(false);
    setScanTimestamp(0);
    setUserTriggeredScan(false);
    setIsUserScanLoading(false);
  }, [endpointId]);

  // Mount poll success: no scan running, go idle. Insights are fetched independently.
  const onMountPollSuccess = useCallback(() => {
    setIsScanRunning(false);
  }, []);

  // Mount poll failure (terminal executions only): ignore — these are stale from previous scans.
  // On mount, we only care about running/scheduled. Terminal executions are irrelevant.
  const onMountPollFailure = useCallback((_failureReasons: string[]) => {
    setIsScanRunning(false);
  }, []);

  // User-triggered scan: pending returned empty — scan complete
  const onScanPollSuccess = useCallback(() => {
    setIsScanRunning(false);
    setIsUserScanLoading(false);
    setScanCompleted(true);
  }, []);

  // User-triggered scan: only terminal executions remain — scan failed
  const onScanPollFailure = useCallback(
    (failureReasons: string[]) => {
      setIsScanRunning(false);
      setIsUserScanLoading(false);
      setScanCompleted(true);
      setScanFailed(true);
      toasts.addDanger({
        title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
        text: failureReasons.length > 0 ? failureReasons.join('; ') : undefined,
      });
    },
    [toasts]
  );

  const { data: pendingData } = useFetchPendingScans({
    endpointId,
    insightTypes: AB_INSIGHT_TYPES,
    isPolling: isScanRunning,
    scanTimestamp,
    // On mount (userTriggeredScan=false), ignore terminal executions (no error toast).
    // After scan click (userTriggeredScan=true), surface failures.
    onSuccess: userTriggeredScan ? onScanPollSuccess : onMountPollSuccess,
    onFailure: userTriggeredScan ? onScanPollFailure : onMountPollFailure,
  });

  // Show loading spinner when a scan is actively running — either from user click
  // (isUserScanLoading) or detected on mount via pending poll (running/scheduled found).
  const hasPendingActive = pendingData?.pending?.some(
    (exec) => exec.status === 'running' || exec.status === 'scheduled'
  );
  const showScanLoading = isUserScanLoading || (isScanRunning && !!hasPendingActive);

  // Always fetch insights on mount to display previous scan results.
  // Also refetches when scanTimestamp changes (after a new scan completes).
  const { data: insights } = useFetchInsightsAB({
    endpointId,
    scanTimestamp,
    insightTypes: AB_INSIGHT_TYPES,
  });

  const { mutate: triggerScan, isLoading: isTriggerLoading } = useTriggerScanAB({
    onSuccess: ({ executions, failures }) => {
      if (executions.length === 0) {
        // All combos failed and no in-flight executions — show error immediately, don't poll
        const failureReasons = (failures ?? []).map((f) => f.error).filter(Boolean);
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.scanFailedAllCombos,
          text: failureReasons.length > 0 ? failureReasons.join('; ') : undefined,
        });
        setScanFailed(true);
        setScanCompleted(true);
        setIsScanRunning(false);
        setIsUserScanLoading(false);
      }
      // When executions.length > 0, the POST confirmed executions exist — start polling now
      if (executions.length > 0) {
        setIsScanRunning(true);
      }
    },
    onError: () => {
      setIsScanRunning(false);
      setIsUserScanLoading(false);
      setScanFailed(true);
      setScanCompleted(true);
    },
  });

  const onScanButtonClick = useCallback(
    (connectorId: string) => {
      setScanCompleted(false);
      setScanFailed(false);
      setIsUserScanLoading(true);
      setScanTimestamp(Date.now());
      if (!userTriggeredScan) {
        setUserTriggeredScan(true);
      }
      triggerScan({ endpointId, insightTypes: AB_INSIGHT_TYPES, connectorId });
    },
    [endpointId, triggerScan, userTriggeredScan]
  );

  const lastResultCaption = useMemo(() => {
    if (!insights?.length) return null;

    const latestTimestamp = insights
      .map((insight) => moment.utc(insight['@timestamp']))
      .sort((a, b) => b.diff(a))[0];

    return (
      <EuiText color="subdued" size="xs">
        {`${WORKFLOW_INSIGHTS.titleRight} ${latestTimestamp.local().fromNow()}`}
      </EuiText>
    );
  }, [insights]);

  const activeInsights = useMemo(() => {
    // Clear results immediately when a scan is in progress or triggered
    if (isScanRunning || isUserScanLoading) return [];

    const insightTypesSet = new Set(AB_INSIGHT_TYPES);
    return (insights ?? []).filter(
      (insight) =>
        insightTypesSet.has(insight.type) &&
        insight.action.type === WorkflowInsightActionType.enum.refreshed
    );
  }, [isScanRunning, isUserScanLoading, insights]);

  // Determine scanCompleted prop for WorkflowInsightsResults:
  // - If scanFailed with results: show partial results (scanCompleted=true)
  // - If scanFailed without results: suppress "no issues found" (scanCompleted=false)
  // - Otherwise: use scanCompleted && userTriggeredScan as normal
  const resultsProps = useMemo(() => {
    if (scanFailed) {
      return { scanCompleted: activeInsights.length > 0 };
    }
    return { scanCompleted: scanCompleted && userTriggeredScan };
  }, [scanFailed, scanCompleted, userTriggeredScan, activeInsights.length]);

  return (
    <>
      <EuiFlexGroup
        data-test-subj="endpointDetailsInsightsWrapper"
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <h4>{WORKFLOW_INSIGHTS.title}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{lastResultCaption}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <WorkflowInsightsScanSectionAB
        isScanButtonDisabled={isScanRunning || isTriggerLoading || isUserScanLoading}
        isLoading={showScanLoading}
        onScanButtonClick={onScanButtonClick}
      />
      <EuiSpacer size="m" />
      <WorkflowInsightsResults
        results={activeInsights}
        scanCompleted={resultsProps.scanCompleted}
        endpointId={endpointId}
      />
    </>
  );
};

WorkflowInsightsAB.displayName = 'WorkflowInsightsAB';
