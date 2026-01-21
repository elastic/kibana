/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiBasicTable,
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
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler';
import { GAP_AUTO_FILL_STATUS, type GapAutoFillStatus } from '@kbn/alerting-plugin/common';
import { CallOutSwitcher } from '../../../../common/components/callouts';
import { FormattedDate } from '../../../../common/components/formatted_date';
import * as i18n from './translations';
import {
  useGetGapAutoFillScheduler,
  useFindGapAutoFillSchedulerLogs,
} from '../../api/hooks/use_gap_auto_fill_scheduler';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';

type SchedulerLog = GapAutoFillSchedulerLogsResponseBodyV1['data'][number];

interface GapAutoFillLogsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export const getStatusTooltip = (logEntry: SchedulerLog): string => {
  const { status, message, results } = logEntry;
  if (!status) {
    return '';
  }

  const successCount = results?.filter((r) => r.status === 'success').length ?? 0;
  const messageLower = message?.toLowerCase() || '';

  switch (status) {
    case GAP_AUTO_FILL_STATUS.NO_GAPS:
      return i18n.GAP_AUTO_FILL_STATUS_NO_GAPS_TOOLTIP;

    case GAP_AUTO_FILL_STATUS.SUCCESS:
      return i18n.GAP_AUTO_FILL_STATUS_SUCCESS_TOOLTIP;

    case GAP_AUTO_FILL_STATUS.ERROR:
      if (messageLower.includes('error during execution')) {
        return i18n.GAP_AUTO_FILL_STATUS_ERROR_TASK_CRASH_TOOLTIP;
      }

      // Use results array to determine error type if available
      if (results && results.length > 0) {
        const errorCount = results.filter((r) => r.status === 'error').length;
        if (errorCount === results.length) {
          return i18n.GAP_AUTO_FILL_STATUS_ERROR_ALL_FAILED_TOOLTIP;
        } else if (successCount > 0) {
          return i18n.getGapAutoFillStatusErrorSomeSucceededTooltip(successCount);
        }
      }

      return i18n.GAP_AUTO_FILL_STATUS_ERROR_TOOLTIP;

    case GAP_AUTO_FILL_STATUS.SKIPPED:
      if (messageLower.includes('capacity limit reached')) {
        if (successCount > 0) {
          return i18n.getGapAutoFillStatusSkippedSomeSucceededTooltip(successCount);
        }

        return i18n.GAP_AUTO_FILL_STATUS_SKIPPED_NO_CAPACITY_TOOLTIP;
      }
      if (messageLower.includes("can't schedule gap fills for any enabled rule")) {
        return i18n.GAP_AUTO_FILL_STATUS_SKIPPED_RULES_DISABLED_TOOLTIP;
      }
      return i18n.GAP_AUTO_FILL_STATUS_SKIPPED_TOOLTIP;

    default:
      return '';
  }
};

const statuses: GapAutoFillStatus[] = [
  GAP_AUTO_FILL_STATUS.SUCCESS,
  GAP_AUTO_FILL_STATUS.ERROR,
  GAP_AUTO_FILL_STATUS.SKIPPED,
  GAP_AUTO_FILL_STATUS.NO_GAPS,
];

