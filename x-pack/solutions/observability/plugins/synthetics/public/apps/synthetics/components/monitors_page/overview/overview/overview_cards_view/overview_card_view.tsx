/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiAutoSize, EuiAutoSizer, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { InfiniteLoader } from 'react-window-infinite-loader';
import { List, type RowComponentProps } from 'react-window';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CardsViewFooter } from './cards_view_footer';
import type { FlyoutParamProps } from '../types';
import { useOverviewStatus } from '../../../hooks/use_overview_status';
import { METRIC_ITEM_HEIGHT, MetricItem } from '../metric_item/metric_item';
import { OverviewLoader } from '../overview_loader';
import { GridItemsByGroup } from '../grid_by_group/grid_items_by_group';
import { selectOverviewState, selectOverviewTrends } from '../../../../../state';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

const ITEM_HEIGHT = METRIC_ITEM_HEIGHT + 12;
const MAX_LIST_HEIGHT = 800;
const MIN_BATCH_SIZE = 20;
const LIST_THRESHOLD = 12;
const MIN_CARD_WIDTH = 400;

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
  const [rowCount, setRowCount] = useState(5);

  const [currentIndex, setCurrentIndex] = useState(0);

  const { loaded } = useOverviewStatus({
    scopeStatusByLocation: true,
  });

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
      <div style={isUnGrouped ? { height: listHeight } : undefined}>
        {isUnGrouped ? (
          loaded && monitorsSortedByStatus.length ? (
            <EuiAutoSizer>
              {({ width }: EuiAutoSize) => (
                <InfiniteLoader
                  /*
                  isItemLoaded={(idx: number) =>
                    listItems[idx].every((m) => !!trendData[m.configId + m.locationId])
                  }
                    */
                  itemCount={listItems.length}
                  loadMoreRows={(_, stop: number) => setMaxItem(Math.max(maxItem, stop))}
                  minimumBatchSize={MIN_BATCH_SIZE}
                  threshold={LIST_THRESHOLD}
                >
                  {({ onRowsRendered, ref }) => {
                    // set min row count to based on width to ensure cards are not too small
                    // min is 1 and max is 5
                    setRowCount(Math.max(1, Math.min(5, Math.floor(width / MIN_CARD_WIDTH))));

                    interface RowProps {
                      listData: ListItem[][];
                    }

                    function Row({ index, style, listData }: RowComponentProps<RowProps>) {
                      // setCurrentIndex(listIndex);
                      return (
                        <EuiFlexGroup
                          data-test-subj={`overview-grid-row-${index}`}
                          gutterSize="m"
                          css={{ ...style, marginLeft: 5 }}
                        >
                          {listData[index].map((_, idx) => (
                            <EuiFlexItem
                              data-test-subj="syntheticsOverviewGridItem"
                              key={index * rowCount + idx}
                            >
                              <MetricItem
                                monitor={monitorsSortedByStatus[index * rowCount + idx]}
                                onClick={setFlyoutConfigCallback}
                              />
                            </EuiFlexItem>
                          ))}
                          {listData[index].length % rowCount !== 0 &&
                            // Adds empty items to fill out row
                            Array.from({
                              length: rowCount - listData[index].length,
                            }).map((_, idx) => <EuiFlexItem key={idx} />)}
                        </EuiFlexGroup>
                      );
                    }

                    return (
                      <List<RowProps>
                        rowComponent={Row}
                        // pad computed height to avoid clipping last row's drop shadow
                        style={{ height: listHeight + 16, width }}
                        onRowsRendered={onRowsRendered}
                        rowHeight={ITEM_HEIGHT}
                        rowCount={listItems.length}
                        rowProps={{ listData: listItems }}
                        listRef={ref}
                      />
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
