/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Query, TimeRange } from '@kbn/es-query';
import { KubernetesPageTemplate } from '../../components/kubernetes_page_template';
import { KubernetesOverviewTabs, KubernetesPage } from '../../components/kubernetes_overview_tabs';
import {
  KubernetesOverviewPanel,
  AiSummaryPanel,
  ClustersSection,
} from '../../components/kubernetes_overview';

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-15m',
  to: 'now',
};

export const OverviewPage: React.FC = () => {
  const [appliedTimeRange, setAppliedTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);

  const handleQuerySubmit = useCallback((payload: { query?: Query; dateRange: TimeRange }) => {
    setAppliedTimeRange(payload.dateRange);
  }, []);

  const handleRefresh = useCallback((_dateRange: TimeRange) => {
    // Trigger refetch by updating the time range with the same values
    // This will cause the ES|QL hooks to re-execute
    setAppliedTimeRange((prev) => ({ ...prev }));
  }, []);

  const handleTimeRangeChange = useCallback(() => {
    // No-op: we don't apply changes until "Update" is clicked
  }, []);

  return (
    <KubernetesPageTemplate
      data-test-subj="kubernetesOverviewPage"
      onQuerySubmit={handleQuerySubmit}
      onRefresh={handleRefresh}
      onTimeRangeChange={handleTimeRangeChange}
      appliedTimeRange={appliedTimeRange}
    >
      <KubernetesOverviewTabs activePage={KubernetesPage.Overview} />
      <EuiSpacer size="s" />

      {/* Top section: Kubernetes Overview + AI Summary */}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow>
          <KubernetesOverviewPanel timeRange={appliedTimeRange} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <AiSummaryPanel />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Clusters section with trend charts */}
      <ClustersSection timeRange={appliedTimeRange} />
    </KubernetesPageTemplate>
  );
};
