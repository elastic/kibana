/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiSpacer,
  EuiText,
  EuiBetaBadge,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import {
  TECHNICAL_PREVIEW_TOOLTIP,
  TECHNICAL_PREVIEW,
} from '../../../../../../../common/translations';
import { useFetchInsights } from '../../../hooks/insights/use_fetch_insights';
import { useTriggerScan } from '../../../hooks/insights/use_trigger_scan';
import { useFetchOngoingScans } from '../../../hooks/insights/use_fetch_ongoing_tasks';
import { WorkflowInsightsResults } from './workflow_insights_results';
import { WorkflowInsightsScanSection } from './workflow_insights_scan';
import { WORKFLOW_INSIGHTS } from '../../../translations';

interface WorkflowInsightsProps {
  endpointId: string;
}

export const WorkflowInsights = React.memo(({ endpointId }: WorkflowInsightsProps) => {
  const [isScanButtonDisabled, setIsScanButtonDisabled] = useState(true);
  const [scanCompleted, setIsScanCompleted] = useState(false);
  const [userTriggeredScan, setUserTriggeredScan] = useState(false);
  const [insightGenerationFailures, setInsightGenerationFailures] = useState(false);

  const disableScanButton = () => {
    setIsScanButtonDisabled(true);
  };

  const onInsightGenerationFailure = () => {
    setInsightGenerationFailures(true);
  };

  const [setScanOngoing, setScanCompleted] = [
    () => setIsScanCompleted(false),
    () => setIsScanCompleted(true),
  ];

  const { data: insights, refetch: refetchInsights } = useFetchInsights({
    endpointId,
    onSuccess: setScanCompleted,
  });

  const {
    data: ongoingScans,
    isLoading: isLoadingOngoingScans,
    refetch: refetchOngoingScans,
  } = useFetchOngoingScans({
    endpointId,
    isPolling: isScanButtonDisabled,
    onSuccess: refetchInsights,
    onInsightGenerationFailure,
  });

  const { mutate: triggerScan } = useTriggerScan({
    onSuccess: refetchOngoingScans,
    onMutate: disableScanButton,
  });

  useEffect(() => {
    setIsScanButtonDisabled(!!ongoingScans?.length || isLoadingOngoingScans);
  }, [ongoingScans, isLoadingOngoingScans]);

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

  const onScanButtonClick = useCallback(
    ({ actionTypeId, connectorId }: { actionTypeId: string; connectorId: string }) => {
      if (insightGenerationFailures) {
        setInsightGenerationFailures(false);
      }

      setScanOngoing();
      if (!userTriggeredScan) {
        setUserTriggeredScan(true);
      }
      triggerScan({ endpointId, actionTypeId, connectorId });
    },
    [insightGenerationFailures, setScanOngoing, userTriggeredScan, triggerScan, endpointId]
  );

  return (
    <>
      <EuiAccordion
        data-test-subj={'endpointDetailsInsightsWrapper'}
        id={'workflow-insights-wrapper'}
        buttonContent={
          <EuiFlexGroup gutterSize={'s'}>
            <EuiFlexItem grow={false}>
              <EuiText size={'m'}>
                <h4>{WORKFLOW_INSIGHTS.title}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                alignment={'middle'}
                label={TECHNICAL_PREVIEW}
                tooltipContent={TECHNICAL_PREVIEW_TOOLTIP}
                size="s"
                iconType={'beaker'}
                data-test-subj={'workflow-insights-tech-preview-badge'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen
        extraAction={lastResultCaption}
        paddingSize={'none'}
      >
        <EuiSpacer size={'m'} />
        <WorkflowInsightsScanSection
          isScanButtonDisabled={isScanButtonDisabled}
          onScanButtonClick={onScanButtonClick}
        />
        <EuiSpacer size={'m'} />
        <WorkflowInsightsResults
          results={insights}
          scanCompleted={!insightGenerationFailures && scanCompleted && userTriggeredScan}
          endpointId={endpointId}
        />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
});

WorkflowInsights.displayName = 'WorkflowInsights';
