/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from '@emotion/styled';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { InventoryView } from '../../../../../common/inventory_views';
import type { SnapshotNode } from '../../../../../common/http_api';
import { AutoSizer } from '../../../../components/auto_sizer';
import { NodesOverview } from './nodes_overview';
import { calculateBoundsFromNodes } from '../lib/calculate_bounds_from_nodes';
import { PageContent } from '../../../../components/page';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import type { WaffleLegendOptions } from '../hooks/use_waffle_options';
import { DEFAULT_LEGEND, useWaffleOptionsContext } from '../hooks/use_waffle_options';
import type { InfraWaffleMapBounds } from '../../../../common/inventory/types';
import { InfraFormatterType } from '../../../../common/inventory/types';
import { Toolbar } from './toolbars/toolbar';
import { ViewSwitcher } from './waffle/view_switcher';
import { createInventoryMetricFormatter } from '../lib/create_inventory_metric_formatter';
import { createLegend } from '../lib/create_legend';
import { BottomDrawer } from './bottom_drawer';
import { LegendControls } from './waffle/legend_controls';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import { KubernetesDashboardCard } from '../../../../components/kubernetes_dashboard_promotion/kubernetes_dashboard_promotion';
import { useInstalledIntegration } from '../../../../hooks/use_installed_integration';

interface Props {
  currentView?: InventoryView | null;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
  legend: WaffleLegendOptions;
}

export const Layout = React.memo(({ interval, nodes, loading }: Props) => {
  const [showLoading, setShowLoading] = useState(true);
  const {
    metric,
    groupBy,
    sort,
    nodeType,
    changeView,
    view,
    autoBounds,
    boundsOverride,
    legend,
    changeBoundsOverride,
    changeAutoBounds,
    changeLegend,
  } = useWaffleOptionsContext();
  const { currentTime, jumpToTime, isAutoReloading } = useWaffleTimeContext();
  const { applyFilterQuery } = useWaffleFiltersContext();
  const { data: timeRangeMetadata } = useTimeRangeMetadataContext();
  const legendPalette = legend?.palette ?? DEFAULT_LEGEND.palette;
  const legendSteps = legend?.steps ?? DEFAULT_LEGEND.steps;
  const legendReverseColors = legend?.reverseColors ?? DEFAULT_LEGEND.reverseColors;
  const AUTO_REFRESH_INTERVAL = 5 * 1000;
  const schemas: DataSchemaFormat[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata?.schemas]
  );

  const hasElasticSchema = schemas.includes('ecs');
  const hasOtelSchema = schemas.includes('semconv');
  const { isInstalled: hasEcsK8sIntegration } = useInstalledIntegration('kubernetes');
  const { isInstalled: hasOtelK8sIntegration } = useInstalledIntegration('kubernetes_otel');

  const [ecsK8sCardDismissed, setEcsK8sCardDismissed] = useState(false);
  const [otelK8sCardDismissed, setOtelK8sCardDismissed] = useState(false);

  const showEcsK8sDashboardCard = hasElasticSchema && !ecsK8sCardDismissed;
  const showOtelK8sDashboardCard = hasOtelSchema && !otelK8sCardDismissed;

  const options = {
    formatter: InfraFormatterType.percent,
    formatTemplate: '{{value}}',
    legend: createLegend(legendPalette, legendSteps, legendReverseColors),
    metric,
    sort,
    groupBy,
  };

  useInterval(
    () => {
      if (!loading) {
        jumpToTime(Date.now());
      }
    },
    isAutoReloading ? AUTO_REFRESH_INTERVAL : null
  );

  const dataBounds = calculateBoundsFromNodes(nodes);
  const bounds = autoBounds ? dataBounds : boundsOverride;

  const formatter = useCallback(
    (val: string | number) => createInventoryMetricFormatter(options.metric)(val),
    [options.metric]
  );

  const onDrilldown = useCallback(
    (expression: string) => {
      applyFilterQuery({
        query: {
          language: 'kuery',
          query: expression,
        },
      });
    },
    [applyFilterQuery]
  );

  useEffect(() => {
    setShowLoading(true);
  }, [options.metric, nodeType]);

  useEffect(() => {
    const hasNodes = nodes && nodes.length;
    // Don't show loading screen when we're auto-reloading
    setShowLoading(!hasNodes);
  }, [nodes]);

  const handleLegendControlChange = useCallback(
    (opts: LegendControlOptions) => {
      changeBoundsOverride(opts.bounds);
      changeAutoBounds(opts.auto);
      changeLegend(opts.legend);
    },
    [changeBoundsOverride, changeAutoBounds, changeLegend]
  );

  return (
    <>
      <PageContent>
        <EuiFlexGroup direction="column" gutterSize="s">
          <TopActionContainer grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
              <Toolbar nodeType={nodeType} currentTime={currentTime} />
              <EuiFlexGroup
                responsive={false}
                css={css`
                  margin: 0;
                  justify-content: flex-end;
                `}
              >
                {view === 'map' && (
                  <EuiFlexItem grow={false}>
                    <LegendControls
                      options={legend != null ? legend : DEFAULT_LEGEND}
                      dataBounds={dataBounds}
                      bounds={bounds}
                      autoBounds={autoBounds}
                      boundsOverride={boundsOverride}
                      onChange={handleLegendControlChange}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <ViewSwitcher view={view} onChange={changeView} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </TopActionContainer>
          {nodeType === 'pod' &&
            (showEcsK8sDashboardCard || showOtelK8sDashboardCard) &&
            !loading && (
              <EuiFlexGroup css={{ flexGrow: 0 }} direction="row">
                {showEcsK8sDashboardCard && (
                  <EuiFlexItem>
                    <KubernetesDashboardCard
                      integrationType="ecs"
                      onClose={() => setEcsK8sCardDismissed(true)}
                      hasIntegrationInstalled={hasEcsK8sIntegration}
                    />
                  </EuiFlexItem>
                )}
                {showOtelK8sDashboardCard && (
                  <EuiFlexItem>
                    <KubernetesDashboardCard
                      integrationType="otel"
                      onClose={() => setOtelK8sCardDismissed(true)}
                      hasIntegrationInstalled={hasOtelK8sIntegration}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          <EuiFlexItem
            grow={false}
            css={css`
              position: relative;
              flex: 1 1 auto;
            `}
          >
            <AutoSizer bounds>
              {({ bounds: { height = 0 } }) => (
                <NodesOverview
                  nodes={nodes}
                  options={options}
                  nodeType={nodeType}
                  loading={loading}
                  showLoading={showLoading}
                  onDrilldown={onDrilldown}
                  currentTime={currentTime}
                  view={view}
                  autoBounds={autoBounds}
                  boundsOverride={boundsOverride}
                  formatter={formatter}
                  bottomMargin={height}
                  isAutoReloading={isAutoReloading}
                  refreshInterval={AUTO_REFRESH_INTERVAL}
                />
              )}
            </AutoSizer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </PageContent>
      <BottomDrawer interval={interval} formatter={formatter} view={view} nodeType={nodeType} />
    </>
  );
});

const TopActionContainer = styled(EuiFlexItem)`
  padding: ${(props) => `${props.theme.euiTheme.size.m} 0`};
`;
