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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSearchBar,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import { Asset } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchDashboards } from './hooks/use_fetch_dashboards';

interface Props {
  assets: Asset[];
  onClose: () => void;
  onSave: () => void;
}

interface Dashboard {
  id: string;
  title: string;
}

export function ManageLinkedDashboardsFlyout({ assets, onClose, onSave }: Props) {
  const {
    services: { share },
  } = useKibana();
  const [search, setSearch] = useState<string>();
  const [page, setPage] = useState(0);
  const debounceSearch = debounce((value: string) => setSearch(value), 300);
  const [selectedDashboards, setSelectedDashboards] = useState<Dashboard[]>(
    assets
      .filter((asset) => asset.type === 'dashboard')
      .map((asset) => ({ id: asset.id, title: asset.label }))
  );

  const assign = (dashboard: Dashboard) => {
    setSelectedDashboards((currDashboards) => currDashboards.concat(dashboard));
  };

  const unassign = (dashboard: Dashboard) => {
    setSelectedDashboards((currDashboards) =>
      currDashboards.filter((currDashboard) => currDashboard.id !== dashboard.id)
    );
  };

  const { data, isLoading, isError } = useFetchDashboards({ search, page: page + 1 });

  const flyoutId = useGeneratedHtmlId({ prefix: 'linkedDashboardFlyout' });
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
      render: (_, dashboard: Dashboard) =>
        selectedDashboards.find((asset) => asset.id === dashboard.id) ? (
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
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutId} ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={flyoutId}>
            {i18n.translate(
              'xpack.slo.manageLinkedDashboardsFlyout.managedLinkedDashboardsTitleLabel',
              {
                defaultMessage: 'Managed linked dashboards',
              }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <EuiText size="s">
            {i18n.translate('xpack.slo.manageLinkedDashboardsFlyout.description', {
              defaultMessage: 'Select dashboards which you want to add and assign to this SLO.',
            })}
          </EuiText>
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

          <pre>{JSON.stringify(selectedDashboards, null, 2)}</pre>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="sloLinkedDashboardsFlyoutCloseButton"
              iconType="cross"
              onClick={onClose}
              flush="left"
            >
              {i18n.translate('xpack.slo.manageLinkedDashboardsFlyout.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="sloLinkedDashboardsFlyoutSaveButton" onClick={onSave} fill>
              {i18n.translate('xpack.slo.manageLinkedDashboardsFlyout.saveButtonLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
