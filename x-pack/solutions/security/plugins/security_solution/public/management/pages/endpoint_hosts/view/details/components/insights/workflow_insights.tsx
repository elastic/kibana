/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import { EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { useKnowledgeBaseStatus } from '@kbn/elastic-assistant/impl/assistant/api/knowledge_base/use_knowledge_base_status';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { ActionType } from '../../../../../../../../common/endpoint/types/workflow_insights';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import { useFetchInsights } from '../../../hooks/insights/use_fetch_insights';
import { useTriggerScan } from '../../../hooks/insights/use_trigger_scan';
import { useFetchLatestScan } from '../../../hooks/insights/use_fetch_ongoing_tasks';
import { WORKFLOW_INSIGHTS } from '../../../translations';
import { WorkflowInsightsResults } from './workflow_insights_results';
import { WorkflowInsightsScanSection } from './workflow_insights_scan';

interface WorkflowInsightsProps {
  endpointId: string;
}

export const WorkflowInsights = React.memo(({ endpointId }: WorkflowInsightsProps) => {
  const [isScanButtonDisabled, setIsScanButtonDisabled] = useState(true);
  const [scanCompleted, setIsScanCompleted] = useState(false);
  const [userTriggeredScan, setUserTriggeredScan] = useState(false);
  const [insightGenerationFailures, setInsightGenerationFailures] = useState(false);
  const [expectedCount, setExpectedCount] = useState<number | null>(null);

  const defendInsightsPolicyResponseFailureEnabled = useIsExperimentalFeatureEnabled(
    'defendInsightsPolicyResponseFailure'
  );
  const {
    inferenceEnabled,
    http,
    assistantAvailability: { isAssistantEnabled },
  } = useAssistantContext();
  const { data: kbStatus } = useKnowledgeBaseStatus({ http, enabled: isAssistantEnabled });

  const onInsightGenerationFailure = () => {
    setInsightGenerationFailures(true);
  };

  const [setScanOngoing, setScanCompleted] = [
    () => setIsScanCompleted(false),
    () => setIsScanCompleted(true),
  ];

  const insightTypes = useMemo<DefendInsightType[]>(() => {
    const typesToQuery: DefendInsightType[] = [DefendInsightType.Enum.incompatible_antivirus];
    if (
      defendInsightsPolicyResponseFailureEnabled &&
      // we only want to run `policy_response_failure` type with KB
      (kbStatus?.defend_insights_exists || kbStatus?.is_setup_in_progress)
    ) {
      typesToQuery.push(DefendInsightType.Enum.policy_response_failure);
    }
    return typesToQuery;
  }, [defendInsightsPolicyResponseFailureEnabled, kbStatus]);

  // refetch is automatically triggered when expectedCount changes
  const { data: insights, isFetching: isFetchingInsights } = useFetchInsights({
    endpointId,
    onSuccess: setScanCompleted,
    scanCompleted,
    expectedCount,
    insightTypes,
  });

  const {
    data: latestScan,
    isLoading: isLoadingLatestScan,
    refetch: refetchLatestScan,
  } = useFetchLatestScan({
    endpointId,
    insightTypes,
    isPolling: isScanButtonDisabled,
    onSuccess: setExpectedCount,
    onInsightGenerationFailure,
  });

  const { mutate: triggerScan, isLoading: isPostDefendInsightsLoading } = useTriggerScan({
    onSuccess: refetchLatestScan,
  });

  useEffect(() => {
    setExpectedCount(null);
    setIsScanCompleted(false);
  }, [endpointId, setExpectedCount, setIsScanCompleted]);

  useEffect(() => {
    const isInsightRunning = latestScan?.hasRunning ?? false;
    const initialFetchNotStarted = expectedCount === null;
    setIsScanButtonDisabled(
      isPostDefendInsightsLoading ||
        isLoadingLatestScan ||
        isInsightRunning ||
        isFetchingInsights ||
        initialFetchNotStarted // hold off until we know `expectedCount` (even 0)
    );
  }, [
    endpointId,
    isPostDefendInsightsLoading,
    isLoadingLatestScan,
    latestScan,
    expectedCount,
    isFetchingInsights,
  ]);

  const lastResultCaption = useMemo(() => {
    if (!insights?.length) {
      return null;
    }

    const latestTimestamp = insights
      .map((insight) => moment.utc(insight['@timestamp']))
      .sort((a, b) => b.diff(a))[0];

    return (
      <EuiText color={'subdued'} size={'xs'}>
        {`${WORKFLOW_INSIGHTS.titleRight} ${latestTimestamp.local().fromNow()}`}
      </EuiText>
    );
  }, [insights]);

  const activeInsights = useMemo(() => {
    if (isScanButtonDisabled) {
      return [];
    }

    const insightTypesSet = new Set(insightTypes);
    return (insights ?? []).filter(
      (insight) => insightTypesSet.has(insight.type) && insight.action.type === ActionType.Refreshed
    );
  }, [isScanButtonDisabled, insights, insightTypes]);

  const onScanButtonClick = useCallback(
    ({ actionTypeId, connectorId }: { actionTypeId: string; connectorId: string }) => {
      if (insightGenerationFailures) {
        setInsightGenerationFailures(false);
      }

      setScanOngoing();
      setExpectedCount(null);
      if (!userTriggeredScan) {
        setUserTriggeredScan(true);
      }
      triggerScan({
        endpointId,
        actionTypeId,
        connectorId,
        insightTypes,
      });
    },
    [
      insightGenerationFailures,
      setScanOngoing,
      userTriggeredScan,
      triggerScan,
      endpointId,
      setExpectedCount,
      insightTypes,
    ]
  );

  return (
    <>
      <EuiFlexGroup
        data-test-subj="endpointDetailsInsightsWrapper"
        gutterSize={'s'}
        justifyContent="spaceBetween"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiText size={'m'}>
            <h4>{WORKFLOW_INSIGHTS.title}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size={'s'}>{lastResultCaption}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'m'} />
      <WorkflowInsightsScanSection
        isScanButtonDisabled={isScanButtonDisabled}
        onScanButtonClick={onScanButtonClick}
        inferenceEnabled={inferenceEnabled}
        kbStatus={kbStatus}
        defendInsightsPolicyResponseFailureEnabled={defendInsightsPolicyResponseFailureEnabled}
      />
      <EuiSpacer size={'m'} />
      <WorkflowInsightsResults
        results={activeInsights}
        scanCompleted={
          !isScanButtonDisabled && !insightGenerationFailures && scanCompleted && userTriggeredScan
        }
        endpointId={endpointId}
      />
    </>
  );
});

WorkflowInsights.displayName = 'WorkflowInsights';
