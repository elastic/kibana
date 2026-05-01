/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';
import { ENTITY_RISK_LEVEL_FIELD, RiskLevelBreakdownTable } from './risk_level_breakdown_table';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { useKibana, useUiSetting } from '../../../common/lib/kibana';
import { useRiskLevelsEsqlQuery } from '../watchlists/components/hooks/use_risk_levels_esql_query';
import { esqlRecordsToSeverityCount, type EsqlSeverityRecord } from '../../common/utils';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';

const ENTITY_RISK_LEVEL_QUERY_ID = 'entity-risk-level-query';

// Wide "all time" range used to neutralize the global date picker on the
// Entity Analytics home page, where the picker is intentionally hidden and
// risk levels must match the counts in the entities table.
const ALL_TIME_RANGE = { from: 'now-100y', to: 'now' } as const;

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
  const isEntityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2) === true;
  const { setQuery, deleteQuery } = useGlobalTime();

  const useLegacy = !isEntityStoreV2Enabled;

  const combinedRiskStats = useCombinedRiskScoreKpi(!useLegacy, {
    timerangeOverride: ALL_TIME_RANGE,
  });
  const riskLevelsStats = useRiskLevelsEsqlQuery({
    watchlistId: watchlistId ?? '',
    skip: useLegacy,
    spaceId: spaceId ?? '',
    // The Entity Analytics home page intentionally hides the global date
    // picker, so risk levels are shown across the entire entities-latest
    // index to keep the chart aligned with the entities table below it.
    applyGlobalTimeFilter: false,
  });

  const severityCount = useMemo(() => {
    if (useLegacy) {
      return combinedRiskStats.severityCount ?? EMPTY_SEVERITY_COUNT;
    }
    return esqlRecordsToSeverityCount((riskLevelsStats.records ?? []) as EsqlSeverityRecord[]);
  }, [useLegacy, combinedRiskStats.severityCount, riskLevelsStats.records]);

  const loading = useLegacy ? combinedRiskStats.loading : riskLevelsStats.isLoading;

  useQueryInspector({
    queryId: ENTITY_RISK_LEVEL_QUERY_ID,
    inspect: useLegacy ? combinedRiskStats.inspect : riskLevelsStats.inspect,
    loading,
    refetch: useLegacy ? combinedRiskStats.refetch : riskLevelsStats.refetch,
    setQuery,
    deleteQuery,
  });

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

  const title = hasWatchlist ? (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.dynamicRiskLevel.watchlistTitle"
      defaultMessage="{watchlistName} risk levels"
      values={{ watchlistName: watchlistName ?? watchlistId }}
    />
  ) : (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.dynamicRiskLevel.entityTitle"
      defaultMessage="Entity risk levels"
    />
  );

  return (
    <InspectButtonContainer>
      <EuiFlexGroup direction="column" gutterSize="m" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" css={{ minHeight: 40 }}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InspectButton queryId={ENTITY_RISK_LEVEL_QUERY_ID} title={title} />
            </EuiFlexItem>
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
    </InspectButtonContainer>
  );
};
