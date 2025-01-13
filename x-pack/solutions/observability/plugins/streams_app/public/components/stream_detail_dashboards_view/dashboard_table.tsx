/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { getRouterLinkProps } from '@kbn/router-utils';
import { useKibana } from '../../hooks/use_kibana';
import { tagListToReferenceList } from './to_reference_list';

export function DashboardsTable({
  dashboards,
  compact = false,
  selectedDashboards,
  setSelectedDashboards,
  loading,
}: {
  loading: boolean;
  dashboards: SanitizedDashboardAsset[] | undefined;
  compact?: boolean;
  selectedDashboards: SanitizedDashboardAsset[];
  setSelectedDashboards: (dashboards: SanitizedDashboardAsset[]) => void;
}) {
  const {
    dependencies: {
      start: {
        share,
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();

  const dashboardLocator = useMemo(
    () => share.url.locators.get(DASHBOARD_APP_LOCATOR),
    [share.url.locators]
  );

  const columns = useMemo((): Array<EuiBasicTableColumn<SanitizedDashboardAsset>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.dashboardTable.dashboardNameColumnTitle', {
          defaultMessage: 'Dashboard name',
        }),
        render: (_, { id }) => {
          const props = getRouterLinkProps({
            href: dashboardLocator?.getRedirectUrl({ dashboardId: id } || ''),
            onClick: () => {
              return dashboardLocator?.navigate({ dashboardId: id } || '');
            },
          });
          return <EuiLink {...props}>{id}</EuiLink>;
        },
      },
      ...(!compact
        ? ([
            {
              field: 'tags',
              name: i18n.translate('xpack.streams.dashboardTable.tagsColumnTitle', {
                defaultMessage: 'Tags',
              }),
              render: (_, { tags }) => {
                return (
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" wrap>
                    <savedObjectsTaggingUi.components.TagList
                      object={{ references: tagListToReferenceList(tags) }}
                    />
                  </EuiFlexGroup>
                );
              },
            },
          ] satisfies Array<EuiBasicTableColumn<SanitizedDashboardAsset>>)
        : []),
    ];
  }, [compact, savedObjectsTaggingUi, dashboardLocator]);

  const items = useMemo(() => {
    return dashboards ?? [];
  }, [dashboards]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        columns={columns}
        itemId="id"
        items={items}
        loading={loading}
        selection={{
          onSelectionChange: (newSelection: SanitizedDashboardAsset[]) => {
            setSelectedDashboards(newSelection);
          },
          selected: selectedDashboards,
        }}
      />
    </EuiFlexGroup>
  );
}
