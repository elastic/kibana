/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiButtonIcon,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { X509Expiry } from '../../../../../common/runtime_types';
import type { MonitorSummary } from '../../../../../common/runtime_types';
import { MonitorListStatusColumn } from './columns/monitor_status_column';
import type { ExpandedRowMap } from './types';
import { MonitorBarSeries } from '../../common/charts';
import { OverviewPageLink } from './overview_page_link';
import * as labels from './translations';
import { MonitorListPageSizeSelect } from './monitor_list_page_size_select';
import { MonitorListDrawer } from './monitor_list_drawer/list_drawer_container';
import type { MonitorListProps } from './monitor_list_container';
import type { MonitorList } from '../../../state/reducers/monitor_list';
import { CertStatusColumn } from './columns/cert_status_column';
import { MonitorListHeader } from './monitor_list_header';
import { TAGS_LABEL, URL_LABEL } from '../../../../../common/translations/translations';
import { EnableMonitorAlert } from './columns/enable_alert';
import { STATUS_ALERT_COLUMN } from './translations';
import { MonitorNameColumn } from './columns/monitor_name_col';
import { MonitorTags } from '../../common/monitor_tags';
import { useMonitorHistogram } from './use_monitor_histogram';
import { NoItemsMessage } from './no_items_message';

interface Props extends MonitorListProps {
  pageSize: number;
  setPageSize: (val: number) => void;
  monitorList: MonitorList;
  isPending?: boolean;
}

