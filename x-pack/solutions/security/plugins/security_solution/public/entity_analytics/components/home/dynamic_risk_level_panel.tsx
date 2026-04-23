/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import { EMPTY_SEVERITY_COUNT, RiskSeverity } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';
import { RiskLevelBreakdownTable } from './risk_level_breakdown_table';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { useUiSetting } from '../../../common/lib/kibana';
import { useRiskLevelsEsqlQuery } from '../watchlists/components/hooks/use_risk_levels_esql_query';

interface DynamicRiskLevelPanelProps {
  watchlistId?: string;
  watchlistName?: string;
}

export const DynamicRiskLevelPanel: React.FC<DynamicRiskLevelPanelProps> = ({
  watchlistId,
  watchlistName,
}) => {
  const spaceId = useSpaceId();
  const hasWatchlist = !!watchlistId;
  const isEntityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2) === true;

  const useLegacy = !isEntityStoreV2Enabled;

  const combinedRiskStats = useCombinedRiskScoreKpi(!useLegacy);
  const riskLevelsStats = useRiskLevelsEsqlQuery({
    watchlistId: watchlistId ?? '',
    skip: useLegacy,
    spaceId: spaceId ?? '',
  });

  const severityCount = useMemo(() => {
    if (useLegacy) {
      return combinedRiskStats.severityCount ?? EMPTY_SEVERITY_COUNT;
    }
    const records = riskLevelsStats.records ?? [];
    return {
      [RiskSeverity.Critical]: records.find((r) => r.level === RiskSeverity.Critical)?.count ?? 0,
      [RiskSeverity.High]: records.find((r) => r.level === RiskSeverity.High)?.count ?? 0,
      [RiskSeverity.Moderate]: records.find((r) => r.level === RiskSeverity.Moderate)?.count ?? 0,
      [RiskSeverity.Low]: records.find((r) => r.level === RiskSeverity.Low)?.count ?? 0,
      [RiskSeverity.Unknown]:
        records.find((r) => r.level === RiskSeverity.Unknown || r.level === null)?.count ?? 0,
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
                    watchlistName: watchlistName ?? watchlistId,
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
