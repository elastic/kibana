/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import type { EuiBasicTableColumn, UseEuiTheme } from '@elastic/eui';
import { EuiInMemoryTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type {
  InferenceInferenceEndpointInfo,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { EisCloudConnectPromoCallout, EisPromotionalCallout } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import {
  ENDPOINT,
  ENDPOINT_COPY_ID_ACTION_LABEL,
  ENDPOINT_DELETE_ACTION_LABEL,
  ENDPOINT_VIEW_ACTION_LABEL,
  INFERENCE_ENDPOINTS_TABLE_CAPTION,
  MODEL,
  SERVICE_PROVIDER,
} from '../../../common/translations';

import { useTableData } from '../../hooks/use_table_data';
import { useEndpointActions } from '../../hooks/use_endpoint_actions';
import type { FilterOptions } from './types';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from './types';

import { DEFAULT_FILTER_OPTIONS } from './constants';
import { ServiceProviderFilter } from './filter/service_provider_filter';
import { TaskTypeFilter } from './filter/task_type_filter';
import { TableSearch } from './search/table_search';
import { EndpointInfo } from './render_table_columns/render_endpoint/endpoint_info';
import { Model } from './render_table_columns/render_model/model';
import { ServiceProvider } from './render_table_columns/render_service_provider/service_provider';
import { DeleteAction } from './render_table_columns/render_actions/actions/delete/delete_action';
import { useKibana } from '../../hooks/use_kibana';
import { getModelId } from '../../utils/get_model_id';
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
    services: { cloud, application },
  } = useKibana();
  const [searchKey, setSearchKey] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);

  const {
    showDeleteAction,
    showInferenceFlyout,
    selectedInferenceEndpoint,
    copyContent,
    onCancelDeleteModal,
    displayDeleteActionItem,
    displayInferenceFlyout,
    onCloseInferenceFlyout,
  } = useEndpointActions();

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

  const onFilterChangedCallback = useCallback((newFilterOptions: Partial<FilterOptions>) => {
    setFilterOptions((prev) => ({ ...prev, ...newFilterOptions }));
  }, []);

  const tableData = useTableData(inferenceEndpoints, filterOptions, searchKey);

  const tableColumns = useMemo<Array<EuiBasicTableColumn<InferenceInferenceEndpointInfo>>>(
    () => [
      {
        field: 'inference_id',
        name: ENDPOINT,
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
        name: MODEL,
        'data-test-subj': 'modelCell',
        render: (endpointInfo: InferenceInferenceEndpointInfo) => {
          return <Model endpointInfo={endpointInfo} />;
        },
        sortable: (endpointInfo: InferenceInferenceEndpointInfo) => getModelId(endpointInfo) ?? '',
        width: '200px',
      },
      {
        field: 'service',
        name: SERVICE_PROVIDER,
        'data-test-subj': 'providerCell',
        render: (service: ServiceProviderKeys, endpointInfo: InferenceInferenceEndpointInfo) => {
          if (service) {
            return <ServiceProvider service={service} endpointInfo={endpointInfo} />;
          }

          return null;
        },
        sortable: true,
        width: '285px',
      },
      {
        actions: [
          {
            name: ENDPOINT_VIEW_ACTION_LABEL,
            description: ENDPOINT_VIEW_ACTION_LABEL,
            icon: 'eye',
            type: 'icon',
            onClick: (item) => displayInferenceFlyout(item),
            'data-test-subj': 'inference-endpoints-action-view-endpoint-label',
          },
          {
            name: ENDPOINT_COPY_ID_ACTION_LABEL,
            description: ENDPOINT_COPY_ID_ACTION_LABEL,
            icon: 'copyClipboard',
            type: 'icon',
            onClick: (item) => copyContent(item.inference_id),
            'data-test-subj': 'inference-endpoints-action-copy-id-label',
          },
          {
            name: ENDPOINT_DELETE_ACTION_LABEL,
            description: ENDPOINT_DELETE_ACTION_LABEL,
            icon: 'trash',
            type: 'icon',
            enabled: (item) => !isEndpointPreconfigured(item.inference_id),
            onClick: (item) => displayDeleteActionItem(item),
            'data-test-subj': (item) =>
              isEndpointPreconfigured(item.inference_id)
                ? 'inferenceUIDeleteAction-preconfigured'
                : 'inferenceUIDeleteAction-user-defined',
          },
        ],
        width: '165px',
      },
    ],
    [copyContent, displayDeleteActionItem, displayInferenceFlyout]
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
        <EuiInMemoryTable
          allowNeutralSort={false}
          columns={tableColumns}
          itemId="inference_id"
          items={tableData}
          pagination={{
            pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
          }}
          sorting={{
            sort: {
              field: 'inference_id',
              direction: 'asc',
            },
          }}
          data-test-subj="inferenceEndpointTable"
          tableCaption={INFERENCE_ENDPOINTS_TABLE_CAPTION}
        />
      </EuiFlexGroup>
      {showDeleteAction && selectedInferenceEndpoint && (
        <DeleteAction
          selectedEndpoint={selectedInferenceEndpoint}
          displayModal={showDeleteAction}
          onCancel={onCancelDeleteModal}
        />
      )}
      {showInferenceFlyout && selectedInferenceEndpoint && (
        <EditInferenceFlyout
          onFlyoutClose={onCloseInferenceFlyout}
          selectedInferenceEndpoint={selectedInferenceEndpoint}
        />
      )}
    </>
  );
};
