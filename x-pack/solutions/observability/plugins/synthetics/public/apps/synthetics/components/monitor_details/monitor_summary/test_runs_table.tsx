/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import type { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import type { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import { css } from '@kbn/kibana-react-plugin/common';
import { INSPECT_DOCUMENT, ViewDocument } from '../../common/components/view_document';
import {
  ExpandRowColumn,
  toggleDetails,
} from '../../test_now_mode/simple/ping_list/columns/expand_row';
import { useExpandedPingList } from '../../test_now_mode/simple/ping_list/use_ping_expanded';
import { THUMBNAIL_SCREENSHOT_SIZE_MOBILE } from '../../common/screenshot/screenshot_size';
import { getErrorDetailsUrl } from '../monitor_errors/errors_list';

import { TestRunsTableHeader } from './test_runs_table_header';
import { MONITOR_TYPES } from '../../../../../../common/constants';
import {
  getTestRunDetailRelativeLink,
  TestDetailsLink,
} from '../../common/links/test_details_link';
import type { Ping } from '../../../../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../../../../common/runtime_types';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_time_formats';
import { sortPings } from '../../../utils/monitor_test_result/sort_pings';
import { selectPingsError } from '../../../state';
import { parseBadgeStatus, StatusBadge } from '../../common/monitor_test_result/status_badge';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { useMonitorPings } from '../hooks/use_monitor_pings';
import { JourneyLastScreenshot } from '../../common/screenshot/journey_last_screenshot';
import { useSyntheticsRefreshContext, useSyntheticsSettingsContext } from '../../../contexts';

type SortableField = 'timestamp' | 'monitor.status' | 'monitor.duration.us';

interface TestRunsTableProps {
  from: string;
  to: string;
  paginable?: boolean;
  showViewHistoryButton?: boolean;
}

export const TestRunsTable = ({
  paginable = true,
  from,
  to,
  showViewHistoryButton = true,
}: TestRunsTableProps) => {
  const history = useHistory();
  const { basePath } = useSyntheticsSettingsContext();
  const { monitorId } = useParams<{ monitorId: string }>();
  const [page, setPage] = useState({ index: 0, size: 10 });

  const [sortField, setSortField] = useState<SortableField>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { lastRefresh } = useSyntheticsRefreshContext();
  const {
    pings,
    total,
    loading: pingsLoading,
  } = useMonitorPings({
    from,
    to,
    lastRefresh,
    pageSize: page.size,
    pageIndex: page.index,
  });
  const sortedPings = useMemo(() => {
    return sortPings(pings, sortField, sortDirection);
  }, [pings, sortField, sortDirection]);

  const pingsError = useSelector(selectPingsError);
  const { monitor } = useSelectedMonitor();
  const selectedLocation = useSelectedLocation();
  const isTabletOrGreater = useIsWithinMinBreakpoint('s');

  const isBrowserMonitor = monitor?.[ConfigKey.MONITOR_TYPE] === MonitorTypeEnum.BROWSER;

  const { expandedRows, setExpandedRows } = useExpandedPingList(pings);

  const sorting: EuiTableSortingType<Ping> = {
    sort: {
      field: sortField as keyof Ping,
      direction: sortDirection as 'asc' | 'desc',
    },
  };

  const handleTableChange = ({ page: newPage, sort }: Criteria<Ping>) => {
    if (newPage !== undefined) {
      setPage(newPage);
    }
    if (sort !== undefined) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  };

  const columns = [
    ...((isBrowserMonitor
      ? [
          {
            align: 'left',
            field: 'timestamp',
            name: SCREENSHOT_LABEL,
            render: (timestamp: string, item) => (
              <JourneyLastScreenshot
                checkGroupId={item.monitor.check_group}
                size={[100, 64]}
                timestamp={timestamp}
              />
            ),
            mobileOptions: {
              header: false,
              render: (item) => (
                <EuiFlexGroup css={{ width: '100%', height: '100%' }} alignItems="center">
                  <JourneyLastScreenshot
                    checkGroupId={item.monitor.check_group}
                    size={THUMBNAIL_SCREENSHOT_SIZE_MOBILE}
                    timestamp={item['@timestamp']}
                  />
                </EuiFlexGroup>
              ),
            },
          },
        ]
      : []) as Array<EuiBasicTableColumn<Ping>>),
    {
      align: 'left',
      valign: 'middle',
      field: 'timestamp',
      name: '@timestamp',
      sortable: true,
      render: (timestamp: string, ping: Ping) => (
        <TestDetailsLink isBrowserMonitor={isBrowserMonitor} timestamp={timestamp} ping={ping} />
      ),
      mobileOptions: {
        header: false,
        render: (item) => (
          <MobileRowDetails
            ping={item}
            isBrowserMonitor={isBrowserMonitor}
            basePath={basePath}
            locationId={selectedLocation?.id}
          />
        ),
      },
    },
    {
      align: 'left',
      valign: 'middle',
      field: 'monitor.status',
      name: RESULT_LABEL,
      sortable: true,
      render: (status: string, test: Ping) => {
        const attemptNo = test.summary?.attempt ?? 1;
        const isFinalAttempt = test.summary?.final_attempt ?? false;
        if (!isFinalAttempt || attemptNo === 1) {
          return <StatusBadge status={parseBadgeStatus(status ?? 'skipped')} />;
        }
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem>
              <StatusBadge status={parseBadgeStatus(status ?? 'skipped')} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiIconTip
                data-test-subj="isRetestIcon"
                type="refresh"
                content={FINAL_ATTEMPT_LABEL}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      mobileOptions: {
        show: false,
      },
    },
    ...(!isBrowserMonitor
      ? [
          {
            align: 'left',
            field: 'monitor.ip',
            sortable: true,
            name: i18n.translate('xpack.synthetics.pingList.ipAddressColumnLabel', {
              defaultMessage: 'IP',
            }),
          },
        ]
      : []),
    {
      align: 'left',
      field: 'error.message',
      name: MESSAGE_LABEL,
      textOnly: true,
      css: css`
        max-width: 500px;
      `,
      render: (errorMessage: string) => (
        <EuiText size="s">{errorMessage?.length > 0 ? errorMessage : '-'}</EuiText>
      ),
      mobileOptions: {
        show: false,
      },
    },
    {
      align: 'right',
      valign: 'middle',
      field: 'monitor.duration.us',
      name: DURATION_LABEL,
      sortable: true,
      render: (durationUs: number) => <EuiText size="s">{formatTestDuration(durationUs)}</EuiText>,
      mobileOptions: {
        show: false,
      },
    },
    {
      align: 'right' as const,
      actions: [
        {
          'data-test-subj': 'syntheticsViewPingDocument',
          isPrimary: true,
          name: INSPECT_DOCUMENT,
          description: INSPECT_DOCUMENT,
          icon: 'inspect' as const,
          type: 'button' as const,
          render: (ping: Ping) => <ViewDocument ping={ping} />,
        },
      ],
    },
    ...(!isBrowserMonitor
      ? [
          {
            align: 'right',
            width: '24px',
            isExpander: true,
            render: (item: Ping) => (
              <ExpandRowColumn
                item={item}
                expandedRows={expandedRows}
                setExpandedRows={setExpandedRows}
              />
            ),
          },
        ]
      : []),
  ] as Array<EuiBasicTableColumn<Ping>>;

  const getRowProps = (item: Ping) => {
    return {
      'data-test-subj': `row-${item.monitor.check_group}`,
      onClick: (evt: MouseEvent) => {
        if (item.monitor.type !== MONITOR_TYPES.BROWSER) {
          toggleDetails(item, expandedRows, setExpandedRows);
        } else {
          history.push(
            getTestRunDetailRelativeLink({
              monitorId,
              checkGroup: item.monitor.check_group,
              locationId: selectedLocation?.id,
            })
          );
        }
      },
    };
  };

  return (
    <EuiPanel hasShadow={false} hasBorder css={{ minHeight: 200 }}>
      <TestRunsTableHeader
        paginable={paginable}
        showViewHistoryButton={showViewHistoryButton}
        pings={pings}
      />
      <EuiBasicTable
        itemId="docId"
        itemIdToExpandedRowMap={expandedRows}
        css={{ overflowX: isTabletOrGreater ? 'auto' : undefined }}
        loading={pingsLoading}
        columns={columns}
        error={pingsError?.body?.message}
        items={sortedPings}
        noItemsMessage={pingsLoading ? LOADING_TEST_RUNS : NO_DATA_FOUND}
        tableLayout="auto"
        sorting={sorting}
        onChange={handleTableChange}
        rowProps={getRowProps}
        pagination={
          paginable
            ? {
                pageIndex: page.index,
                pageSize: page.size,
                totalItemCount: total,
                pageSizeOptions: [5, 10, 20, 50],
              }
            : undefined
        }
        tableCaption={i18n.translate('xpack.synthetics.monitorDetails.summary.testRunsCaption', {
          defaultMessage: 'Recent test runs',
        })}
      />
    </EuiPanel>
  );
};

export const MobileRowDetails = ({
  ping,
  isBrowserMonitor,
  basePath,
  locationId,
}: {
  ping: Ping;
  isBrowserMonitor: boolean;
  basePath: string;
  locationId?: string;
}) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <TestDetailsLink
        isBrowserMonitor={isBrowserMonitor}
        timestamp={ping['@timestamp']}
        ping={ping}
      />
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        wrap={false}
        responsive={false}
      >
        <EuiFlexItem css={{ flexBasis: 'fit-content' }}>
          <StatusBadge status={parseBadgeStatus(ping?.monitor?.status ?? 'skipped')} />
        </EuiFlexItem>
        <EuiFlexItem css={{ textAlign: 'right' }}>
          {ping?.state?.id! &&
          ping.config_id &&
          locationId &&
          parseBadgeStatus(ping?.monitor?.status ?? 'skipped') === 'failed' ? (
            <EuiButtonEmpty
              data-test-subj="monitorTestRunsListViewErrorDetails"
              color="danger"
              href={getErrorDetailsUrl({
                basePath,
                configId: ping.config_id,
                locationId,
                stateId: ping?.state?.id!,
              })}
            >
              {i18n.translate('xpack.synthetics.monitorDetails.summary.viewErrorDetails', {
                defaultMessage: 'View error details',
              })}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" gutterSize="s">
        {[
          {
            title: DURATION_LABEL,
            description: formatTestDuration(ping?.monitor?.duration?.us),
          },
        ].map(({ title, description }) => (
          <EuiFlexGroup
            key={title}
            css={{ maxWidth: 'fit-content' }}
            direction="row"
            alignItems="baseline"
            gutterSize="xs"
            responsive={false}
            wrap={true}
          >
            <EuiText size="xs">{title}</EuiText>
            {description}
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

export const LAST_10_TEST_RUNS = i18n.translate(
  'xpack.synthetics.monitorDetails.summary.lastTenTestRuns',
  {
    defaultMessage: 'Last 10 Test Runs',
  }
);

const SCREENSHOT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.screenshot', {
  defaultMessage: 'Screenshot',
});

const FINAL_ATTEMPT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.finalAttempt', {
  defaultMessage: 'This is a retest since retry on failure is enabled.',
});

const RESULT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.result', {
  defaultMessage: 'Result',
});

const MESSAGE_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.message', {
  defaultMessage: 'Message',
});

const DURATION_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.duration', {
  defaultMessage: 'Duration',
});

const LOADING_TEST_RUNS = i18n.translate('xpack.synthetics.monitorDetails.loadingTestRuns', {
  defaultMessage: 'Loading test runs...',
});

const NO_DATA_FOUND = i18n.translate('xpack.synthetics.monitorDetails.noDataFound', {
  defaultMessage: 'No data found',
});
