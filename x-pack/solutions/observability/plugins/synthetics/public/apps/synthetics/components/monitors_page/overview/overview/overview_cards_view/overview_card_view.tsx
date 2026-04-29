/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiAutoSize, EuiAutoSizer, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import InfiniteLoader from 'react-window-infinite-loader';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CardsViewFooter } from './cards_view_footer';
import type { FlyoutParamProps } from '../types';
import { METRIC_ITEM_HEIGHT, MetricItem } from '../metric_item/metric_item';
import { OverviewLoader } from '../overview_loader';
import { GridItemsByGroup } from '../grid_by_group/grid_items_by_group';
import {
  selectOverviewGroupBy,
  selectOverviewTrends,
  selectOverviewView,
} from '../../../../../state';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { useInfiniteOverviewTrendsRequests } from '../../../hooks/use_infinite_overview_trends_requests';

const ITEM_HEIGHT = METRIC_ITEM_HEIGHT + 12;
const MAX_LIST_HEIGHT = 800;
const MIN_CARD_WIDTH = 400;

const MIN_BATCH_SIZE = 20;
const LIST_THRESHOLD = 12;

interface ListItem {
  configId: string;
  locations: Array<{ id: string }>;
}

const UnGroupedCardView = ({
  monitorsSortedByStatus,
  setFlyoutConfigCallback,
  loaded,
}: {
  monitorsSortedByStatus: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
  loaded: boolean;
}) => {
  const trendData = useSelector(selectOverviewTrends);
  const [rowCount, setRowCount] = useState(5);
  const [sliceToFetch, setSliceToFetch] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rowCountRef = useRef(rowCount);

  useInfiniteOverviewTrendsRequests({
    monitorsSortedByStatus,
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

  const listHeight = Math.min(
    ITEM_HEIGHT * Math.ceil(monitorsSortedByStatus.length / rowCount),
    MAX_LIST_HEIGHT
  );

  const listItems: ListItem[][] = useMemo(() => {
    const acc: ListItem[][] = [];
    for (let i = 0; i < monitorsSortedByStatus.length; i += rowCount) {
      acc.push(monitorsSortedByStatus.slice(i, i + rowCount));
    }
    return acc;
  }, [monitorsSortedByStatus, rowCount]);

  return (
    <>
      <div style={{ height: listHeight }}>
        {loaded && monitorsSortedByStatus.length ? (
          <EuiAutoSizer>
            {({ width }: EuiAutoSize) => (
              <InfiniteLoader
                isItemLoaded={(idx: number) =>
                  listItems[idx].every((m) => !!trendData[m.configId + (m.locations[0]?.id ?? '')])
                }
                itemCount={listItems.length}
                loadMoreItems={(start, stop: number) =>
                  setSliceToFetch({ startIndex: start, endIndex: stop })
                }
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
                                key={listIndex * rowCount + idx}
                              >
                                <MetricItem
                                  monitor={monitorsSortedByStatus[listIndex * rowCount + idx]}
                                  onClick={setFlyoutConfigCallback}
                                />
                              </EuiFlexItem>
                            ))}
                            {listData[listIndex].length % rowCount !== 0 &&
                              Array.from({
                                length: rowCount - listData[listIndex].length,
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
