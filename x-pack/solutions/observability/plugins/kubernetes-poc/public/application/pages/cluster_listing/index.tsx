/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Query, TimeRange } from '@kbn/es-query';
import { KubernetesPageTemplate } from '../../components/kubernetes_page_template';
import { KubernetesOverviewTabs, KubernetesPage } from '../../components/kubernetes_overview_tabs';
import { ClusterTable } from '../../components/cluster_table';
import { useFetchClusterListing } from '../../../hooks/use_fetch_cluster_listing';

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-15m',
  to: 'now',
};

export const ClusterListingPage: React.FC = () => {
  // The applied time range is what the query actually uses
  const [appliedTimeRange, setAppliedTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const { data, loading, error, refetch } = useFetchClusterListing({
    timeRange: appliedTimeRange,
  });

  // Handle "Update" button click - apply the new time range from the date picker
  const handleQuerySubmit = useCallback((payload: { query?: Query; dateRange: TimeRange }) => {
    setAppliedTimeRange(payload.dateRange);
  }, []);

  // Handle "Refresh" button click - re-fetch with the current applied time range
  const handleRefresh = useCallback(
    (_dateRange: TimeRange) => {
      refetch();
    },
    [refetch]
  );

  // We don't need to track pending changes here - the search bar handles that internally
  const handleTimeRangeChange = useCallback(() => {
    // No-op: we don't apply changes until "Update" is clicked
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (error) {
      return (
        <EuiEmptyPrompt
          iconType="warning"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.kubernetesPoc.clusterListing.errorTitle', {
                defaultMessage: 'Unable to load clusters',
              })}
            </h2>
          }
          body={<p>{error.message}</p>}
        />
      );
    }

    if (!data?.clusters || data.clusters.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="cluster"
          title={
            <h2>
              {i18n.translate('xpack.kubernetesPoc.clusterListing.emptyTitle', {
                defaultMessage: 'No clusters found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.kubernetesPoc.clusterListing.emptyBody', {
                defaultMessage:
                  'No Kubernetes clusters are currently being monitored. Make sure your OpenTelemetry Collector is configured correctly.',
              })}
            </p>
          }
        />
      );
    }

    return <ClusterTable clusters={data.clusters} />;
  };

  return (
    <KubernetesPageTemplate
      data-test-subj="kubernetesClustersPage"
      onQuerySubmit={handleQuerySubmit}
      onRefresh={handleRefresh}
      onTimeRangeChange={handleTimeRangeChange}
      appliedTimeRange={appliedTimeRange}
    >
      <KubernetesOverviewTabs activePage={KubernetesPage.Clusters} />
      <EuiSpacer size="l" />
      {renderContent()}
    </KubernetesPageTemplate>
  );
};