export const GapAutoFillLogsFlyout = ({ isOpen, onClose }: GapAutoFillLogsFlyoutProps) => {
  const { data: scheduler } = useGetGapAutoFillScheduler({ enabled: isOpen });
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    GAP_AUTO_FILL_STATUS.SUCCESS,
    GAP_AUTO_FILL_STATUS.ERROR,
  ]);

  const { data: logsData, isFetching: isLogsLoading } = useFindGapAutoFillSchedulerLogs({
    page: pageIndex + 1,
    perPage: pageSize,
    statuses: selectedStatuses,
    sortField: '@timestamp',
    sortDirection: 'desc',
    enabled: isOpen,
  });

  const [expandedRowMap, setExpandedRowMap] = useState<Record<string, JSX.Element>>({});

  const enabled = scheduler?.enabled;
  const color = enabled ? 'success' : 'hollow';
  const iconType = enabled ? 'checkInCircleFilled' : 'minusInCircle';

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return '';
    switch (status) {
      case GAP_AUTO_FILL_STATUS.NO_GAPS:
        return i18n.GAP_AUTO_FILL_STATUS_NO_GAPS;
      case GAP_AUTO_FILL_STATUS.SUCCESS:
        return i18n.GAP_AUTO_FILL_STATUS_SUCCESS;
      case GAP_AUTO_FILL_STATUS.ERROR:
        return i18n.GAP_AUTO_FILL_STATUS_ERROR;
      case GAP_AUTO_FILL_STATUS.SKIPPED:
        return i18n.GAP_AUTO_FILL_STATUS_SKIPPED;
      default:
        return status;
    }
  };

  const columns = useMemo(
    () => [
      {
        field: 'timestamp',
        width: '100%',
        name: i18n.GAP_AUTO_FILL_RUN_TIME_COLUMN,
        render: (timestamp: SchedulerLog['timestamp']) => {
          return <FormattedDate value={timestamp} fieldName={'timestamp'} />;
        },
      },
      {
        field: 'status',
        align: 'center',
        width: '150px',
        name: i18n.GAP_AUTO_FILL_LOGS_STATUS_COLUMN,
        render: (status: SchedulerLog['status'], item: SchedulerLog) => {
          let badgeColor: 'success' | 'hollow' | 'danger' | 'warning';

          switch (status) {
            case GAP_AUTO_FILL_STATUS.SUCCESS:
              badgeColor = 'success';
              break;
            case GAP_AUTO_FILL_STATUS.ERROR:
              badgeColor = 'danger';
              break;
            case GAP_AUTO_FILL_STATUS.SKIPPED:
              badgeColor = 'warning';
              break;
            case GAP_AUTO_FILL_STATUS.NO_GAPS:
            default:
              badgeColor = 'hollow';
          }

          const statusLabel = getStatusLabel(status);
          const statusTooltip = getStatusTooltip(item);

          return (
            <EuiToolTip content={statusTooltip} position="top">
              <EuiBadge color={badgeColor}>{statusLabel}</EuiBadge>
            </EuiToolTip>
          );
        },
      },
      {
        width: '120px',
        align: 'right',
        isExpander: true,
        render: (item: SchedulerLog) => {
          const itemIdToExpandedRowMapValues = { ...expandedRowMap };
          const isExpanded = itemIdToExpandedRowMapValues[item.id];

          const toggleViewLogs = () => {
            if (isExpanded) {
              delete itemIdToExpandedRowMapValues[item.id];
            } else {
              itemIdToExpandedRowMapValues[item.id] = (
                <>
                  <EuiText size="s">
                    <pre>{item.message}</pre>
                  </EuiText>
                </>
              );
            }
            setExpandedRowMap(itemIdToExpandedRowMapValues);
          };

          return (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiButtonEmpty size="s" color="primary" onClick={toggleViewLogs}>
                {i18n.GAP_AUTO_FILL_LOGS_VIEW_LOGS_BUTTON}
              </EuiButtonEmpty>
              <EuiButtonIcon
                onClick={toggleViewLogs}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
              />
            </EuiFlexGroup>
          );
        },
      },
    ],
    [expandedRowMap]
  );

  const handlePaginationChange = useCallback(
    ({ page }: { page?: { index: number; size: number } }) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
    },
    []
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <EuiFlyout
        ownFocus
        onClose={onClose}
        size="l"
        aria-labelledby="gapAutoFillLogs"
        data-test-subj="gap-auto-fill-logs"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="gapAutoFillLogs">{i18n.GAP_AUTO_FILL_LOGS_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiPanel hasBorder>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
                  <EuiText>
                    <b>{i18n.GAP_AUTO_FILL_STATUS_PANEL_TITLE}</b>
                  </EuiText>

                  <EuiBadge color={color} iconType={iconType}>
                    {enabled ? i18n.GAP_AUTO_FILL_ON_LABEL : i18n.GAP_AUTO_FILL_OFF_LABEL}
                  </EuiBadge>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
                  <EuiText>
                    <b>{i18n.GAP_AUTO_FILL_SCHEDULE_PANEL_TITLE}</b>
                  </EuiText>
                  <EuiBadge iconType="clockCounter" color="hollow">
                    <FormattedMessage
                      id="xpack.securitySolution.gapAutoFillLogs.runsEveryLabel"
                      defaultMessage="Runs every {interval}"
                      values={{
                        interval: scheduler?.schedule?.interval ?? '—',
                      }}
                    />
                  </EuiBadge>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="m" />
          <CallOutSwitcher
            namespace="detections"
            condition={true}
            message={{
              type: 'primary',
              id: 'gap-auto-fill-logs',
              title: i18n.GAP_AUTO_FILL_LOGS_CALLOUT_TITLE,
              description: (
                <div>
                  <FormattedMessage
                    id="xpack.securitySolution.gapAutoFillLogs.caloutDescription"
                    defaultMessage="The gap fill scheduler automatically checks for gaps in run executions and schedules backfills to cover them. The scheduler logs which gaps were scheduled to be filled, and whether they succeeded or failed. "
                  />
                  <EuiSpacer size="s" />
                </div>
              ),
            }}
          />
          <EuiSpacer size="m" />
          <EuiPanel hasBorder>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>{i18n.GAP_AUTO_FILL_LOGS_TITLE}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <MultiselectFilter
                    data-test-subj="gap-auto-fill-logs-status-filter"
                    title={i18n.GAP_AUTO_FILL_STATUS_FILTER_TITLE}
                    items={statuses}
                    selectedItems={selectedStatuses}
                    onSelectionChange={(items) => setSelectedStatuses(items)}
                    renderItem={(s: string) => getStatusLabel(s)}
                    width={200}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiBasicTable
              loading={isLogsLoading}
              items={logsData?.data ?? []}
              itemId="id"
              columns={columns as EuiBasicTableColumn<SchedulerLog>[]}
              pagination={{
                pageIndex,
                pageSize,
                totalItemCount: logsData?.total ?? 0,
                pageSizeOptions: [10, 25, 50],
              }}
              onChange={handlePaginationChange}
              itemIdToExpandedRowMap={expandedRowMap}
              data-test-subj="gap-auto-fill-logs-table"
            />
          </EuiPanel>
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};
