/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EuiAutoSize,
  EuiAutoSizer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import InfiniteLoader from 'react-window-infinite-loader';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { CardsViewFooter } from './cards_view_footer';
import type { FlyoutParamProps } from '../types';
import { METRIC_ITEM_HEIGHT, MetricItem } from '../metric_item/metric_item';
import { OverviewLoader } from '../overview_loader';
import { GridItemsByGroup } from '../grid_by_group/grid_items_by_group';
import {
  selectOverviewGroupBy,
  selectOverviewPageState,
  selectOverviewTrends,
  selectOverviewView,
} from '../../../../../state';
import { appendOverviewStatusAction } from '../../../../../state/overview_status';
import { getNextOverviewAppendPage } from '../../../../../state/overview_status/window_refresh';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { useInfiniteOverviewTrendsRequests } from '../../../hooks/use_infinite_overview_trends_requests';
import { useOverviewStatusState } from '../../../hooks/use_overview_status';

const ITEM_HEIGHT = METRIC_ITEM_HEIGHT + 12;
const MAX_LIST_HEIGHT = 800;
const MIN_CARD_WIDTH = 400;

const MIN_BATCH_SIZE = 20;
const LIST_THRESHOLD = 12;

// Extra placeholder rows rendered past the loaded ones while more monitors are
// still available. They give `InfiniteLoader` (with `LIST_THRESHOLD`) something
// unloaded to aim at ahead of the viewport, so the next page is prefetched
// before the user reaches the bottom.
const PREFETCH_ROWS = 4;

/**
 * The server paginates by monitor, but a card is rendered per location. Split
 * multi-location monitors into one entry per location (matching the shape the
 * non-paginated path produces via `formatStatus`) so each location gets its own
 * card and its own trend sparkline. Single-location monitors pass through
 * untouched, which also makes this a no-op for the already-split legacy path.
 */
const expandByLocation = (monitors: OverviewStatusMetaData[]): OverviewStatusMetaData[] => {
  const expanded: OverviewStatusMetaData[] = [];
  for (const monitor of monitors) {
    if ((monitor.locations?.length ?? 0) <= 1) {
      expanded.push(monitor);
      continue;
    }
    for (const location of monitor.locations) {
      expanded.push({ ...monitor, overallStatus: location.status, locations: [location] });
    }
  }
  return expanded;
};

