/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useAbortControllerRef } from '../../../../hooks/use_abort_controller_ref';
import { useIndicesCheckContext } from '../../../../contexts/indices_check_context';

import { MeteringStatsIndex, PatternRollup } from '../../../../types';
import { useDataQualityContext } from '../../../../data_quality_context';
import { IndexResultBadge } from '../index_result_badge';
import { useCurrentWindowWidth } from './hooks/use_current_window_width';
import { HISTORY, LATEST_CHECK } from './translations';
import { LatestResults } from './latest_results';
import { HistoricalResults } from './historical_results';
import { useHistoricalResultsContext } from '../contexts/historical_results_context';
import { getFormattedCheckTime } from './utils/get_formatted_check_time';
import { CHECK_NOW } from '../translations';
import {
  HISTORICAL_RESULTS_TOUR_SELECTOR_KEY,
  HISTORY_TAB_ID,
  LATEST_CHECK_TAB_ID,
} from '../constants';
import { IndexCheckFlyoutTabId } from './types';
import { HistoricalResultsTour } from '../historical_results_tour';

export interface Props {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexName: string;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, MeteringStatsIndex> | null;
  onClose: () => void;
  initialSelectedTabId: IndexCheckFlyoutTabId;
  onDismissTour: () => void;
  isTourActive: boolean;
}

const tabs = [
  {
    id: LATEST_CHECK_TAB_ID,
    name: LATEST_CHECK,
  },
  {
    id: HISTORY_TAB_ID,
    name: HISTORY,
  },
] as const;

export const IndexCheckFlyoutComponent: React.FC<Props> = ({
  ilmExplain,
  indexName,
  initialSelectedTabId,
  pattern,
  patternRollup,
  stats,
  onClose,
  onDismissTour,
  isTourActive,
}) => {
  const didSwitchToLatestTabOnceRef = useRef(false);
  const { fetchHistoricalResults } = useHistoricalResultsContext();
  const currentWindowWidth = useCurrentWindowWidth();
  const isLargeScreen = currentWindowWidth > 1720;
  const isMediumScreen = currentWindowWidth > 1200;
  const { httpFetch, formatBytes, formatNumber } = useDataQualityContext();
  const { checkState, checkIndex } = useIndicesCheckContext();
  const indexCheckState = checkState[indexName];
  const isChecking = indexCheckState?.isChecking ?? false;
  const partitionedFieldMetadata = indexCheckState?.partitionedFieldMetadata ?? null;
  const indexResult = patternRollup?.results?.[indexName];
  const indexCheckFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'indexCheckFlyoutTitle',
  });
  const [selectedTabId, setSelectedTabId] = useState(initialSelectedTabId);
  const checkNowButtonAbortControllerRef = useAbortControllerRef();
  const checkLatestTabAbortControllerRef = useAbortControllerRef();
  const fetchHistoricalResultsAbortControllerRef = useAbortControllerRef();

  const handleTabClick = useCallback(
    (tabId: IndexCheckFlyoutTabId) => {
      setSelectedTabId(tabId);
      if (tabId === HISTORY_TAB_ID) {
        if (isTourActive) {
          onDismissTour();
        }
        fetchHistoricalResults({
          abortController: fetchHistoricalResultsAbortControllerRef.current,
          indexName,
        });
      }

      if (tabId === LATEST_CHECK_TAB_ID) {
        if (!didSwitchToLatestTabOnceRef.current) {
          didSwitchToLatestTabOnceRef.current = true;
          checkIndex({
            abortController: checkLatestTabAbortControllerRef.current,
            indexName,
            pattern,
            httpFetch,
            formatBytes,
            formatNumber,
          });
        }
      }
    },
    [
      checkIndex,
      checkLatestTabAbortControllerRef,
      fetchHistoricalResults,
      fetchHistoricalResultsAbortControllerRef,
      formatBytes,
      formatNumber,
      httpFetch,
      indexName,
      isTourActive,
      onDismissTour,
      pattern,
    ]
  );

  const handleCheckNow = useCallback(() => {
    checkIndex({
      abortController: checkNowButtonAbortControllerRef.current,
      indexName,
      pattern,
      httpFetch,
      formatBytes,
      formatNumber,
    });
    if (selectedTabId === HISTORY_TAB_ID) {
      setSelectedTabId(LATEST_CHECK_TAB_ID);
    }
  }, [
    checkIndex,
    checkNowButtonAbortControllerRef,
    formatBytes,
    formatNumber,
    httpFetch,
    indexName,
    pattern,
    selectedTabId,
  ]);

  const handleSelectHistoryTab = useCallback(() => {
    handleTabClick(HISTORY_TAB_ID);
  }, [handleTabClick]);

  const renderTabs = useMemo(
    () =>
      tabs.map((tab, index) => {
        return (
          <EuiTab
            data-test-subj={`indexCheckFlyoutTab-${tab.id}`}
            onClick={() => handleTabClick(tab.id)}
            isSelected={tab.id === selectedTabId}
            key={index}
            {...(tab.id === HISTORY_TAB_ID && {
              [HISTORICAL_RESULTS_TOUR_SELECTOR_KEY]: `${pattern}-history-tab`,
            })}
          >
            {tab.name}
          </EuiTab>
        );
      }),
    [handleTabClick, pattern, selectedTabId]
  );

  return (
    <div data-test-subj="indexCheckFlyout">
      <EuiFlyout
        size={isLargeScreen ? '50%' : isMediumScreen ? '70%' : '90%'}
        ownFocus
        onClose={onClose}
        aria-labelledby={indexCheckFlyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <EuiFlexGroup alignItems={'center'}>
              {partitionedFieldMetadata?.incompatible != null && (
                <IndexResultBadge incompatible={partitionedFieldMetadata.incompatible.length} />
              )}
              <h2 data-test-subj="indexCheckFlyoutHeading" id={indexCheckFlyoutTitleId}>
                {indexName}
              </h2>
            </EuiFlexGroup>
          </EuiTitle>
          {indexResult != null && indexResult.checkedAt != null && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" data-test-subj="latestCheckedAt">
                {getFormattedCheckTime(indexResult.checkedAt)}
              </EuiText>
            </>
          )}
          <EuiSpacer />
          <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {selectedTabId === LATEST_CHECK_TAB_ID ? (
            <>
              <LatestResults
                indexName={indexName}
                stats={stats}
                ilmExplain={ilmExplain}
                patternRollup={patternRollup}
              />
              <HistoricalResultsTour
                anchorSelectorValue={`${pattern}-history-tab`}
                onTryIt={handleSelectHistoryTab}
                isOpen={isTourActive}
                onDismissTour={onDismissTour}
              />
            </>
          ) : (
            <HistoricalResults indexName={indexName} />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="indexCheckFlyoutCheckNowButton"
                iconType="refresh"
                isLoading={isChecking}
                onClick={handleCheckNow}
                fill
              >
                {CHECK_NOW}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </div>
  );
};

IndexCheckFlyoutComponent.displayName = 'IndexCheckFlyoutComponent';

export const IndexCheckFlyout = React.memo(IndexCheckFlyoutComponent);
