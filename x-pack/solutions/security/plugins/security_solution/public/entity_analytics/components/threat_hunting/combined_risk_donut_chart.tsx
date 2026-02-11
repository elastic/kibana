/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { RiskLevelBreakdownTable } from './risk_level_breakdown_table';

const COMBINED_RISK_SCORE_KPI_QUERY_ID = 'combinedRiskScoreKpiQuery';

export const CombinedRiskDonutChart = () => {
  const { toggleStatus } = useQueryToggle(COMBINED_RISK_SCORE_KPI_QUERY_ID);
  const { deleteQuery, setQuery } = useGlobalTime();

  const { severityCount, loading, refetch, isModuleDisabled } = useCombinedRiskScoreKpi(
    !toggleStatus
  );

  useQueryInspector({
    queryId: COMBINED_RISK_SCORE_KPI_QUERY_ID,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect: undefined, // Combined query doesn't have a single inspect object
  });

  if (isModuleDisabled) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.threatHunting.entityRiskLevels"
              defaultMessage="Entity risk levels"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l" responsive={false}>
          <EuiFlexItem grow={1}>
            <RiskLevelBreakdownTable severityCount={severityCount} loading={loading} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <RiskScoreDonutChart severityCount={severityCount} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
