/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { Query, TimeRange } from '@kbn/es-query';
import { KubernetesPageTemplate } from '../../components/kubernetes_page_template';
import { KubernetesOverviewTabs, KubernetesPage } from '../../components/kubernetes_overview_tabs';

export const ClusterListingPage: React.FC = () => {
  const handleQuerySubmit = useCallback((payload: { query?: Query; dateRange: TimeRange }) => {
    // TODO: Implement search functionality
    // eslint-disable-next-line no-console
    console.log('Search submitted:', payload);
  }, []);

  const handleRefresh = useCallback((dateRange: TimeRange) => {
    // TODO: Implement refresh functionality
    // eslint-disable-next-line no-console
    console.log('Refresh clicked:', dateRange);
  }, []);

  return (
    <KubernetesPageTemplate
      data-test-subj="kubernetesClustersPage"
      onQuerySubmit={handleQuerySubmit}
      onRefresh={handleRefresh}
    >
      <KubernetesOverviewTabs activePage={KubernetesPage.Clusters} />
      <EuiSpacer size="l" />
      {/* Cluster listing content will go here */}
    </KubernetesPageTemplate>
  );
};
