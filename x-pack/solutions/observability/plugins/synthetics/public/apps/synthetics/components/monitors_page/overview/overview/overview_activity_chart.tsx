/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import type { ClientPluginsStart } from '../../../../../../plugin';
import { useOverviewRefreshedRange } from '../../common/use_overview_date_range';
import { AlertsLink } from '../../../common/links/view_alerts';
import {
  ERRORS_LABEL,
  ERROR_STATES_TOOLTIP,
} from '../../../monitor_details/monitor_summary/monitor_errors_count';
import { useErrorStats } from '../../hooks/use_error_stats';
import { useMonitorFilters } from '../../hooks/use_monitor_filters';
import { useMonitorQueryFilters } from '../../hooks/use_monitor_query_filters';
import { useOverviewAlertsCount } from '../../hooks/use_overview_alerts_count';
import { useOverviewDataViewIndexPatterns } from '../../hooks/use_overview_data_view_index_patterns';
import { MonitorStat } from './overview_status';

// Rendered as extra stats inside the Monitors status panel (see `OverviewStatus`'s
// `children` slot), so the Errors/Alerts counts sit alongside Up/Down/Pending —
// plain EuiStat via `MonitorStat`, matching those, rather than a Lens embeddable
// (which doesn't align visually with the rest of the panel).
export const OverviewActivityStats = () => {
  const { stats: errorStats } = useErrorStats();
  const { count: alertsCount } = useOverviewAlertsCount(useOverviewRefreshedRange());

  return (
    <>
      <EuiFlexItem grow={false}>
        <MonitorStat
          dataTestSubj="overviewActivityErrorStates"
          statName={ERRORS_LABEL}
          statNo={errorStats?.errorCount ?? 0}
          numberColor="danger"
          isClickable={false}
          onClickStat={() => {}}
          tooltipContent={ERROR_STATES_TOOLTIP}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <MonitorStat
              dataTestSubj="overviewActivityAlertsCount"
              statName={alertsLabel}
              statNo={alertsCount}
              numberColor="danger"
              isClickable={false}
              onClickStat={() => {}}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ paddingTop: 4 }}>
            <AlertsLink />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};

const ACTIVITY_CHART_HEIGHT = '220px';

export const OverviewActivityChart = () => {
  // Follows the page-level date picker (URL params), defaulting to the overview's
  // own window when untouched so it stays in step with the status panel.
  const { from, to } = useOverviewRefreshedRange();

  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { euiTheme } = useEuiTheme();

  const filters = useMonitorFilters({});
  const queryFilters = useMonitorQueryFilters();
  const time = useMemo(() => ({ from, to }), [from, to]);
  const { dataTypesIndexPatterns, loading } = useOverviewDataViewIndexPatterns();

  const monitorTypeReportDefinition = useMemo(
    () => ({ 'monitor.type': ['http', 'tcp', 'browser', 'icmp', 'api'] }),
    []
  );

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {!loading && (
        <ExploratoryViewEmbeddable
          id="overviewActivityChart"
          dataTestSubj="overviewActivityChart"
          reportType="kpi-over-time"
          customHeight={ACTIVITY_CHART_HEIGHT}
          legendIsVisible={true}
          legendPosition={Position.Right}
          dslFilters={queryFilters}
          dataTypesIndexPatterns={dataTypesIndexPatterns}
          attributes={[
            {
              time,
              seriesType: 'bar_stacked',
              reportDefinitions: monitorTypeReportDefinition,
              dataType: 'synthetics',
              selectedMetricField: 'summary.up',
              operationType: 'sum',
              name: upLabel,
              color: euiTheme.colors.success,
              filters,
            },
            {
              time,
              seriesType: 'bar_stacked',
              reportDefinitions: monitorTypeReportDefinition,
              dataType: 'synthetics',
              selectedMetricField: 'summary.down',
              operationType: 'sum',
              name: downLabel,
              color: euiTheme.colors.danger,
              filters,
            },
            {
              time,
              seriesType: 'line',
              reportDefinitions: monitorTypeReportDefinition,
              dataType: 'synthetics',
              selectedMetricField: 'monitor_errors',
              operationType: 'unique_count',
              name: ERRORS_LABEL,
              color: euiTheme.colors.vis.euiColorVis6,
              filters,
            },
          ]}
        />
      )}
    </EuiPanel>
  );
};

const headingText = i18n.translate('xpack.synthetics.overview.activity.headingText', {
  defaultMessage: 'Pings over time',
});

const upLabel = i18n.translate('xpack.synthetics.overview.activity.up', {
  defaultMessage: 'Up',
});

const downLabel = i18n.translate('xpack.synthetics.overview.activity.down', {
  defaultMessage: 'Down',
});

const alertsLabel = i18n.translate('xpack.synthetics.overview.activity.alerts', {
  defaultMessage: 'Alerts',
});
