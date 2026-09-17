/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { Position } from '@elastic/charts';
import { RECORDS_FIELD } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../../common/constants/synthetics_alerts';
import type { ClientPluginsStart } from '../../../../../../plugin';
import { useGetUrlParams } from '../../../../hooks';
import { useOverviewRefreshedRange } from '../../common/use_overview_date_range';
import { AlertsLink } from '../../../common/links/view_alerts';
import {
  ERRORS_LABEL,
  ErrorStatesIconTip,
} from '../../../monitor_details/monitor_summary/monitor_errors_count';
import { useMonitorFilters } from '../../hooks/use_monitor_filters';
import { useMonitorQueryFilters } from '../../hooks/use_monitor_query_filters';
import { useOverviewDataViewIndexPatterns } from '../../hooks/use_overview_data_view_index_patterns';
import { OverviewErrorsCount } from './overview_errors/overview_errors_count';

// The Lens embeddable only ever resolves a single data view, scoped to the
// first series' dataType (see exploratory_view's embeddable/index.tsx), so an
// `alerts` layer can't share this chart with the `synthetics` ping/error
// layers below — it renders as a separate small embeddable instead.
const AlertsCount = ({ from, to }: { from: string; to: string }) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  const { euiTheme } = useEuiTheme();
  const { locations } = useGetUrlParams();
  const alertsFilters = useMonitorFilters({ forAlerts: true });
  const time = useMemo(() => ({ from, to }), [from, to]);

  return (
    <ExploratoryViewEmbeddable
      id="overviewActivityAlertsCount"
      dataTestSubj="overviewActivityAlertsCount"
      align="left"
      customHeight="70px"
      reportType="single-metric"
      attributes={[
        {
          time,
          reportDefinitions: {
            'kibana.alert.rule.rule_type_id': [SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE],
            ...(locations?.length ? { 'observer.geo.name': locations } : {}),
          },
          dataType: 'alerts',
          selectedMetricField: RECORDS_FIELD,
          name: alertsLabel,
          filters: [
            { field: 'kibana.alert.status', values: ['active', 'recovered'] },
            ...alertsFilters,
          ],
          color: euiTheme.colors.vis.euiColorVis6,
        },
      ]}
    />
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
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{headingText}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ErrorStatesIconTip />
                </EuiFlexItem>
              </EuiFlexGroup>
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertsLink />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false} css={{ minWidth: 120 }}>
          <OverviewErrorsCount from={from} to={to} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: 120 }}>
          <AlertsCount from={from} to={to} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          {!loading && (
            <ExploratoryViewEmbeddable
              id="overviewActivityChart"
              dataTestSubj="overviewActivityChart"
              reportType="kpi-over-time"
              customHeight={ACTIVITY_CHART_HEIGHT}
              legendIsVisible={true}
              legendPosition={Position.Bottom}
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const headingText = i18n.translate('xpack.synthetics.overview.activity.headingText', {
  defaultMessage: 'Checks, errors & alerts',
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
