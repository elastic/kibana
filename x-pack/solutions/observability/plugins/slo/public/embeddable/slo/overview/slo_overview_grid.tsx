/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALL_VALUE, HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  Chart,
  isMetricElementEvent,
  Metric,
  MetricTrendShape,
  Settings,
  MetricDatum,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '../../../hooks/use_kibana';
import { SloOverviewDetails } from '../common/slo_overview_details';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { useFetchActiveAlerts } from '../../../hooks/use_fetch_active_alerts';
import { SloCardItemBadges } from '../../../pages/slos/components/card_view/slo_card_item_badges';
import { getSloFormattedSummary } from '../../../pages/slos/hooks/use_slo_summary';
import {
  getSubTitle,
  useSloCardColor,
} from '../../../pages/slos/components/card_view/slo_card_item';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';

const getSloChartData = ({
  slo,
  historicalSummary,
  subTitle,
  cardColor,
  sliValue,
  sloTarget,
}: {
  slo: SLOWithSummaryResponse;
  subTitle: string;
  cardColor: string;
  sliValue: string;
  sloTarget: string;
  historicalSummary?: HistoricalSummaryResponse[];
}): MetricDatum => {
  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  return {
    title: slo.name,
    subtitle: subTitle,
    value: sliValue,
    trendShape: MetricTrendShape.Area,
    trend: historicalSliData?.map((d) => ({
      x: d.key as number,
      y: d.value as number,
    })),
    extra: (
      <FormattedMessage
        id="xpack.slo.sloGridItem.targetFlexItemLabel"
        defaultMessage="Target {target}"
        values={{
          target: sloTarget,
        }}
      />
    ),
    icon: () => <EuiIcon type="visGauge" size="l" />,
    color: cardColor,
  };
};

const ROW_HEIGHT = 220;
const ITEMS_PER_ROW = 4;

export function SloCardChartList({ sloId }: { sloId: string }) {
  const {
    http: { basePath },
    uiSettings,
    charts,
  } = useKibana().services;

  const baseTheme = charts.theme.useChartsBaseTheme();

  const [selectedSlo, setSelectedSlo] = React.useState<SLOWithSummaryResponse | null>(null);

  const kqlQuery = `slo.id:"${sloId}"`;

  const { data: sloList, isLoading } = useFetchSloList({
    kqlQuery,
  });

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: [[sloId, ALL_VALUE]],
    rangeFrom: 'now-24h',
  });

  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: [sloId],
  });

  const { data: historicalSummaries = [] } = useFetchHistoricalSummary({
    sloList: sloList?.results ?? [],
  });

  const { colors } = useSloCardColor();
  const chartsData: MetricDatum[][] = [[]];
  sloList?.results.forEach((slo) => {
    const subTitle = getSubTitle(slo);
    const cardColor = colors[slo.summary.status ?? 'NO_DATA'];
    const { sliValue, sloTarget } = getSloFormattedSummary(slo, uiSettings, basePath);

    const historicalSummary =
      historicalSummaries.find(
        (hist) => hist.sloId === slo.id && hist.instanceId === slo.instanceId
      )?.data ?? [];

    const lastArray = chartsData[chartsData.length - 1];
    if (lastArray.length >= 4) {
      // If the last array has reached its maximum length, create a new array
      chartsData.push([]);
    }

    const rules = rulesBySlo?.[slo?.id];
    const activeAlerts = activeAlertsBySlo.get(slo);

    const data = getSloChartData({
      slo,
      subTitle,
      cardColor,
      sliValue,
      sloTarget,
      historicalSummary,
    });
    data.body = (
      <SloCardItemBadges
        slo={slo}
        rules={rules}
        activeAlerts={activeAlerts}
        handleCreateRule={() => {}}
      />
    );
    chartsData[chartsData.length - 1].push(data);
  });

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const height = sloList?.results
    ? ROW_HEIGHT * Math.ceil(sloList.results.length / ITEMS_PER_ROW)
    : ROW_HEIGHT;

  return (
    <>
      <div data-shared-item="" style={{ width: '100%', overflow: 'auto' }}>
        <Chart
          size={{
            height,
          }}
        >
          <Settings
            baseTheme={baseTheme}
            onElementClick={([d]) => {
              if (isMetricElementEvent(d)) {
                const { columnIndex, rowIndex } = d;
                const slo = sloList?.results[rowIndex * ITEMS_PER_ROW + columnIndex];
                setSelectedSlo(slo ?? null);
              }
            }}
            locale={i18n.getLocale()}
          />
          <Metric id={`slo-id-instances`} data={chartsData} />
        </Chart>
      </div>
      <SloOverviewDetails slo={selectedSlo} setSelectedSlo={setSelectedSlo} />
    </>
  );
}
