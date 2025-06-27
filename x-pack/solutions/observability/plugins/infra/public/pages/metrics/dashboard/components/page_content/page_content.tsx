/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMetricsDataView } from '../../../../../containers/metrics_source';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_timerange_metadata';
import { RenderDashboard } from '../dashboard/render_dashboard';
import { EntityTable } from '../entity_table/entity_table';

export const PageContent = ({
  dashboardId,
  entityId,
  kuery,
}: {
  dashboardId: string;
  entityId?: string | null;
  kuery?: string;
}) => {
  const {
    services: { unifiedSearch },
  } = useKibanaContextForPlugin();

  const { SearchBar } = unifiedSearch.ui;

  const { metricsView } = useMetricsDataView();
  const { data, status } = useTimeRangeMetadataContext();

  if (data?.schemas === undefined) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <SearchBar
          appName="infraMetrics"
          displayStyle="inPage"
          indexPatterns={metricsView && [metricsView.dataViewReference]}
          placeholder={i18n.translate('xpack.infra.hosts.searchPlaceholder', {
            defaultMessage: 'Search',
          })}
          showDatePicker
          showFilterBar
          showQueryInput
          showQueryMenu
          useDefaultBehaviors
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {status === 'loading' ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <>
            {entityId ? <EntityTable entityId={entityId} /> : null}
            <RenderDashboard dashboardId={dashboardId} kuery={kuery} />
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
