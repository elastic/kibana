/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RiskScoreDonutChart } from './risk_score_donut_chart';
import { useWatchlistRiskLevelsQuery } from './watchlists/hooks/use_watchlist_risk_levels_query';
import { RiskSeverity } from '../../../common/search_strategy';
import { PREBUILT_WATCHLIST_NAMES } from '../../../common/entity_analytics/watchlists/constants';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { RiskLevelBreakdownTable } from './threat_hunting/risk_level_breakdown_table';
import { useCombinedRiskScoreKpi } from './threat_hunting/use_combined_risk_score_kpi';

interface DynamicRiskLevelPanelProps {
  watchlistId?: string;
  skip?: boolean;
}

export const DynamicRiskLevelPanel: React.FC<DynamicRiskLevelPanelProps> = ({
  watchlistId,
  skip = false,
}) => {
  const spaceId = useSpaceId();
  const hasWatchlist = !!watchlistId;

  // Always call both hooks, but use `skip` to prevent unnecessary network requests
  const combinedRiskStats = useCombinedRiskScoreKpi(skip || hasWatchlist);
  const watchlistRiskStats = useWatchlistRiskLevelsQuery({
    watchlistId: watchlistId ?? '',
    skip: skip || !hasWatchlist,
    spaceId: spaceId ?? '',
  });

  const severityCount = useMemo(() => {
    if (hasWatchlist) {
      return {
        [RiskSeverity.Critical]:
          watchlistRiskStats.records.find((r) => r.level === RiskSeverity.Critical)?.count ?? 0,
        [RiskSeverity.High]:
          watchlistRiskStats.records.find((r) => r.level === RiskSeverity.High)?.count ?? 0,
        [RiskSeverity.Moderate]:
          watchlistRiskStats.records.find((r) => r.level === RiskSeverity.Moderate)?.count ?? 0,
        [RiskSeverity.Low]:
          watchlistRiskStats.records.find((r) => r.level === RiskSeverity.Low)?.count ?? 0,
        [RiskSeverity.Unknown]:
          watchlistRiskStats.records.find((r) => r.level === RiskSeverity.Unknown)?.count ?? 0,
      };
    }
    return combinedRiskStats.severityCount;
  }, [hasWatchlist, combinedRiskStats.severityCount, watchlistRiskStats.records]);

  const loading = hasWatchlist ? watchlistRiskStats.isLoading : combinedRiskStats.loading;
  const isModuleDisabled = hasWatchlist
    ? !watchlistRiskStats.hasEngineBeenInstalled
    : combinedRiskStats.isModuleDisabled;

  if (isModuleDisabled && !loading) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h3>
            {hasWatchlist ? (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.dynamicRiskLevel.watchlistTitle"
                defaultMessage="{watchlistName} risk levels"
                values={{
                  watchlistName: PREBUILT_WATCHLIST_NAMES[watchlistId] ?? watchlistId,
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
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
          <EuiFlexItem grow={4}>
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
