/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, memo, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import InfiniteLoader from 'react-window-infinite-loader';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiAutoSizer, EuiAutoSize } from '@elastic/eui';
import { ShowAllSpaces } from '../../common/show_all_spaces';
import { OverviewStatusMetaData } from '../../../../../../../common/runtime_types';
import { quietFetchOverviewStatusAction } from '../../../../state/overview_status';
import type { TrendRequest } from '../../../../../../../common/types';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../../../../../embeddables/constants';
import { AddToDashboard } from '../../../common/components/add_to_dashboard';
import { useOverviewStatus } from '../../hooks/use_overview_status';
import { GridItemsByGroup } from './grid_by_group/grid_items_by_group';
import { GroupFields } from './grid_by_group/group_fields';
import { selectOverviewState, setFlyoutConfig } from '../../../../state/overview';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';
import {
  refreshOverviewTrends,
  selectOverviewTrends,
  trendStatsBatch,
} from '../../../../state/overview';
import { OverviewLoader } from './overview_loader';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { SortFields } from './sort_fields';
import { NoMonitorsFound } from '../../common/no_monitors_found';
import { MonitorDetailFlyout } from './monitor_detail_flyout';
import { useSyntheticsRefreshContext } from '../../../../contexts';
import { MetricItem } from './metric_item';
import { FlyoutParamProps } from './types';

const ITEM_HEIGHT = 172;
const ROW_COUNT = 4;
const MAX_LIST_HEIGHT = 800;
const MIN_BATCH_SIZE = 20;
const LIST_THRESHOLD = 12;

interface ListItem {
  configId: string;
  locationId: string;
}

