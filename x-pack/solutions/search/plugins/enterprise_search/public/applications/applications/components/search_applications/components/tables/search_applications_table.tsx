/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { Page } from '../../../../../../../common/types/pagination';
import { EnterpriseSearchApplication } from '../../../../../../../common/types/search_applications';

import { MANAGE_BUTTON_LABEL } from '../../../../../shared/constants';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { FormattedDateTime } from '../../../../../shared/formatted_date_time';
import { KibanaLogic } from '../../../../../shared/kibana';
import { pageToPagination } from '../../../../../shared/pagination/page_to_pagination';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../../../shared/telemetry/telemetry_logic';

import { SEARCH_APPLICATION_PATH } from '../../../../routes';

interface SearchApplicationsListTableProps {
  isLoading?: boolean;
  loading: boolean;
  meta: Page;
  onChange: (criteria: CriteriaWithPagination<EnterpriseSearchApplication>) => void;
  onDelete: (searchApplication: EnterpriseSearchApplication) => void;
  searchApplications: EnterpriseSearchApplication[];
  viewSearchApplicationIndices: (searchApplicationName: string) => void;
}
export const SearchApplicationsListTable: React.FC<SearchApplicationsListTableProps> = ({
  searchApplications,
  isLoading,
  meta,
  onChange,
  onDelete,
  viewSearchApplicationIndices,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const columns: Array<EuiBasicTableColumn<EnterpriseSearchApplication>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.searchApplications.list.table.column.name', {
        defaultMessage: 'Search Application Name',
      }),
      mobileOptions: {
        header: true,
        enlarge: true,
        width: '100%',
      },
      render: (name: string) => (
        <EuiLinkTo
          data-test-subj="search-application-link"
          data-telemetry-id="entSearchApplications-table-viewSearchApplication"
          to={generateEncodedPath(SEARCH_APPLICATION_PATH, { searchApplicationName: name })}
        >
          {name}
        </EuiLinkTo>
      ),
      truncateText: true,
      width: '30%',
    },
    {
      field: 'updated_at_millis',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.table.column.lastUpdated',
        {
          defaultMessage: 'Last updated',
        }
      ),
      dataType: 'number',
      render: (dateString: string) => <FormattedDateTime date={new Date(dateString)} hideTime />,
    },
    {
      field: 'indices',
      name: i18n.translate('xpack.enterpriseSearch.searchApplications.list.table.column.indices', {
        defaultMessage: 'Indices',
      }),
      align: 'right',

      render: (indices: string[], searchApplication) => (
        <EuiButtonEmpty
          size="s"
          data-test-subj="searchApplicationsListTableIndicesFlyoutButton"
          data-telemetry-id="entSearchApplications-table-viewSearchApplicationIndices"
          onClick={() => viewSearchApplicationIndices(searchApplication.name)}
        >
          <FormattedMessage
            id="xpack.enterpriseSearch.searchApplications.list.table.column.view.indices"
            defaultMessage="{indicesCount, number} {indicesCount, plural, one {index} other {indices}}"
            values={{ indicesCount: indices.length }}
          />
        </EuiButtonEmpty>
      ),
    },

    {
      name: i18n.translate('xpack.enterpriseSearch.searchApplications.list.table.column.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: MANAGE_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.searchApplications.list.table.column.actions.view.buttonDescription',
            {
              defaultMessage: 'View this search application',
            }
          ),
          type: 'icon',
          icon: 'eye',
          onClick: (searchApplication) =>
            navigateToUrl(
              generateEncodedPath(SEARCH_APPLICATION_PATH, {
                searchApplicationName: searchApplication.name,
              })
            ),
        },
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.searchApplications.list.table.column.action.delete.buttonDescription',
            {
              defaultMessage: 'Delete this search application',
            }
          ),
          type: 'icon',
          icon: 'trash',
          isPrimary: false,
          name: () =>
            i18n.translate(
              'xpack.enterpriseSearch.searchApplications.list.table.column.actions.deleteSearchApplicationLabel',
              {
                defaultMessage: 'Delete this search application',
              }
            ),
          onClick: (searchApplication) => {
            onDelete(searchApplication);
            sendEnterpriseSearchTelemetry({
              action: 'clicked',
              metric: 'entSearchApplications-table-deleteSearchApplication',
            });
          },
        },
      ],
    },
  ];

  return (
    <EuiBasicTable
      items={searchApplications}
      columns={columns}
      pagination={{ ...pageToPagination(meta), showPerPageOptions: false }}
      onChange={onChange}
      loading={isLoading}
    />
  );
};
