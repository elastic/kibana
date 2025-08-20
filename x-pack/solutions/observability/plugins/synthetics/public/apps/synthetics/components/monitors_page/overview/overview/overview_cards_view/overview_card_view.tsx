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
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import InfiniteLoader from 'react-window-infinite-loader';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CardsViewFooter } from './cards_view_footer';
import type { FlyoutParamProps } from '../types';
import { useOverviewStatus } from '../../../hooks/use_overview_status';
import { MetricItem } from '../metric_item/metric_item';
import { OverviewLoader } from '../overview_loader';
import { GridItemsByGroup } from '../grid_by_group/grid_items_by_group';
import { selectOverviewState, selectOverviewTrends } from '../../../../../state';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

const ITEM_HEIGHT = 182;
export const OVERVIEW_ROW_COUNT = 4;
const MAX_LIST_HEIGHT = 800;
const MIN_BATCH_SIZE = 20;
const LIST_THRESHOLD = 12;

interface ListItem {
  configId: string;
  locationId: string;
}

export const OverviewCardView = ({
  monitorsSortedByStatus,
  maxItem,
  setMaxItem,
  setFlyoutConfigCallback,
}: {
  monitorsSortedByStatus: OverviewStatusMetaData[];
  maxItem: number;
  setMaxItem: (maxItem: number) => void;
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const {
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const isUnGrouped = groupField === 'none';
  const trendData = useSelector(selectOverviewTrends);
  const { view } = useSelector(selectOverviewState);

  const [currentIndex, setCurrentIndex] = useState(0);

  const { loaded, loading } = useOverviewStatus({
    scopeStatusByLocation: true,
  });

  const listHeight = Math.min(
    ITEM_HEIGHT * Math.ceil(monitorsSortedByStatus.length / OVERVIEW_ROW_COUNT),
    MAX_LIST_HEIGHT
  );

  const listItems: ListItem[][] = useMemo(() => {
    const acc: ListItem[][] = [];
    for (let i = 0; i < monitorsSortedByStatus.length; i += OVERVIEW_ROW_COUNT) {
      acc.push(monitorsSortedByStatus.slice(i, i + OVERVIEW_ROW_COUNT));
    }
    return acc;
  }, [monitorsSortedByStatus]);

  return (
    <>
      <div style={isUnGrouped ? { height: listHeight } : undefined}>
        {loading && loaded ? <EuiProgress size="xs" color="accent" /> : <EuiSpacer size="xs" />}
        {isUnGrouped ? (
          loaded && monitorsSortedByStatus.length ? (
            <EuiAutoSizer>
              {({ width }: EuiAutoSize) => (
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
                          setCurrentIndex(listIndex);
                          return (
                            <EuiFlexGroup
                              data-test-subj={`overview-grid-row-${listIndex}`}
                              gutterSize="m"
                              css={{ ...style, marginLeft: 5 }}
                            >
                              {listData[listIndex].map((_, idx) => (
                                <EuiFlexItem
                                  data-test-subj="syntheticsOverviewGridItem"
                                  key={listIndex * OVERVIEW_ROW_COUNT + idx}
                                >
                                  <MetricItem
                                    monitor={
                                      monitorsSortedByStatus[listIndex * OVERVIEW_ROW_COUNT + idx]
                                    }
                                    onClick={setFlyoutConfigCallback}
                                  />
                                </EuiFlexItem>
                              ))}
                              {listData[listIndex].length % OVERVIEW_ROW_COUNT !== 0 &&
                                // Adds empty items to fill out row
                                Array.from({
                                  length: OVERVIEW_ROW_COUNT - listData[listIndex].length,
                                }).map((_, idx) => <EuiFlexItem key={idx} />)}
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
          )
        ) : (
          <GridItemsByGroup setFlyoutConfigCallback={setFlyoutConfigCallback} view={view} />
        )}
        <EuiSpacer size="m" />
      </div>
      <CardsViewFooter
        monitorsSortedByStatus={monitorsSortedByStatus}
        currentIndex={currentIndex}
      />
    </>
  );
};
