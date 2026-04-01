/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getWatchlistName } from '../../../../common/entity_analytics/watchlists/constants';
import { RiskSeverity } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';
import { RiskLevelBreakdownTable } from './risk_level_breakdown_table';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { useKibana } from '../../../common/lib/kibana';
import { useRiskLevelsEsqlQuery } from '../watchlists/components/hooks/use_risk_levels_esql_query';

interface DynamicRiskLevelPanelProps {
  watchlistId?: string;
}

export const DynamicRiskLevelPanel: React.FC<DynamicRiskLevelPanelProps> = ({ watchlistId }) => {
  const spaceId = useSpaceId();
  const hasWatchlist = !!watchlistId;
  const { uiSettings } = useKibana().services;
  const isEntityStoreV2Enabled = uiSettings.get<boolean>('securitySolution:entityStoreEnableV2');

  const useLegacy = !isEntityStoreV2Enabled;

  const combinedRiskStats = useCombinedRiskScoreKpi(!useLegacy);
  const riskLevelsStats = useRiskLevelsEsqlQuery({
    watchlistId: watchlistId ?? '',
    skip: useLegacy,
    spaceId: spaceId ?? '',
  });

  const severityCount = useMemo(() => {
    if (useLegacy) {
      return combinedRiskStats.severityCount;
    }
    return {
      [RiskSeverity.Critical]:
        riskLevelsStats.records.find((r) => r.level === RiskSeverity.Critical)?.count ?? 0,
      [RiskSeverity.High]:
        riskLevelsStats.records.find((r) => r.level === RiskSeverity.High)?.count ?? 0,
      [RiskSeverity.Moderate]:
        riskLevelsStats.records.find((r) => r.level === RiskSeverity.Moderate)?.count ?? 0,
      [RiskSeverity.Low]:
        riskLevelsStats.records.find((r) => r.level === RiskSeverity.Low)?.count ?? 0,
      [RiskSeverity.Unknown]:
        riskLevelsStats.records.find((r) => r.level === RiskSeverity.Unknown || r.level === null)
          ?.count ?? 0,
    };
  }, [useLegacy, combinedRiskStats.severityCount, riskLevelsStats.records]);

  const loading = useLegacy ? combinedRiskStats.loading : riskLevelsStats.isLoading;

  return (
    <EuiFlexGroup direction="column" gutterSize="m" css={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" css={{ minHeight: 40 }}>
          <EuiTitle size="s">
            <h3>
              {hasWatchlist ? (
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.dynamicRiskLevel.watchlistTitle"
                  defaultMessage="{watchlistName} risk levels"
                  values={{
                    watchlistName: getWatchlistName(watchlistId),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.dynamicRiskLevel.entityTitle"
                  defaultMessage="Entity risk levels"
                />
              )}
            </h3>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
          <EuiFlexItem grow={4}>
            <RiskLevelBreakdownTable severityCount={severityCount} loading={loading} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <RiskScoreDonutChart showLegend={false} severityCount={severityCount} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
