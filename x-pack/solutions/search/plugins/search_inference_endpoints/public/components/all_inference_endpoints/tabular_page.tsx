/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n as kbnI18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import type { EuiBasicTableColumn, UseEuiTheme } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type {
  InferenceInferenceEndpointInfo,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { EisCloudConnectPromoCallout, EisPromotionalCallout } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import * as i18n from '../../../common/translations';

import { useTableData } from '../../hooks/use_table_data';
import type { FilterOptions } from './types';

import { useAllInferenceEndpointsState } from '../../hooks/use_all_inference_endpoints_state';
import { ServiceProviderFilter } from './filter/service_provider_filter';
import { TaskTypeFilter } from './filter/task_type_filter';
import { TableSearch } from './search/table_search';
import { EndpointInfo } from './render_table_columns/render_endpoint/endpoint_info';
import { Model } from './render_table_columns/render_model/model';
import { ServiceProvider } from './render_table_columns/render_service_provider/service_provider';
import { TaskType } from './render_table_columns/render_task_type/task_type';
import { DeleteAction } from './render_table_columns/render_actions/actions/delete/delete_action';
import { useKibana } from '../../hooks/use_kibana';
import { isEndpointPreconfigured } from '../../utils/preconfigured_endpoint_helper';
import { EditInferenceFlyout } from '../edit_inference_endpoints/edit_inference_flyout';
import { docLinks } from '../../../common/doc_links';
import { EndpointStats } from './endpoint_stats';

const searchContainerStyles = ({ euiTheme }: UseEuiTheme) => css`
  width: ${euiTheme.base * 25}px;
`;

interface TabularPageProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
}

export const TabularPage: React.FC<TabularPageProps> = ({ inferenceEndpoints }) => {
  const {
    services: { notifications, cloud, application },
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
      const message = i18n.ENDPOINT_COPY_SUCCESS(inferenceId);
      navigator.clipboard.writeText(inferenceId).then(() => {
        toasts?.addSuccess({
          title: message,
          'aria-label': message,
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
    setSelectedInferenceEndpoint(selectedEndpoint);
    setShowInferenceFlyout(true);
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

  const { tableData, paginatedSortedTableData, pagination, sorting } = useTableData(
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
        name: i18n.MODEL,
        'data-test-subj': 'modelCell',
        render: (endpointInfo: InferenceInferenceEndpointInfo) => {
          return <Model endpointInfo={endpointInfo} />;
        },
        width: '200px',
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
        <EisPromotionalCallout
          promoId="inferenceEndpointManagement"
          isCloudEnabled={cloud?.isCloudEnabled ?? false}
          ctaLink={docLinks.elasticInferenceService}
          direction="row"
        />
        <EisCloudConnectPromoCallout
          promoId="inferenceEndpointManagement"
          isSelfManaged={!cloud?.isCloudEnabled}
          direction="row"
          navigateToApp={() =>
            application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
          }
        />
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem css={searchContainerStyles} grow={false}>
            <TableSearch searchKey={searchKey} setSearchKey={setSearchKey} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
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
        </EuiFlexGroup>
        <EndpointStats endpoints={tableData} />
        <EuiFlexItem>
          <EuiBasicTable
            columns={tableColumns}
            itemId="inference_id"
            items={paginatedSortedTableData}
            onChange={handleTableChange}
            pagination={pagination}
            sorting={sorting}
            data-test-subj="inferenceEndpointTable"
            tableCaption={kbnI18n.translate(
              'xpack.searchInferenceEndpoints.tabularPage.tableCaption',
              {
                defaultMessage: 'Inference endpoints list',
              }
            )}
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
