/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  Direction,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLoadingChart,
  EuiTableSortingType,
  useEuiTheme,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import {
  MetricsFetchDataResponse,
  MetricsFetchDataSeries,
  NumberOrNull,
  StringOrNull,
} from '../../../../..';
import { SectionContainer } from '../section_container';
import { getDataHandler } from '../../../../../context/has_data_context/data_handler';
import { useHasData } from '../../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { HostLink } from './host_link';
import { formatDuration } from './lib/format_duration';
import { MetricWithSparkline } from './metric_with_sparkline';
import type { BucketSize } from '../../../helpers/calculate_bucket_size';

interface Props {
  bucketSize: BucketSize;
}

const percentFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0[.0]%');

const numberFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0[.0]');

const bytesPerSecondFormatter = (value: NumberOrNull) =>
  value === null ? '' : numeral(value).format('0b') + '/s';

export function MetricsSection({ bucketSize }: Props) {
  const { euiTheme } = useEuiTheme();
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  const [sortField, setSortField] = useState<keyof MetricsFetchDataSeries>('uptime');
  const [sortedData, setSortedData] = useState<MetricsFetchDataResponse | null>(null);

  const { data, status } = useFetcher(() => {
    if (bucketSize && absoluteStart && absoluteEnd) {
      return getDataHandler('infra_metrics')?.fetchData({
        absoluteTime: { start: absoluteStart, end: absoluteEnd },
        relativeTime: { start: relativeStart, end: relativeEnd },
        ...bucketSize,
      });
    }
    // `forceUpdate` and `lastUpdated` should trigger a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bucketSize,
    relativeStart,
    relativeEnd,
    absoluteStart,
    absoluteEnd,
    forceUpdate,
    lastUpdated,
  ]);

  const handleTableChange = useCallback(
    ({ sort }: Criteria<MetricsFetchDataSeries>) => {
      if (sort) {
        const { field, direction } = sort;
        setSortField(field);
        setSortDirection(direction);
        if (data) {
          (async () => {
            const response = await data.sort(field, direction);
            setSortedData(response || null);
          })();
        }
      }
    },
    [data, setSortField, setSortDirection]
  );

  if (!hasDataMap.infra_metrics?.hasData) {
    return null;
  }

  const isLoading = status === FETCH_STATUS.LOADING;
  const isInitialLoad = isLoading && !data;

  const columns: Array<EuiBasicTableColumn<MetricsFetchDataSeries>> = [
    {
      field: 'uptime',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.uptime', {
        defaultMessage: 'Uptime',
      }),
      sortable: true,
      width: '80px',
      render: (value: NumberOrNull) => (value == null ? 'N/A' : formatDuration(value / 1000)),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.hostname', {
        defaultMessage: 'Hostname',
      }),
      sortable: true,
      truncateText: true,
      isExpander: true,
      textOnly: true,
      render: (value: StringOrNull, record: MetricsFetchDataSeries) => (
        <HostLink
          id={record.id}
          name={value}
          timerange={{ from: absoluteStart!, to: absoluteEnd! }}
        />
      ),
    },
    {
      field: 'cpu',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.cpu', {
        defaultMessage: 'CPU %',
      }),
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="cpu"
          value={value}
          formatter={percentFormatter}
          timeseries={record.timeseries}
          color={euiTheme.colors.vis.euiColorVis0}
        />
      ),
    },
    {
      field: 'load',
      name: i18n.translate('xpack.observability.overview.metrics.colunms.load15', {
        defaultMessage: 'Load 15',
      }),
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="load"
          value={value}
          formatter={numberFormatter}
          timeseries={record.timeseries}
          color={euiTheme.colors.vis.euiColorVis1}
        />
      ),
    },
    {
      field: 'rx',
      name: 'RX',
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="rx"
          value={value}
          formatter={bytesPerSecondFormatter}
          timeseries={record.timeseries}
          color={euiTheme.colors.vis.euiColorVis2}
        />
      ),
    },
    {
      field: 'tx',
      name: 'TX',
      sortable: true,
      render: (value: NumberOrNull, record: MetricsFetchDataSeries) => (
        <MetricWithSparkline
          id="tx"
          value={value}
          formatter={bytesPerSecondFormatter}
          timeseries={record.timeseries}
          color={euiTheme.colors.vis.euiColorVis3}
        />
      ),
    },
  ];

  const sorting: EuiTableSortingType<MetricsFetchDataSeries> = {
    sort: { field: sortField, direction: sortDirection },
  };

  const viewData = sortedData || data;

  const { appLink } = data || {};

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.metrics.title', {
        defaultMessage: 'Hosts',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.metrics.appLink', {
          defaultMessage: 'Show inventory',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      {isInitialLoad ? (
        <div
          data-test-subj="loading"
          style={{
            height: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiLoadingChart size="l" />
        </div>
      ) : (
        <EuiBasicTable
          onChange={handleTableChange}
          sorting={sorting}
          items={viewData?.series ?? []}
          columns={columns}
          loading={isLoading}
        />
      )}
    </SectionContainer>
  );
}