export const MonitorListComponent: ({
  filters,
  monitorList: { list, error, loading },
  pageSize,
  setPageSize,
  isPending,
}: Props) => any = ({
  filters,
  monitorList: { list, error, loading },
  pageSize,
  setPageSize,
  isPending,
}) => {
  const [expandedDrawerIds, updateExpandedDrawerIds] = useState<string[]>([]);
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const [hideExtraColumns, setHideExtraColumns] = useState(false);

  useDebounce(
    () => {
      if (currentBreakpoint) {
        setHideExtraColumns(['m', 'l'].includes(currentBreakpoint));
      }
    },
    50,
    [currentBreakpoint]
  );

  const items = list.summaries ?? [];

  const { histogramsById, minInterval } = useMonitorHistogram({ items });

  const nextPagePagination = list.nextPagePagination ?? '';
  const prevPagePagination = list.prevPagePagination ?? '';

  const toggleDrawer = (id: string) => {
    if (expandedDrawerIds.includes(id)) {
      updateExpandedDrawerIds(expandedDrawerIds.filter((p) => p !== id));
    } else {
      updateExpandedDrawerIds([...expandedDrawerIds, id]);
    }
  };

  const getExpandedRowMap = () => {
    return expandedDrawerIds.reduce((map: ExpandedRowMap, id: string) => {
      return {
        ...map,
        [id]: (
          <MonitorListDrawer
            summary={items.find(({ monitor_id: monitorId }) => monitorId === id)!}
          />
        ),
      };
    }, {});
  };

  const columns = [
    ...[
      {
        align: 'left' as const,
        field: 'state.summary.status',
        name: labels.STATUS_COLUMN_LABEL,
        mobileOptions: {
          fullWidth: true,
        },
        render: (
          status: string,
          { state: { timestamp, summaryPings, error: summaryError } }: MonitorSummary
        ) => {
          return (
            <MonitorListStatusColumn
              status={status}
              timestamp={timestamp}
              summaryPings={summaryPings ?? []}
              summaryError={summaryError}
            />
          );
        },
      },
      {
        align: 'left' as const,
        field: 'state.monitor.name',
        name: labels.NAME_COLUMN_LABEL,
        mobileOptions: {
          fullWidth: true,
        },
        render: (_name: string, summary: MonitorSummary) => <MonitorNameColumn summary={summary} />,
        sortable: true,
      },
      {
        align: 'left' as const,
        field: 'state.url.full',
        name: URL_LABEL,
        width: '30%',
        render: (url: string) => (
          <EuiLink
            data-test-subj="syntheticsColumnsLink"
            href={url}
            target="_blank"
            color="text"
            external
          >
            {url}
          </EuiLink>
        ),
      },
      {
        align: 'left' as const,
        field: 'state.monitor.name',
        name: TAGS_LABEL,
        width: '12%',
        render: (_name: string, summary: MonitorSummary) => <MonitorTags summary={summary} />,
      },
      {
        align: 'left' as const,
        field: 'state.tls.server.x509',
        name: labels.TLS_COLUMN_LABEL,
        render: (x509: X509Expiry) => <CertStatusColumn expiry={x509} />,
      },
    ],
    ...(!hideExtraColumns
      ? [
          {
            align: 'left' as const,
            field: 'monitor_id',
            name: labels.HISTORY_COLUMN_LABEL,
            mobileOptions: {
              show: false,
            },
            render: (monitorId: string) => (
              <MonitorBarSeries
                histogramSeries={histogramsById?.[monitorId]?.points}
                minInterval={minInterval!}
              />
            ),
          },
        ]
      : []),
    {
      align: 'center' as const,
      field: '',
      name: STATUS_ALERT_COLUMN,
      width: '100px',
      render: (item: MonitorSummary) => (
        <EnableMonitorAlert
          monitorId={item.monitor_id}
          selectedMonitor={item.state.summaryPings[0]}
        />
      ),
    },
    ...(!hideExtraColumns
      ? [
          {
            align: 'right' as const,
            field: 'monitor_id',
            name: '',
            sortable: true,
            isExpander: true,
            width: '40px',
            render: (id: string) => {
              return (
                <EuiButtonIcon
                  aria-label={labels.getExpandDrawerLabel(id)}
                  data-test-subj={`xpack.synthetics.monitorList.${id}.expandMonitorDetail`}
                  iconType={expandedDrawerIds.includes(id) ? 'arrowUp' : 'arrowDown'}
                  onClick={() => toggleDrawer(id)}
                />
              );
            },
          },
        ]
      : []),
  ];

  return (
    <WrapperPanel hasBorder>
      <MonitorListHeader />
      <EuiSpacer size="m" />
      <EuiBasicTable
        aria-label={labels.getDescriptionLabel(items.length)}
        tableCaption={i18n.translate('xpack.uptime.monitorList.monitorListCaption', {
          defaultMessage: 'Monitors list',
        })}
        error={error?.body?.message || error?.message}
        loading={loading || isPending}
        itemId="monitor_id"
        itemIdToExpandedRowMap={getExpandedRowMap()}
        items={items}
        noItemsMessage={
          <NoItemsMessage loading={Boolean(loading || isPending)} filters={filters} />
        }
        columns={columns}
        tableLayout="auto"
        rowProps={
          hideExtraColumns
            ? ({ monitor_id: monitorId }) => ({
                onClick: () => toggleDrawer(monitorId),
                'aria-label': labels.getExpandDrawerLabel(monitorId),
              })
            : ({ monitor_id: monitorId }) => ({
                className: undefined,
              })
        }
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <MonitorListPageSizeSelect size={pageSize} setSize={setPageSize} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <OverviewPageLink
                dataTestSubj="xpack.uptime.monitorList.prevButton"
                direction="prev"
                pagination={prevPagePagination}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <OverviewPageLink
                dataTestSubj="xpack.uptime.monitorList.nextButton"
                direction="next"
                pagination={nextPagePagination}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WrapperPanel>
  );
};

const WrapperPanel = euiStyled(EuiPanel)`
  &&&  {
  .refresh-row{
    background-color: #f0f4fb;
    -webkit-transition: background-color 3000ms linear;
    -ms-transition: background-color 3000ms linear;
    transition: background-color 3000ms linear;
    }
  }
`;
