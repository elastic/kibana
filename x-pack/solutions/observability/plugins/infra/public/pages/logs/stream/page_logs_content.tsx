/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import styled from '@emotion/styled';
import { LogEntry, convertISODateToNanoPrecision } from '@kbn/logs-shared-plugin/common';
import {
  LogEntryFlyout,
  LogEntryStreamItem,
  ScrollableLogTextStreamView,
  UpdatedDateRange,
  useLogHighlightsStateContext,
  useLogPositionStateContext,
  useLogStreamContext,
  useLogViewContext,
  VisibleInterval,
  WithSummary,
  WithSummaryProps,
} from '@kbn/logs-shared-plugin/public';
import { useSelector } from '@xstate/react';
import stringify from 'json-stable-stringify';
import React, { useCallback, useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { MatchedStateFromActor } from '@kbn/xstate-utils';
import { LogsDeprecationCallout } from '../../../components/logs_deprecation_callout';
import { TimeKey } from '../../../../common/time';
import { AutoSizer } from '../../../components/auto_sizer';
import { LogMinimap } from '../../../components/logging/log_minimap';
import { PageContent } from '../../../components/page';
import {
  useLogEntryFlyoutContext,
  WithFlyoutOptionsUrlState,
} from '../../../containers/logs/log_flyout';
import { useLogViewConfigurationContext } from '../../../containers/logs/log_view_configuration';
import { useViewLogInProviderContext } from '../../../containers/logs/view_log_in_context';
import { WithLogTextviewUrlState } from '../../../containers/logs/with_log_textview';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import {
  LogStreamPageActorRef,
  LogStreamPageCallbacks,
  useLogStreamPageStateContext,
} from '../../../observability_logs/log_stream_page/state';
import { type ParsedQuery } from '../../../observability_logs/log_stream_query_state';
import { datemathToEpochMillis, isValidDatemath } from '../../../utils/datemath';
import { LogsToolbar } from './page_toolbar';
import { PageViewLogInContext } from './page_view_log_in_context';

const PAGE_THRESHOLD = 2;

export const StreamPageLogsContent = React.memo<{
  filterQuery: ParsedQuery;
  logStreamPageCallbacks: LogStreamPageCallbacks;
}>(({ filterQuery, logStreamPageCallbacks }) => {
  const {
    data: {
      query: { queryString },
    },
  } = useKibanaContextForPlugin().services;
  const { resolvedLogView, logView, logViewReference } = useLogViewContext();
  const { textScale, textWrap } = useLogViewConfigurationContext();
  const {
    surroundingLogsId,
    setSurroundingLogsId,
    closeFlyout: closeLogEntryFlyout,
    openFlyout: openLogEntryFlyout,
    isFlyoutOpen,
    logEntryId: flyoutLogEntryId,
  } = useLogEntryFlyoutContext();

  const {
    startTimestamp,
    endTimestamp,
    isStreaming,
    targetPosition,
    visibleMidpointTime,
    visibleTimeInterval,
    reportVisiblePositions,
    jumpToTargetPosition,
    startLiveStreaming,
    stopLiveStreaming,
    startDateExpression,
    endDateExpression,
    updateDateRange,
    lastCompleteDateRangeExpressionUpdate,
  } = useLogPositionStateContext();

  const {
    isReloading,
    entries,
    topCursor,
    bottomCursor,
    hasMoreAfter: hasMoreAfterEnd,
    hasMoreBefore: hasMoreBeforeStart,
    isLoadingMore,
    lastLoadedTime,
    fetchEntries,
    fetchPreviousEntries,
    fetchNextEntries,
    fetchNewestEntries,
  } = useLogStreamContext();

  const prevStartTimestamp = usePrevious(startTimestamp);
  const prevEndTimestamp = usePrevious(endTimestamp);
  const prevFilterQuery = usePrevious(filterQuery);
  const prevLastCompleteDateRangeExpressionUpdate = usePrevious(
    lastCompleteDateRangeExpressionUpdate
  );

  // Refetch entries if...
  useEffect(() => {
    const isFirstLoad = !prevStartTimestamp || !prevEndTimestamp;

    const completeDateRangeExpressionHasChanged =
      lastCompleteDateRangeExpressionUpdate !== prevLastCompleteDateRangeExpressionUpdate;

    const isCenterPointOutsideLoadedRange =
      targetPosition != null &&
      ((topCursor != null &&
        convertISODateToNanoPrecision(targetPosition.time) <
          convertISODateToNanoPrecision(topCursor.time)) ||
        (bottomCursor != null &&
          convertISODateToNanoPrecision(targetPosition.time) >
            convertISODateToNanoPrecision(bottomCursor.time)));

    const hasQueryChanged = filterQuery !== prevFilterQuery;

    if (
      isFirstLoad ||
      completeDateRangeExpressionHasChanged ||
      isCenterPointOutsideLoadedRange ||
      hasQueryChanged
    ) {
      if (isStreaming) {
        fetchNewestEntries();
      } else {
        fetchEntries();
      }
    }
  }, [
    fetchEntries,
    fetchNewestEntries,
    isStreaming,
    prevStartTimestamp,
    prevEndTimestamp,
    startTimestamp,
    endTimestamp,
    targetPosition,
    topCursor,
    bottomCursor,
    filterQuery,
    prevFilterQuery,
    lastCompleteDateRangeExpressionUpdate,
    prevLastCompleteDateRangeExpressionUpdate,
  ]);

  const { logSummaryHighlights, currentHighlightKey, logEntryHighlightsById } =
    useLogHighlightsStateContext();

  const items = useMemo(
    () =>
      isReloading
        ? []
        : entries.map((logEntry) =>
            createLogEntryStreamItem(logEntry, logEntryHighlightsById[logEntry.id] || [])
          ),

    [entries, isReloading, logEntryHighlightsById]
  );

  const [, { setContextEntry }] = useViewLogInProviderContext();

  const handleDateRangeExtension = useCallback(
    (newDateRange: UpdatedDateRange) => {
      updateDateRange(newDateRange);

      if (
        newDateRange.startDateExpression != null &&
        isValidDatemath(newDateRange.startDateExpression)
      ) {
        fetchPreviousEntries({
          force: true,
          extendTo: datemathToEpochMillis(newDateRange.startDateExpression)!,
        });
      }
      if (
        newDateRange.endDateExpression != null &&
        isValidDatemath(newDateRange.endDateExpression)
      ) {
        fetchNextEntries({
          force: true,
          extendTo: datemathToEpochMillis(newDateRange.endDateExpression)!,
        });
      }
    },
    [updateDateRange, fetchPreviousEntries, fetchNextEntries]
  );

  const handlePagination = useCallback(
    (params: VisibleInterval) => {
      reportVisiblePositions(params);
      if (!params.fromScroll) {
        return;
      }

      if (isLoadingMore) {
        return;
      }

      if (params.pagesBeforeStart < PAGE_THRESHOLD) {
        fetchPreviousEntries();
      } else if (params.pagesAfterEnd < PAGE_THRESHOLD) {
        fetchNextEntries();
      }
    },
    [reportVisiblePositions, isLoadingMore, fetchPreviousEntries, fetchNextEntries]
  );

  const setFilter = useCallback(
    (filter: Query, flyoutItemId: string, timeKey: TimeKey | undefined | null) => {
      queryString.setQuery(filter);
      if (timeKey) {
        jumpToTargetPosition(timeKey);
      }
      setSurroundingLogsId(flyoutItemId);
      stopLiveStreaming();
    },
    [jumpToTargetPosition, queryString, setSurroundingLogsId, stopLiveStreaming]
  );

  return (
    <>
      <LogsDeprecationCallout page="stream" />
      <WithLogTextviewUrlState />
      <WithFlyoutOptionsUrlState />
      <LogsToolbar />
      <EuiSpacer size="m" />
      <PageViewLogInContext />
      {isFlyoutOpen ? (
        <LogEntryFlyout
          logEntryId={flyoutLogEntryId}
          onCloseFlyout={closeLogEntryFlyout}
          onSetFieldFilter={setFilter}
          logViewReference={logViewReference}
        />
      ) : null}
      <PageContent
        key={`${
          logViewReference.type === 'log-view-reference'
            ? logViewReference.logViewId
            : logViewReference.id
        }-${logView?.version}`}
      >
        <ScrollableLogTextStreamView
          columnConfigurations={(resolvedLogView && resolvedLogView.columns) || []}
          hasMoreAfterEnd={hasMoreAfterEnd}
          hasMoreBeforeStart={hasMoreBeforeStart}
          isLoadingMore={isLoadingMore}
          isReloading={isReloading}
          isStreaming={isStreaming}
          items={items}
          jumpToTarget={jumpToTargetPosition}
          lastLoadedTime={lastLoadedTime}
          reloadItems={fetchEntries}
          reportVisibleInterval={handlePagination}
          scale={textScale}
          target={targetPosition}
          wrap={textWrap}
          onOpenLogEntryFlyout={openLogEntryFlyout}
          setContextEntry={setContextEntry}
          highlightedItem={surroundingLogsId ? surroundingLogsId : null}
          currentHighlightKey={currentHighlightKey}
          startDateExpression={startDateExpression}
          endDateExpression={endDateExpression}
          updateDateRange={handleDateRangeExtension}
          startLiveStreaming={startLiveStreaming}
        />

        <AutoSizer content bounds detectAnyWindowResize="height">
          {({ measureRef, bounds: { height = 0 }, content: { width = 0 } }) => {
            return (
              <LogPageMinimapColumn ref={measureRef}>
                <WithSummaryAndQuery>
                  {({ buckets, start, end }) => (
                    <LogMinimap
                      start={start}
                      end={end}
                      height={height}
                      width={width}
                      highlightedInterval={isReloading ? null : visibleTimeInterval}
                      jumpToTarget={jumpToTargetPosition}
                      summaryBuckets={buckets}
                      summaryHighlightBuckets={
                        logSummaryHighlights.length > 0 ? logSummaryHighlights[0].buckets : []
                      }
                      target={visibleMidpointTime}
                    />
                  )}
                </WithSummaryAndQuery>
              </LogPageMinimapColumn>
            );
          }}
        </AutoSizer>
      </PageContent>
    </>
  );
});

const WithSummaryAndQuery = (props: Omit<WithSummaryProps, 'serializedParsedQuery'>) => {
  const serializedParsedQuery = useSelector(useLogStreamPageStateContext(), (logStreamPageState) =>
    logStreamPageState.matches({ hasLogViewIndices: 'initialized' })
      ? stringify(logStreamPageState.context.parsedQuery)
      : null
  );

  return <WithSummary serializedParsedQuery={serializedParsedQuery} {...props} />;
};

type InitializedLogStreamPageState = MatchedStateFromActor<
  LogStreamPageActorRef,
  { hasLogViewIndices: 'initialized' }
>;

export const StreamPageLogsContentForState = React.memo<{
  logStreamPageState: InitializedLogStreamPageState;
  logStreamPageCallbacks: LogStreamPageCallbacks;
}>(({ logStreamPageState, logStreamPageCallbacks }) => {
  const {
    context: { parsedQuery },
  } = logStreamPageState;

  return (
    <StreamPageLogsContent
      filterQuery={parsedQuery}
      logStreamPageCallbacks={logStreamPageCallbacks}
    />
  );
});

const LogPageMinimapColumn = styled.div`
  flex: 1 0 0%;
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
`;

const createLogEntryStreamItem = (
  logEntry: LogEntry,
  highlights: LogEntry[]
): LogEntryStreamItem => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
  highlights,
});
