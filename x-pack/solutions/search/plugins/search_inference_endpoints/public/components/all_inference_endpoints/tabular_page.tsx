/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  InferenceInferenceEndpointInfo,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import * as i18n from '../../../common/translations';

import { useTableData } from '../../hooks/use_table_data';
import { FilterOptions } from './types';

import { useAllInferenceEndpointsState } from '../../hooks/use_all_inference_endpoints_state';
import { ServiceProviderFilter } from './filter/service_provider_filter';
import { TaskTypeFilter } from './filter/task_type_filter';
import { TableSearch } from './search/table_search';
import { EndpointInfo } from './render_table_columns/render_endpoint/endpoint_info';
import { ServiceProvider } from './render_table_columns/render_service_provider/service_provider';
import { TaskType } from './render_table_columns/render_task_type/task_type';
import { DeleteAction } from './render_table_columns/render_actions/actions/delete/delete_action';
import { useKibana } from '../../hooks/use_kibana';
import { isEndpointPreconfigured } from '../../utils/preconfigured_endpoint_helper';
import { EditInferenceFlyout } from '../edit_inference_endpoints/edit_inference_flyout';

interface TabularPageProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
}

export const TabularPage: React.FC<TabularPageProps> = ({ inferenceEndpoints }) => {
  const {
    services: { notifications },
  } = useKibana();
  const toasts = notifications?.toasts;
  const [showDeleteAction, setShowDeleteAction] = useState(false);
  const [showInferenceFlyout, setShowInferenceFlyout] = useState(false);
  const [selectedInferenceEndpoint, setSelectedInferenceEndpoint] = useState<
    InferenceInferenceEndpointInfo | undefined
  >(undefined);
  const [searchKey, setSearchKey] = React.useState('');
  const { queryParams, setQueryParams, filterOptions, setFilterOptions } =
    useAllInferenceEndpointsState();

  const copyContent = useCallback(
    (inferenceId: string) => {
      navigator.clipboard.writeText(inferenceId).then(() => {
        toasts?.addSuccess({
          title: i18n.ENDPOINT_COPY_SUCCESS(inferenceId),
        });
      });
    },
    [toasts]
  );

  const uniqueProvidersAndTaskTypes = useMemo(() => {
    return inferenceEndpoints.reduce(
      (acc, { service, task_type: taskType }) => {
        acc.providers.add(service as ServiceProviderKeys);
        acc.taskTypes.add(taskType);
        return acc;
      },
      {
        providers: new Set<ServiceProviderKeys>(),
        taskTypes: new Set<InferenceTaskType>(),
      }
    );
  }, [inferenceEndpoints]);

  const onCancelDeleteModal = useCallback(() => {
    setSelectedInferenceEndpoint(undefined);
    setShowDeleteAction(false);
  }, []);

  const displayDeleteActionitem = useCallback(
    (selectedEndpoint: InferenceInferenceEndpointInfo) => {
      setSelectedInferenceEndpoint(selectedEndpoint);
      setShowDeleteAction(true);
    },
    []
  );

  const displayInferenceFlyout = useCallback((selectedEndpoint: InferenceInferenceEndpointInfo) => {
    setShowInferenceFlyout(true);
    setSelectedInferenceEndpoint(selectedEndpoint);
  }, []);

  const onCloseInferenceFlyout = useCallback(() => {
    setShowInferenceFlyout(false);
    setSelectedInferenceEndpoint(undefined);
  }, []);

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

  const tableColumns = useMemo<Array<EuiBasicTableColumn<InferenceInferenceEndpointInfo>>>(
    () => [
      {
        field: 'inference_id',
        name: i18n.ENDPOINT,
        'data-test-subj': 'endpointCell',

        render: (
          inferenceId: InferenceInferenceEndpointInfo['inference_id'],
          endpointInfo: InferenceInferenceEndpointInfo
        ) => {
          if (inferenceId) {
            return <EndpointInfo inferenceId={inferenceId} endpointInfo={endpointInfo} />;
          }

          return null;
        },
        sortable: true,
        width: '300px',
      },
      {
        field: 'service',
        name: i18n.SERVICE_PROVIDER,
        'data-test-subj': 'providerCell',
        render: (service: ServiceProviderKeys, endpointInfo: InferenceInferenceEndpointInfo) => {
          if (service) {
            return <ServiceProvider service={service} endpointInfo={endpointInfo} />;
          }

          return null;
        },
        sortable: false,
        width: '285px',
      },
      {
        field: 'task_type',
        name: i18n.TASK_TYPE,
        'data-test-subj': 'typeCell',
        render: (taskType: InferenceTaskType) => {
          if (taskType) {
            return <TaskType type={taskType} />;
          }

          return null;
        },
        sortable: false,
        width: '100px',
      },
      {
        actions: [
          {
            name: i18n.ENDPOINT_VIEW_ACTION_LABEL,
            description: i18n.ENDPOINT_VIEW_ACTION_LABEL,
            icon: 'eye',
            type: 'icon',
            onClick: (item) => displayInferenceFlyout(item),
            'data-test-subj': 'inference-endpoints-action-view-endpoint-label',
          },
          {
            name: i18n.ENDPOINT_COPY_ID_ACTION_LABEL,
            description: i18n.ENDPOINT_COPY_ID_ACTION_LABEL,
            icon: 'copyClipboard',
            type: 'icon',
            onClick: (item) => copyContent(item.inference_id),
            'data-test-subj': 'inference-endpoints-action-copy-id-label',
          },
          {
            name: i18n.ENDPOINT_DELETE_ACTION_LABEL,
            description: i18n.ENDPOINT_DELETE_ACTION_LABEL,
            icon: 'trash',
            type: 'icon',
            enabled: (item) => !isEndpointPreconfigured(item.inference_id),
            onClick: (item) => displayDeleteActionitem(item),
            'data-test-subj': (item) =>
              isEndpointPreconfigured(item.inference_id)
                ? 'inferenceUIDeleteAction-preconfigured'
                : 'inferenceUIDeleteAction-user-defined',
          },
        ],
        width: '165px',
      },
    ],
    [copyContent, displayDeleteActionitem, displayInferenceFlyout]
  );

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
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem style={{ width: '400px' }} grow={false}>
              <TableSearch searchKey={searchKey} setSearchKey={setSearchKey} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ServiceProviderFilter
                optionKeys={filterOptions.provider}
                uniqueProviders={uniqueProvidersAndTaskTypes.providers}
                onChange={onFilterChangedCallback}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TaskTypeFilter
                optionKeys={filterOptions.type}
                onChange={onFilterChangedCallback}
                uniqueTaskTypes={uniqueProvidersAndTaskTypes.taskTypes}
              />
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
      {showDeleteAction && selectedInferenceEndpoint ? (
        <DeleteAction
          selectedEndpoint={selectedInferenceEndpoint}
          displayModal={showDeleteAction}
          onCancel={onCancelDeleteModal}
        />
      ) : null}
      {showInferenceFlyout && selectedInferenceEndpoint ? (
        <EditInferenceFlyout
          onFlyoutClose={onCloseInferenceFlyout}
          selectedInferenceEndpoint={selectedInferenceEndpoint}
        />
      ) : null}
    </>
  );
};
