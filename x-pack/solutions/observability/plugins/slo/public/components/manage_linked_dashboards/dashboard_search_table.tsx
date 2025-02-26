/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSearchBar,
} from '@elastic/eui';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchDashboards } from './hooks/use_fetch_dashboards';
import type { Dashboard } from './types';

interface Props {
  assignedDashboards: Dashboard[];
  assign: (dashboard: Dashboard) => void;
  unassign: (dashboard: Dashboard) => void;
}

export function DashboardSearchTable({ assignedDashboards, assign, unassign }: Props) {
  const {
    services: { share },
  } = useKibana();
  const [search, setSearch] = useState<string>();
  const [page, setPage] = useState(0);
  const debounceSearch = debounce((value: string) => setSearch(value), 300);
  const { data, isLoading, isError } = useFetchDashboards({ search, page: page + 1 });
  const dashboardLocator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  const columns: Array<EuiBasicTableColumn<Dashboard>> = [
    {
      field: 'label',
      name: 'Dashboard',
      render: (_, { id, title }) => (
        <EuiLink
          data-test-subj="sloColumnsLink"
          href={dashboardLocator?.getRedirectUrl({ dashboardId: id } ?? '')}
          target="_blank"
        >
          {title}
        </EuiLink>
      ),
    },
    {
      field: 'action',
      name: 'Action',
      align: 'right',
      render: (_, dashboard: Dashboard) =>
        assignedDashboards.find((assignDashboard) => assignDashboard.id === dashboard.id) ? (
          <EuiButton
            data-test-subj="unassignButton"
            onClick={() => unassign(dashboard)}
            size="s"
            color="danger"
          >
            {i18n.translate('xpack.slo.columns.unassignButtonLabel', {
              defaultMessage: 'Unassign',
            })}
          </EuiButton>
        ) : (
          <EuiButton
            data-test-subj="assignButton"
            onClick={() => assign(dashboard)}
            size="s"
            color="success"
          >
            {i18n.translate('xpack.slo.columns.assignButtonLabel', { defaultMessage: 'Assign' })}
          </EuiButton>
        ),
    },
  ];

  const onTableChange = ({ page: newPage }: Criteria<Dashboard>) => {
    if (newPage) {
      const { index } = newPage;
      setPage(index);
    }
  };

  const pagination = {
    pageIndex: page,
    pageSize: 25,
    totalItemCount: data?.total ?? 0,
    showPerPageOptions: false,
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiSearchBar
          query={search}
          onChange={({ queryText }) => {
            debounceSearch(queryText);
          }}
        />
      </EuiFlexItem>

      <EuiBasicTable
        compressed
        columns={columns}
        itemId="id"
        items={data?.results ?? []}
        loading={isLoading}
        pagination={pagination}
        onChange={onTableChange}
      />
    </EuiFlexGroup>
  );
}
