/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';
import { ENTITY_RISK_LEVEL_FIELD, RiskLevelBreakdownTable } from './risk_level_breakdown_table';
import { useKibana } from '../../../common/lib/kibana';
import { useRiskLevelsEsqlQuery } from '../watchlists/components/hooks/use_risk_levels_esql_query';
import { esqlRecordsToSeverityCount, type EsqlSeverityRecord } from '../../common/utils';

interface DynamicRiskLevelPanelProps {
  watchlistId?: string;
  watchlistName?: string;
  /**
   * The ad-hoc entity store data view used to resolve the field spec for
   * `entity.risk.calculated_level` when rendering inline cell actions.
   */
  entityDataView?: DataView;
}

export const DynamicRiskLevelPanel: React.FC<DynamicRiskLevelPanelProps> = ({
  watchlistId,
  watchlistName,
  entityDataView,
}) => {
  const spaceId = useSpaceId();
  const hasWatchlist = !!watchlistId;
  const { filterManager } = useKibana().services.data.query;

  const riskLevelsStats = useRiskLevelsEsqlQuery({
    watchlistId: watchlistId ?? '',
    skip: false,
    spaceId: spaceId ?? '',
    // The Entity Analytics home page intentionally hides the global date
    // picker, so risk levels are shown across the entire entities-latest
    // index to keep the chart aligned with the entities table below it.
    applyGlobalTimeFilter: false,
  });

  const severityCount = useMemo(
    () => esqlRecordsToSeverityCount((riskLevelsStats.records ?? []) as EsqlSeverityRecord[]),
    [riskLevelsStats.records]
  );

  const loading = riskLevelsStats.isLoading;

  const handlePartitionClick = useCallback(
    (level: RiskSeverity) => {
      filterManager.addFilters([
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { match_phrase: { [ENTITY_RISK_LEVEL_FIELD]: level } },
        },
      ]);
    },
    [filterManager]
  );

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
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={3}>
            <RiskLevelBreakdownTable
              severityCount={severityCount}
              loading={loading}
              entityDataView={entityDataView}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <RiskScoreDonutChart
              showLegend={false}
              severityCount={severityCount}
              onPartitionClick={handlePartitionClick}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
