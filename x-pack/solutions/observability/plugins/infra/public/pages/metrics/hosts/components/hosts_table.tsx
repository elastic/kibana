/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { SwitchSchemaMessage } from '../../../../components/shared/switch_schema_message';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import type { HostNodeRow } from '../hooks/use_hosts_table';
import { useHostsTableContext } from '../hooks/use_hosts_table';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { useHostCountContext } from '../hooks/use_host_count';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { FlyoutWrapper } from './host_details_flyout/flyout_wrapper';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';
import { FilterAction } from './table/filter_action';

export const HostsTable = () => {
  const { loading } = useHostsViewContext();
  const { loading: hostCountLoading, count } = useHostCountContext();
  const { searchCriteria } = useUnifiedSearchContext();
  const { data: timeRangeMetadata } = useTimeRangeMetadataContext();

  const schemas: DataSchemaFormat[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata?.schemas]
  );

  const { onPageReady } = usePerformanceContext();

  const {
    columns,
    items,
    currentPage,
    isFlyoutOpen,
    closeFlyout,
    clickedItem,
    onTableChange,
    pagination,
    sorting,
    selection,
    selectedItemsCount,
    filterSelectedHosts,
  } = useHostsTableContext();

  useEffect(() => {
    if (!loading && !hostCountLoading) {
      onPageReady({
        meta: {
          rangeFrom: searchCriteria.dateRange.from,
          rangeTo: searchCriteria.dateRange.to,
        },
        customMetrics: {
          key1: 'num_of_hosts',
          value1: count,
          key2: `max_hosts_per_page`,
          value2: searchCriteria.limit,
        },
      });
    }
  }, [loading, hostCountLoading, onPageReady, count, searchCriteria]);

  const hasDataOnAnotherSchema =
    schemas.length === 1 && searchCriteria.preferredSchema !== schemas[0];

  return (
    <>
      <FilterAction
        selectedItemsCount={selectedItemsCount}
        filterSelectedHosts={filterSelectedHosts}
      />
      <EuiBasicTable
        data-test-subj={`hostsView-table-${loading ? 'loading' : 'loaded'}`}
        tableCaption={i18n.translate('xpack.infra.waffle.hostsTableCaption', {
          defaultMessage: 'Hosts overview',
        })}
        // This table has a lot of columns, so break down into mobile view sooner
        responsiveBreakpoint="xl"
        itemId="id"
        selection={selection}
        pagination={{
          pageIndex: pagination.pageIndex ?? 0,
          pageSize: pagination.pageSize ?? DEFAULT_PAGE_SIZE,
          totalItemCount: items.length,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        sorting={{
          sort: {
            field: sorting.field as keyof HostNodeRow,
            direction: sorting.direction ?? 'asc',
          },
        }}
        rowProps={{
          'data-test-subj': 'hostsView-tableRow',
        }}
        items={currentPage}
        columns={columns}
        loading={loading}
        onChange={onTableChange}
        noItemsMessage={
          loading ? (
            i18n.translate('xpack.infra.waffle.loadingDataText', {
              defaultMessage: 'Loading data',
            })
          ) : (
            <EuiEmptyPrompt
              body={
                hasDataOnAnotherSchema ? (
                  <SwitchSchemaMessage dataTestSubj="infraHostsTableNoDataInSelectedSchema" />
                ) : (
                  i18n.translate('xpack.infra.waffle.noDataDescription', {
                    defaultMessage: 'Try adjusting your time or filter.',
                  })
                )
              }
              data-test-subj="hostsViewTableNoData"
              layout="vertical"
              title={
                <h2>
                  {i18n.translate('xpack.infra.waffle.noDataTitle', {
                    defaultMessage: 'There is no data to display.',
                  })}
                </h2>
              }
              hasBorder={false}
              titleSize="m"
            />
          )
        }
      />
      {isFlyoutOpen && clickedItem && (
        <FlyoutWrapper node={clickedItem} closeFlyout={closeFlyout} />
      )}
    </>
  );
};
