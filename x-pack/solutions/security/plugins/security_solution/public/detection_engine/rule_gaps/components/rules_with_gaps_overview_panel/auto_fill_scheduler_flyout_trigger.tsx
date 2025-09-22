/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiSuperDatePicker,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
} from '@elastic/eui';
import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import * as i18n from './translations';
import {
  useGetGapAutoFillScheduler,
  useGetGapAutoFillSchedulerLogs,
} from '../../api/hooks/use_gap_auto_fill_scheduler';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';

export const AutoFillSchedulerFlyoutTrigger = () => {
  const { data: scheduler } = useGetGapAutoFillScheduler();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: 'now-24h',
    end: 'now',
  });
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [isPaused, setIsPaused] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatuses, setSelectedStatuses] = useState<
    Array<'success' | 'error' | 'warning' | 'skipped'>
  >(['success', 'error', 'warning']);

  const {
    data: logsData,
    isFetching: isLogsLoading,
    refetch,
  } = useGetGapAutoFillSchedulerLogs({
    page: pageIndex + 1,
    perPage: pageSize,
    start: dateRange.start,
    end: dateRange.end,
    filter:
      selectedStatuses.length > 0
        ? `kibana.auto_gap_fill.execution.status:(${selectedStatuses.join(' OR ')})`
        : undefined,
  });

  type SchedulerLog = GapAutoFillSchedulerLogsResponseBodyV1['data'][number];
  const [expandedRowMap, setExpandedRowMap] = useState<Record<string, JSX.Element>>({});

  const enabled = scheduler?.enabled;
  const color = enabled ? 'success' : 'hollow';
  const iconType = enabled ? 'checkInCircleFilled' : 'minusInCircle';

  const onBadgeClick = () => setIsFlyoutOpen(true);
  const onClose = () => setIsFlyoutOpen(false);

  const columns = useMemo(
    () => [
      {
        name: '',
        width: '40px',
        isExpander: true,
        render: (item: SchedulerLog) => (
          <EuiButtonIcon
            onClick={() => {
              const id = item.timestamp;
              const next = { ...expandedRowMap } as Record<string, JSX.Element>;
              if (next[id]) {
                delete next[id];
              } else {
                next[id] = (
                  <EuiPanel color="subdued">
                    <EuiText size="s">{item.message}</EuiText>
                  </EuiPanel>
                );
              }
              setExpandedRowMap(next);
            }}
            aria-label={
              expandedRowMap[item.timestamp] ? i18n.COLLAPSE_ARIA_LABEL : i18n.EXPAND_ARIA_LABEL
            }
            iconType={expandedRowMap[item.timestamp] ? 'arrowDown' : 'arrowRight'}
          />
        ),
      },
      { field: 'timestamp', name: i18n.RUN_TIME_COLUMN },
      {
        name: i18n.GAPS_SCHEDULED_COLUMN,
        render: (item: SchedulerLog) => item.summary?.total_gaps_processed ?? 0,
      },
      {
        name: i18n.RULES_PROCESSED_COLUMN,
        render: (item: SchedulerLog) => item.summary?.total_rules ?? 0,
      },
    ],
    [expandedRowMap]
  );

  return (
    <>
      <EuiBadge
        color={color}
        iconType={iconType}
        onClick={onBadgeClick}
        onClickAriaLabel={enabled ? i18n.AUTO_FILL_ON_LABEL : i18n.AUTO_FILL_OFF_LABEL}
        style={{ display: 'inline-flex', width: 'auto' }}
      >
        {enabled ? i18n.AUTO_FILL_ON_LABEL : i18n.AUTO_FILL_OFF_LABEL}
      </EuiBadge>
      {isFlyoutOpen && (
        <EuiFlyout ownFocus onClose={onClose} size="l" aria-labelledby="gapFillTracker">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="gapFillTracker">{i18n.GAP_FILL_TRACKER_TITLE}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiSuperDatePicker
                  start={dateRange.start}
                  end={dateRange.end}
                  onTimeChange={({ start, end }) => setDateRange({ start, end })}
                  onRefresh={() => refetch()}
                  isPaused={isPaused}
                  isLoading={isLogsLoading}
                  refreshInterval={refreshInterval}
                  onRefreshChange={({ isPaused: paused, refreshInterval: interval }) => {
                    setIsPaused(paused);
                    setRefreshInterval(interval);
                  }}
                  width="full"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder>
              <EuiFlexGroup gutterSize="l">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <b>{i18n.AUTO_FILL_GAP_STATUS_TITLE}</b>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiBadge
                    color={color}
                    iconType={iconType}
                    style={{ display: 'inline-flex', width: 'auto' }}
                  >
                    {enabled ? i18n.AUTO_FILL_ON_LABEL : i18n.AUTO_FILL_OFF_LABEL}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div
                    style={{ borderLeft: '1px solid var(--euiBorderColor)', height: '100%' }}
                    aria-hidden
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <b>{i18n.SCHEDULER_RUN_TITLE}</b>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiBadge
                    color="hollow"
                    iconType="controlsHorizontal"
                    style={{ display: 'inline-flex', width: 'auto' }}
                  >
                    {scheduler?.schedule?.interval ?? '—'}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{i18n.SCHEDULER_LOGS_TITLE}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFilterGroup>
                    <MultiselectFilter
                      data-test-subj="gap-auto-fill-logs-status-filter"
                      title={i18n.STATUS_FILTER_TITLE}
                      items={['success', 'error', 'warning', 'skipped']}
                      selectedItems={selectedStatuses}
                      onSelectionChange={(
                        items: Array<'success' | 'error' | 'warning' | 'skipped'>
                      ) => setSelectedStatuses(items)}
                      renderItem={(s: string) => s}
                      width={200}
                    />
                  </EuiFilterGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText color="subdued" size="s">
                <p>{i18n.SCHEDULER_LOGS_FILTER_NOTE}</p>
              </EuiText>
              <EuiBasicTable
                loading={isLogsLoading}
                items={logsData?.data ?? []}
                itemId="timestamp"
                columns={[
                  {
                    name: '',
                    width: '40px',
                    align: 'right',
                    isExpander: true,
                    render: (item: SchedulerLog) => (
                      <EuiButtonIcon
                        onClick={() => {
                          const id = item.timestamp;
                          const next = { ...expandedRowMap } as Record<string, JSX.Element>;
                          if (next[id]) {
                            delete next[id];
                          } else {
                            next[id] = (
                              <EuiPanel color="subdued">
                                <EuiText size="s">{item.message}</EuiText>
                              </EuiPanel>
                            );
                          }
                          setExpandedRowMap(next);
                        }}
                        aria-label={
                          expandedRowMap[item.timestamp]
                            ? i18n.COLLAPSE_ARIA_LABEL
                            : i18n.EXPAND_ARIA_LABEL
                        }
                        iconType={expandedRowMap[item.timestamp] ? 'arrowDown' : 'arrowRight'}
                      />
                    ),
                  },
                  { field: 'timestamp', name: i18n.RUN_TIME_COLUMN },
                  {
                    field: 'status',
                    name: i18n.LOGS_STATUS_COLUMN,
                    render: (status: SchedulerLog['status']) => {
                      const badgeColor =
                        status === 'success'
                          ? 'success'
                          : status === 'warning'
                          ? 'warning'
                          : status === 'skipped'
                          ? 'hollow'
                          : 'danger';
                      return <EuiBadge color={badgeColor}>{status}</EuiBadge>;
                    },
                  },
                  {
                    name: i18n.GAPS_SCHEDULED_COLUMN,
                    render: (item: SchedulerLog) => item.summary?.total_gaps_processed ?? 0,
                  },
                  {
                    name: i18n.RULES_PROCESSED_COLUMN,
                    render: (item: SchedulerLog) => item.summary?.total_rules ?? 0,
                  },
                ] as Array<Record<string, unknown>>}
                pagination={{
                  pageIndex,
                  pageSize,
                  totalItemCount: logsData?.total ?? 0,
                  pageSizeOptions: [10, 25, 50],
                }}
                onChange={({ page }: { page?: { index: number; size: number } }) => {
                  if (page) {
                    setPageIndex(page.index);
                    setPageSize(page.size);
                  }
                }}
                itemIdToExpandedRowMap={expandedRowMap}
                isExpandable
                rowProps={(item: SchedulerLog) => ({
                  'data-test-subj': `gapFillLogRow-${item.timestamp}`,
                })}
              />
            </EuiPanel>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