export const OverviewGrid = memo(() => {
  const { status, allConfigs, loaded } = useOverviewStatus({
    scopeStatusByLocation: true,
  });
  const monitorsSortedByStatus: OverviewStatusMetaData[] = useMonitorsSortedByStatus();

  const {
    flyoutConfig,
    pageState,
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const trendData = useSelector(selectOverviewTrends);
  const { perPage } = pageState;

  const [maxItem, setMaxItem] = useState(0);

  const dispatch = useDispatch();

  const setFlyoutConfigCallback = useCallback(
    (params: FlyoutParamProps) => dispatch(setFlyoutConfig(params)),
    [dispatch]
  );
  const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
  const { lastRefresh } = useSyntheticsRefreshContext();
  const forceRefreshCallback = useCallback(
    () => dispatch(quietFetchOverviewStatusAction.get({ pageState })),
    [dispatch, pageState]
  );

  useEffect(() => {
    if (monitorsSortedByStatus.length) {
      const batch: TrendRequest[] = [];
      const chunk = monitorsSortedByStatus.slice(0, (maxItem + 1) * ROW_COUNT);
      for (const item of chunk) {
        if (trendData[item.configId + item.locationId] === undefined) {
          batch.push({
            configId: item.configId,
            locationId: item.locationId,
            schedule: item.schedule,
          });
        }
      }
      if (batch.length) dispatch(trendStatsBatch.get(batch));
    }
  }, [dispatch, maxItem, monitorsSortedByStatus, trendData]);

  const listHeight = Math.min(
    ITEM_HEIGHT * Math.ceil(monitorsSortedByStatus.length / ROW_COUNT),
    MAX_LIST_HEIGHT
  );

  const listItems: ListItem[][] = useMemo(() => {
    const acc: ListItem[][] = [];
    for (let i = 0; i < monitorsSortedByStatus.length; i += ROW_COUNT) {
      acc.push(monitorsSortedByStatus.slice(i, i + ROW_COUNT));
    }
    return acc;
  }, [monitorsSortedByStatus]);

  useEffect(() => {
    dispatch(refreshOverviewTrends.get());
  }, [dispatch, lastRefresh]);

  // Display no monitors found when down, up, or disabled filter produces no results
  if (status && !monitorsSortedByStatus.length && loaded) {
    return <NoMonitorsFound />;
  }

  return (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        wrap={true}
      >
        <EuiFlexItem grow={true}>
          <OverviewPaginationInfo total={status ? monitorsSortedByStatus.length : undefined} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ShowAllSpaces />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <AddToDashboard type={SYNTHETICS_MONITORS_EMBEDDABLE} asButton />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SortFields />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupFields />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div style={{ height: listHeight }}>
        {groupField === 'none' ? (
          loaded && monitorsSortedByStatus.length ? (
            <EuiAutoSizer>
              {({ width }: EuiAutoSize) => (
                <>
                  <InfiniteLoader
                    isItemLoaded={(idx: number) =>
                      listItems[idx].every((m) => !!trendData[m.configId + m.locationId])
                    }
                    itemCount={listItems.length}
                    loadMoreItems={(_, stop: number) => setMaxItem(Math.max(maxItem, stop))}
                    minimumBatchSize={MIN_BATCH_SIZE}
                    threshold={LIST_THRESHOLD}
                  >
                    {({ onItemsRendered, ref }) => {
                      return (
                        <FixedSizeList
                          // pad computed height to avoid clipping last row's drop shadow
                          height={listHeight + 16}
                          width={width}
                          onItemsRendered={onItemsRendered}
                          itemSize={ITEM_HEIGHT}
                          itemCount={listItems.length}
                          itemData={listItems}
                          ref={ref}
                        >
                          {({
                            index: listIndex,
                            style,
                            data: listData,
                          }: React.PropsWithChildren<ListChildComponentProps<ListItem[][]>>) => {
                            return (
                              <>
                                <EuiFlexGroup
                                  data-test-subj={`overview-grid-row-${listIndex}`}
                                  gutterSize="m"
                                  style={{ ...style }}
                                >
                                  {listData[listIndex].map((_, idx) => (
                                    <EuiFlexItem
                                      data-test-subj="syntheticsOverviewGridItem"
                                      key={listIndex * ROW_COUNT + idx}
                                    >
                                      <MetricItem
                                        monitor={
                                          monitorsSortedByStatus[listIndex * ROW_COUNT + idx]
                                        }
                                        onClick={setFlyoutConfigCallback}
                                      />
                                    </EuiFlexItem>
                                  ))}
                                  {listData[listIndex].length % ROW_COUNT !== 0 &&
                                    // Adds empty items to fill out row
                                    Array.from({
                                      length: ROW_COUNT - listData[listIndex].length,
                                    }).map((_, idx) => <EuiFlexItem key={idx} />)}
                                </EuiFlexGroup>
                                {/* <GridScrollFooter*/}
                                {/*  monitorsSortedByStatus={monitorsSortedByStatus}*/}
                                {/*  totalConfigs={allConfigs.length}*/}
                                {/*  perPage={perPage}*/}
                                {/*  loaded={loaded}*/}
                                {/*  groupField={groupField}*/}
                                {/* />*/}
                              </>
                            );
                          }}
                        </FixedSizeList>
                      );
                    }}
                  </InfiniteLoader>
                </>
              )}
            </EuiAutoSizer>
          ) : (
            <OverviewLoader />
          )
        ) : (
          <GridItemsByGroup setFlyoutConfigCallback={setFlyoutConfigCallback} />
        )}
        <EuiSpacer size="m" />
      </div>

      {flyoutConfig?.configId && flyoutConfig?.location && (
        <MonitorDetailFlyout
          configId={flyoutConfig.configId}
          id={flyoutConfig.id}
          location={flyoutConfig.location}
          locationId={flyoutConfig.locationId}
          spaceId={flyoutConfig.spaceId}
          onClose={hideFlyout}
          onEnabledChange={forceRefreshCallback}
          onLocationChange={setFlyoutConfigCallback}
        />
      )}
    </>
  );
});
