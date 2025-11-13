/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import { DonutChart, type DonutChartProps } from '../../../../common/components/charts/donutchart';
import { ChartLabel } from '../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { EntityType, RiskSeverity } from '../../../../../common/search_strategy';
import type { SeverityCount } from '../../severity/types';
import { useRiskScoreKpi } from '../../../api/hooks/use_risk_score_kpi';
import { useRiskScoreFillColor } from '../../risk_score_donut_chart/use_risk_score_fill_color';
import { useEntityAnalyticsTypes } from '../../../hooks/use_enabled_entity_types';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import {
  COUNT_COLUMN,
  RANGE_COLUMN,
  RISK_LEVEL_COLUMN,
  RISK_LEVEL_CONFIG,
  type RiskLevelDatum,
} from './constants';

const QUERY_ID = 'ThreatHuntingEntityRiskLevels';

const createEmptySeverityCount = (): SeverityCount =>
  ({
    [RiskSeverity.Unknown]: 0,
    [RiskSeverity.Low]: 0,
    [RiskSeverity.Moderate]: 0,
    [RiskSeverity.High]: 0,
    [RiskSeverity.Critical]: 0,
  } as SeverityCount);

const getSeverityValue = (counts: SeverityCount, severity: RiskSeverity): number =>
  counts[severity as keyof SeverityCount];

const RiskLevelsTable = ({ items, loading }: { items: RiskLevelDatum[]; loading: boolean }) => (
  <EuiBasicTable
    columns={[RISK_LEVEL_COLUMN, RANGE_COLUMN, COUNT_COLUMN]}
    items={items}
    loading={loading}
    responsiveBreakpoint={false}
  />
);

const donutHeight = 180;

const RiskLevelsPie = ({
  data,
  fillColor,
  totalCount,
}: {
  data: DonutChartProps['data'];
  fillColor: DonutChartProps['fillColor'];
  totalCount: number;
}) => (
  <DonutChart
    data={data}
    fillColor={fillColor}
    height={donutHeight}
    title={<ChartLabel count={totalCount} />}
    label={
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.totalEntities"
        defaultMessage="entities"
      />
    }
    totalCount={totalCount}
  />
);

export const ThreatHuntingEntityRiskLevels: React.FC = () => {
  const { from, to } = useGlobalTime();
  const { filterQuery } = useGlobalFilterQuery();
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const entityTypes = useEntityAnalyticsTypes();
  const enabledEntities = useMemo(() => {
    const types: EntityType[] = [];
    if (entityTypes.includes(EntityType.host)) {
      types.push(EntityType.host);
    }
    if (entityTypes.includes(EntityType.user)) {
      types.push(EntityType.user);
    }
    if (entityTypes.includes(EntityType.service)) {
      types.push(EntityType.service);
    }
    return types;
  }, [entityTypes]);

  const { toggleStatus, setToggleStatus } = useQueryToggle(QUERY_ID);

  const { severityCount: combinedSeverityCount, loading: kpiLoading } = useRiskScoreKpi({
    filterQuery,
    timerange,
    riskEntities: enabledEntities,
    skip: !toggleStatus || enabledEntities.length === 0,
  });

  const aggregatedSeverityCount = useMemo<SeverityCount>(() => {
    if (!toggleStatus || !combinedSeverityCount) {
      return createEmptySeverityCount();
    }

    return { ...createEmptySeverityCount(), ...combinedSeverityCount };
  }, [combinedSeverityCount, toggleStatus]);

  const riskLevelItems = useMemo<RiskLevelDatum[]>(
    () =>
      RISK_LEVEL_CONFIG.map(({ severity, label, range }) => ({
        riskLevel: label,
        range,
        entities: getSeverityValue(aggregatedSeverityCount, severity),
      })),
    [aggregatedSeverityCount]
  );

  const donutData = useMemo<DonutChartProps['data']>(
    () =>
      RISK_LEVEL_CONFIG.map(({ severity, label }) => ({
        key: severity,
        label,
        value: getSeverityValue(aggregatedSeverityCount, severity),
      })),
    [aggregatedSeverityCount]
  );

  const totalEntities = useMemo(
    () => Object.values(aggregatedSeverityCount).reduce((sum, count) => sum + count, 0),
    [aggregatedSeverityCount]
  );

  const baseFillColor = useRiskScoreFillColor();
  const labelToSeverity = useMemo(
    () => new Map(RISK_LEVEL_CONFIG.map(({ severity, label }) => [label, severity])),
    []
  );
  const fillColor = useCallback(
    (dataName: string) => {
      const severity = labelToSeverity.get(dataName);
      // If severity is not found in the map (shouldn't happen in normal operation),
      // pass empty string to baseFillColor which will return emptyDonutColor as fallback.
      // We use empty string instead of dataName because dataName is an i18n translated string
      // and won't match the RiskSeverity enum keys expected by baseFillColor.
      const severityString = severity ?? '';
      return baseFillColor(severityString);
    },
    [baseFillColor, labelToSeverity]
  );

  const isLoading = toggleStatus && kpiLoading;

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      color="plain"
      data-test-subj="threatHuntingRiskLevelsPanel"
    >
      <HeaderSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.title"
            defaultMessage="Entity risk levels"
          />
        }
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        toggleAriaLabel={i18n.translate(
          'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.toggleAriaLabel',
          {
            defaultMessage: 'Toggle entity risk levels panel',
          }
        )}
        hideSubtitle
      />
      {toggleStatus && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={1}>
              <RiskLevelsTable items={riskLevelItems} loading={isLoading} />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <RiskLevelsPie data={donutData} fillColor={fillColor} totalCount={totalEntities} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};

ThreatHuntingEntityRiskLevels.displayName = 'ThreatHuntingEntityRiskLevels';
