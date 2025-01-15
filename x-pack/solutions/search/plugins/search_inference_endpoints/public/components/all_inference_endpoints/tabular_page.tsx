/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { TaskTypes } from '../../../common/types';
import * as i18n from '../../../common/translations';

import { useTableData } from '../../hooks/use_table_data';
import { FilterOptions, InferenceEndpointUI } from './types';

import { useAllInferenceEndpointsState } from '../../hooks/use_all_inference_endpoints_state';
import { ServiceProviderFilter } from './filter/service_provider_filter';
import { TaskTypeFilter } from './filter/task_type_filter';
import { TableSearch } from './search/table_search';
import { EndpointInfo } from './render_table_columns/render_endpoint/endpoint_info';
import { ServiceProvider } from './render_table_columns/render_service_provider/service_provider';
import { TaskType } from './render_table_columns/render_task_type/task_type';
import { DeleteAction } from './render_table_columns/render_actions/actions/delete/delete_action';
import { CopyIDAction } from './render_table_columns/render_actions/actions/copy_id/copy_id_action';

interface TabularPageProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
}

export const TabularPage: React.FC<TabularPageProps> = ({ inferenceEndpoints }) => {
  const [searchKey, setSearchKey] = React.useState('');
  const { queryParams, setQueryParams, filterOptions, setFilterOptions } =
    useAllInferenceEndpointsState();

  const onFilterChangedCallback = useCallback(
    (newFilterOptions: Partial<FilterOptions>) => {
      setFilterOptions(newFilterOptions);
    },
    [setFilterOptions]
  );

  const { paginatedSortedTableData, pagination, sorting } = useTableData(
    inferenceEndpoints,
    queryParams,
    filterOptions,
    searchKey
  );

  const tableColumns: Array<EuiBasicTableColumn<InferenceEndpointUI>> = [
    {
      field: 'endpoint',
      name: i18n.ENDPOINT,
      'data-test-subj': 'endpointCell',
      render: (endpoint: string, additionalInfo: InferenceEndpointUI) => {
        if (endpoint) {
          return <EndpointInfo inferenceId={endpoint} provider={additionalInfo.provider} />;
        }

        return null;
      },
      sortable: true,
      width: '300px',
    },
    {
      field: 'provider',
      name: i18n.SERVICE_PROVIDER,
      'data-test-subj': 'providerCell',
      render: (provider: InferenceAPIConfigResponse) => {
        if (provider) {
          return <ServiceProvider providerEndpoint={provider} />;
        }

        return null;
      },
      sortable: false,
      width: '285px',
    },
    {
      field: 'type',
      name: i18n.TASK_TYPE,
      'data-test-subj': 'typeCell',
      render: (type: TaskTypes) => {
        if (type) {
          return <TaskType type={type} />;
        }

        return null;
      },
      sortable: false,
      width: '100px',
    },
    {
      actions: [
        {
          render: (inferenceEndpoint: InferenceEndpointUI) => (
            <CopyIDAction inferenceId={inferenceEndpoint.endpoint} />
          ),
        },
        {
          render: (inferenceEndpoint: InferenceEndpointUI) => (
            <DeleteAction selectedEndpoint={inferenceEndpoint} />
          ),
        },
      ],
      width: '165px',
    },
  ];

  const handleTableChange = useCallback(
    ({ page, sort }: any) => {
      const newQueryParams = {
        ...queryParams,
        ...(sort && {
          sortField: sort.field,
          sortOrder: sort.direction,
        }),
        ...(page && {
          page: page.index + 1,
          perPage: page.size,
        }),
      };
      setQueryParams(newQueryParams);
    },
    [queryParams, setQueryParams]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem style={{ width: '400px' }} grow={false}>
            <TableSearch searchKey={searchKey} setSearchKey={setSearchKey} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceProviderFilter
              optionKeys={filterOptions.provider}
              onChange={onFilterChangedCallback}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TaskTypeFilter optionKeys={filterOptions.type} onChange={onFilterChangedCallback} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable
          columns={tableColumns}
          itemId="id"
          items={paginatedSortedTableData}
          onChange={handleTableChange}
          pagination={pagination}
          sorting={sorting}
          data-test-subj="inferenceEndpointTable"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