const MetricItemPlaceholder = () => (
  <EuiPanel hasShadow={false} hasBorder={true} style={{ height: METRIC_ITEM_HEIGHT }}>
    <EuiFlexGroup css={{ height: '100%' }} alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingChart />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const UnGroupedCardView = ({
  monitorsSortedByStatus,
  setFlyoutConfigCallback,
  loaded,
}: {
  monitorsSortedByStatus: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
  loaded: boolean;
}) => {
  const dispatch = useDispatch();
  const trendData = useSelector(selectOverviewTrends);
  const pageState = useSelector(selectOverviewPageState);
  const perPage = pageState.perPage ?? 20;
  const { total, allConfigs, loading, lastRequest, refreshThrough, fillThrough } =
    useOverviewStatusState();
  const [rowCount, setRowCount] = useState(5);
  const [sliceToFetch, setSliceToFetch] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rowCountRef = useRef(rowCount);

  // Per-location cards for the monitors currently loaded from the server.
  const expandedItems = useMemo(
    () => expandByLocation(monitorsSortedByStatus),
    [monitorsSortedByStatus]
  );

  // Pagination is driven by monitor count (what the server pages on), not the
  // expanded card count. `total` is the server-side total for the active filter.
  const loadedMonitors = allConfigs.length;
  const hasMore = typeof total === 'number' && loadedMonitors < total;

  useInfiniteOverviewTrendsRequests({
    monitorsSortedByStatus: expandedItems,
    sliceToFetch,
    numOfColumns: rowCount,
  });

  const updateRowCount = useCallback((width: number) => {
    const newCount = Math.max(1, Math.min(5, Math.floor(width / MIN_CARD_WIDTH)));
    if (newCount !== rowCountRef.current) {
      rowCountRef.current = newCount;
      setRowCount(newCount);
    }
  }, []);

  // Read the latest values from a ref so the scroll callback below never closes
  // over a stale window and never over-fetches during a burst of scroll events.
  const loadMoreRef = useRef({
    hasMore,
    loading,
    loadedMonitors,
    perPage,
    total,
    pageState,
    lastRequest,
    refreshThrough,
    fillThrough,
  });
  loadMoreRef.current = {
    hasMore,
    loading,
    loadedMonitors,
    perPage,
    total,
    pageState,
    lastRequest,
    refreshThrough,
    fillThrough,
  };

  const loadMoreMonitors = useCallback(() => {
    const s = loadMoreRef.current;
    if (!s.hasMore || s.loading || s.refreshThrough || s.fillThrough) {
      return;
    }
    const nextPage = getNextOverviewAppendPage(s.loadedMonitors, s.perPage, s.total ?? 0);
    if (nextPage == null) {
      return;
    }
    dispatch(
      appendOverviewStatusAction.get({
        pageState: { ...s.pageState, page: nextPage, perPage: s.perPage },
        scopeStatusByLocation: s.lastRequest?.scopeStatusByLocation,
        statusFilter: s.lastRequest?.statusFilter,
      })
    );
  }, [dispatch]);

  const listItems: OverviewStatusMetaData[][] = useMemo(() => {
    const acc: OverviewStatusMetaData[][] = [];
    for (let i = 0; i < expandedItems.length; i += rowCount) {
      acc.push(expandedItems.slice(i, i + rowCount));
    }
    return acc;
  }, [expandedItems, rowCount]);

  const loadedRows = listItems.length;
  // Append sentinel rows so the loader has an unloaded region to prefetch into.
  const itemCount = hasMore ? loadedRows + PREFETCH_ROWS : loadedRows;
  const listHeight = Math.min(ITEM_HEIGHT * itemCount, MAX_LIST_HEIGHT);

  return (
    <>
      <div style={{ height: listHeight, paddingLeft: 5 }}>
        {loaded && expandedItems.length ? (
          <EuiAutoSizer>
            {({ width }: EuiAutoSize) => (
              <InfiniteLoader
                isItemLoaded={(idx: number) =>
                  idx < loadedRows &&
                  listItems[idx].every((m) => !!trendData[m.configId + (m.locations[0]?.id ?? '')])
                }
                itemCount={itemCount}
                loadMoreItems={(start, stop: number) => {
                  const clampedStop = Math.min(stop, loadedRows - 1);
                  if (loadedRows > 0 && clampedStop >= start) {
                    setSliceToFetch({ startIndex: start, endIndex: clampedStop });
                  }
                  // Nearing the loaded rows means the sentinel region is in view:
                  // pull the next page of monitors from the server.
                  if (stop >= loadedRows - 1) {
                    loadMoreMonitors();
                  }
                }}
                minimumBatchSize={MIN_BATCH_SIZE}
                threshold={LIST_THRESHOLD}
              >
                {({ onItemsRendered, ref }) => {
                  updateRowCount(width);

                  return (
                    <FixedSizeList
                      height={listHeight + 16}
                      width={width}
                      onItemsRendered={onItemsRendered}
                      itemSize={ITEM_HEIGHT}
                      itemCount={itemCount}
                      itemData={listItems}
                      ref={ref}
                    >
                      {({
                        index: listIndex,
                        style,
                        data: listData,
                      }: React.PropsWithChildren<
                        ListChildComponentProps<OverviewStatusMetaData[][]>
                      >) => {
                        const row = listData[listIndex];
                        if (!row) {
                          return (
                            <EuiFlexGroup
                              data-test-subj={`overview-grid-row-${listIndex}-loading`}
                              gutterSize="m"
                              css={{ ...style }}
                            >
                              {Array.from({ length: rowCount }).map((_, idx) => (
                                <EuiFlexItem key={idx}>
                                  <MetricItemPlaceholder />
                                </EuiFlexItem>
                              ))}
                            </EuiFlexGroup>
                          );
                        }
                        setCurrentIndex(listIndex);
                        return (
                          <EuiFlexGroup
                            data-test-subj={`overview-grid-row-${listIndex}`}
                            gutterSize="m"
                            css={{ ...style }}
                          >
                            {row.map((monitor, idx) => (
                              <EuiFlexItem
                                data-test-subj="syntheticsOverviewGridItem"
                                key={listIndex * rowCount + idx}
                              >
                                <MetricItem monitor={monitor} onClick={setFlyoutConfigCallback} />
                              </EuiFlexItem>
                            ))}
                            {row.length % rowCount !== 0 &&
                              Array.from({
                                length: rowCount - row.length,
                              }).map((_, idx) => <EuiFlexItem key={`filler-${idx}`} />)}
                          </EuiFlexGroup>
                        );
                      }}
                    </FixedSizeList>
                  );
                }}
              </InfiniteLoader>
            )}
          </EuiAutoSizer>
        ) : (
          <OverviewLoader />
        )}
        <EuiSpacer size="m" />
      </div>
      <CardsViewFooter monitorsSortedByStatus={expandedItems} currentIndex={currentIndex} />
    </>
  );
};

export const OverviewCardView = ({
  monitorsSortedByStatus,
  setFlyoutConfigCallback,
  loaded,
}: {
  monitorsSortedByStatus: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
  loaded: boolean;
}) => {
  const { field: groupField } = useSelector(selectOverviewGroupBy);
  const view = useSelector(selectOverviewView);
  const isUnGrouped = groupField === 'none' || groupField === 'monitor';

  if (isUnGrouped) {
    return (
      <UnGroupedCardView
        monitorsSortedByStatus={monitorsSortedByStatus}
        setFlyoutConfigCallback={setFlyoutConfigCallback}
        loaded={loaded}
      />
    );
  }

  return (
    <>
      <GridItemsByGroup setFlyoutConfigCallback={setFlyoutConfigCallback} view={view} />
      <EuiSpacer size="m" />
    </>
  );
};
