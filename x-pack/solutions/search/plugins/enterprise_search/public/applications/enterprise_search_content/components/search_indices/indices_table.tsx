/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { NATIVE_CONNECTOR_DEFINITIONS } from '@kbn/search-connectors';

import { Meta } from '../../../../../common/types/pagination';
import { healthColorsMap } from '../../../shared/constants/health_colors';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { EuiBadgeTo } from '../../../shared/react_router_helpers/eui_components';
import { SEARCH_INDEX_PATH } from '../../routes';
import { ElasticsearchViewIndex } from '../../types';
import { ingestionMethodToText, isConnectorIndex } from '../../utils/indices';
import {
  ingestionStatusToColor,
  ingestionStatusToText,
} from '../../utils/ingestion_status_helpers';

interface IndicesTableProps {
  indices: ElasticsearchViewIndex[];
  isLoading?: boolean;
  meta: Meta;
  onChange: (criteria: CriteriaWithPagination<ElasticsearchViewIndex>) => void;
  onDelete: (indexName: string) => void;
}

export const IndicesTable: React.FC<IndicesTableProps> = ({
  indices,
  isLoading,
  meta,
  onChange,
  onDelete,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const columns: Array<EuiBasicTableColumn<ElasticsearchViewIndex>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.name.columnTitle', {
        defaultMessage: 'Index name',
      }),
      render: (name: string) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generateEncodedPath(SEARCH_INDEX_PATH, { indexName: name })}
        >
          {name}
        </EuiLinkTo>
      ),
      sortable: true,
      width: '33%',
    },
    {
      field: 'health',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.health.columnTitle', {
        defaultMessage: 'Index health',
      }),
      render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
        <span>
          <EuiIcon type="dot" color={healthColorsMap[health] ?? ''} />
          &nbsp;{health ?? '-'}
        </span>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'count',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.docsCount.columnTitle', {
        defaultMessage: 'Docs count',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.ingestionName.columnTitle',
        {
          defaultMessage: 'Ingestion name',
        }
      ),
      render: (index: ElasticsearchViewIndex) => (
        <EuiText size="s">
          {(isConnectorIndex(index) &&
            index.connector.service_type &&
            NATIVE_CONNECTOR_DEFINITIONS[index.connector.service_type]?.name) ??
            '--'}
        </EuiText>
      ),
      truncateText: true,
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.ingestionMethod.columnTitle',
        {
          defaultMessage: 'Ingestion method',
        }
      ),
      render: (index: ElasticsearchViewIndex) => (
        <EuiText size="s">
          {isConnectorIndex(index) && index.connector.is_native
            ? i18n.translate(
                'xpack.enterpriseSearch.content.searchIndices.ingestionmethod.nativeConnector',
                {
                  defaultMessage: 'Elastic managed connector',
                }
              )
            : ingestionMethodToText(index.ingestionMethod)}
        </EuiText>
      ),
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.columnTitle',
        {
          defaultMessage: 'Ingestion status',
        }
      ),
      render: (index: ElasticsearchViewIndex) => {
        const overviewPath = generateEncodedPath(SEARCH_INDEX_PATH, { indexName: index.name });
        const label = ingestionStatusToText(index.ingestionStatus);
        return (
          <EuiBadgeTo
            to={overviewPath}
            label={label}
            color={ingestionStatusToColor(index.ingestionStatus)}
          />
        );
      },
      truncateText: true,
    },
    {
      actions: [
        {
          description: i18n.translate(
            'xpack.enterpriseSearch.content.searchIndices.actions.viewIndex.title',
            {
              defaultMessage: 'View this index',
            }
          ),
          icon: 'eye',
          isPrimary: false,
          name: (index) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.actions.viewIndex.caption',
              {
                defaultMessage: 'View index {indexName}',
                values: {
                  indexName: index.name,
                },
              }
            ),
          onClick: (index) =>
            navigateToUrl(
              generateEncodedPath(SEARCH_INDEX_PATH, {
                indexName: index.name,
              })
            ),
          type: 'icon',
        },
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.searchIndices.actions.deleteIndex.title',
            {
              defaultMessage: 'Delete this index',
            }
          ),
          icon: 'trash',
          isPrimary: false,
          name: (index) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.actions.deleteIndex.caption',
              {
                defaultMessage: 'Delete index {indexName}',
                values: {
                  indexName: index.name,
                },
              }
            ),
          onClick: (index) => onDelete(index.name),
          type: 'icon',
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
    },
  ];
  return (
    <EuiBasicTable
      items={indices}
      rowHeader="name"
      columns={columns}
      onChange={onChange}
      pagination={{
        pageIndex: meta.page.from / (meta.page.size || 1),
        pageSize: meta.page.size,
        showPerPageOptions: false,
        totalItemCount: meta.page.total,
      }}
      tableLayout="fixed"
      loading={isLoading}
    />
  );
};
