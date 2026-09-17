/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useMemo } from 'react';
import type { ClientPluginsStart } from '../../../../../../plugin';
import { useSyntheticsRefreshContext } from '../../../../contexts';
import { useUrlParams } from '../../../../hooks';
import { useOverviewRefreshedRange } from '../../common/use_overview_date_range';
import { useAlertsUrl } from '../../../monitor_details/monitor_summary/alert_actions';
import { ERRORS_LABEL } from '../../../monitor_details/monitor_summary/monitor_errors_count';
import { useMonitorFilters } from '../../hooks/use_monitor_filters';
import { useMonitorQueryFilters } from '../../hooks/use_monitor_query_filters';
import { useOverviewAlertsAnnotations } from '../../hooks/use_overview_alerts_annotations';
import { useOverviewAlertsCount } from '../../hooks/use_overview_alerts_count';
import { useOverviewDataViewIndexPatterns } from '../../hooks/use_overview_data_view_index_patterns';
import type { MonitorStatProps } from './overview_status';

// Fed into the Monitors status panel's `extraStats` (see `OverviewStatus`), so the
// Alerts count sits alongside Up/Down/Pending as a plain EuiStat — matching those,
// rather than a Lens embeddable (which doesn't align visually with the rest of the
// row). No standalone Errors stat: the chart below already shows error states as a
// line, and `Down` already covers current status, so a separate count would just
// restate the chart.
export const useOverviewActivityStats = (): MonitorStatProps[] => {
  const { from, to } = useOverviewRefreshedRange();
  const { count: alertsCount } = useOverviewAlertsCount({ from, to });
  // Same range the count above is scoped to — otherwise the count and the
  // destination page's own filter can disagree (e.g. after changing the date
  // picker, or brushing the chart to a different window).
  const alertsUrl = useAlertsUrl({ rangeFrom: from, rangeTo: to });

  return [
    {
      dataTestSubj: 'overviewActivityAlertsCount',
      statName: alertsLabel,
      statNo: alertsCount,
      numberColor: 'danger',
      isClickable: true,
      onClickStat: () => {
        window.location.href = alertsUrl;
      },
    },
  ];
};

const ACTIVITY_CHART_HEIGHT = '180px';

export const OverviewActivityChart = () => {
  // Follows the page-level date picker (URL params), defaulting to the overview's
  // own window when untouched so it stays in step with the status panel.
  const { from, to } = useOverviewRefreshedRange();

  const {
    data,
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

  const annotationLayers = useOverviewAlertsAnnotations();

  const [, updateUrlParams] = useUrlParams();
  const { refreshApp } = useSyntheticsRefreshContext();

  // Lets users drag-select a window on the chart to zoom the whole overview
  // into it, the same way the page-level date picker's `onTimeChange` does.
  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      if (range?.length !== 2) {
        return;
      }
      const dateRangeStart = new Date(range[0]).toISOString();
      const dateRangeEnd = new Date(range[1]).toISOString();

      data?.query.timefilter.timefilter.setTime({ from: dateRangeStart, to: dateRangeEnd });
      updateUrlParams({ dateRangeStart, dateRangeEnd });
      refreshApp();
    },
    [data, updateUrlParams, refreshApp]
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
          annotationLayers={annotationLayers}
          onBrushEnd={onBrushEnd}
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
