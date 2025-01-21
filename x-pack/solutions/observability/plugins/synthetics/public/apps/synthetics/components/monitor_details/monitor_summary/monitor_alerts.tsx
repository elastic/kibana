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
  EuiSkeletonText,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { RECORDS_FIELD } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { AlertActions } from './alert_actions';

const MONITOR_STATUS_RULE = {
  'kibana.alert.rule.category': ['Synthetics monitor status'],
};

export const MonitorAlerts = ({
  to,
  from,
  dateLabel,
}: {
  to: string;
  from: string;
  dateLabel: string;
}) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { euiTheme } = useEuiTheme();
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();
  const selectedLocation = useSelectedLocation();

  if (!selectedLocation || !queryIdFilter) {
    return <EuiSkeletonText />;
  }

  return (
    <EuiPanel hasShadow={false} paddingSize="m" hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {ALERTS_LABEL} (
              <div style={{ display: 'inline-block' }}>
                <ExploratoryViewEmbeddable
                  noLabel
                  fontSize={16}
                  lineHeight={27}
                  withActions={false}
                  customHeight={'27px'}
                  reportType="single-metric"
                  attributes={[
                    {
                      dataType: 'alerts',
                      time: {
                        from,
                        to,
                      },
                      name: 'All',
                      selectedMetricField: RECORDS_FIELD,
                      reportDefinitions: {
                        ...MONITOR_STATUS_RULE,
                        ...queryIdFilter,
                      },
                      filters: locationFilter ?? [],
                    },
                  ]}
                />
              </div>
              )
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText color="subdued" size="s">
            {dateLabel}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertActions from={from} to={to} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs" wrap={true}>
        <EuiFlexItem style={{ width: 80 }} grow={false}>
          <ExploratoryViewEmbeddable
            dataTestSubj="monitorActiveAlertsCount"
            customHeight={'120px'}
            reportType="single-metric"
            attributes={[
              {
                dataType: 'alerts',
                time: {
                  from,
                  to,
                },
                name: ACTIVE_LABEL,
                selectedMetricField: RECORDS_FIELD,
                reportDefinitions: {
                  ...MONITOR_STATUS_RULE,
                  ...queryIdFilter,
                },
                filters: [
                  { field: 'kibana.alert.status', values: ['active'] },
                  ...(locationFilter ?? []),
                ],
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 80 }}>
          <ExploratoryViewEmbeddable
            sparklineMode
            customHeight="100px"
            reportType="kpi-over-time"
            attributes={[
              {
                seriesType: 'area',
                time: {
                  from,
                  to,
                },
                reportDefinitions: {
                  ...MONITOR_STATUS_RULE,
                  ...queryIdFilter,
                },
                dataType: 'alerts',
                selectedMetricField: RECORDS_FIELD,
                name: ACTIVE_LABEL,
                filters: [
                  { field: 'kibana.alert.status', values: ['active'] },
                  ...(locationFilter ?? []),
                ],
                color: isAmsterdam
                  ? euiTheme.colors.vis.euiColorVisBehindText7
                  : euiTheme.colors.vis.euiColorVis7,
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 85, marginLeft: 40 }}>
          <ExploratoryViewEmbeddable
            customHeight={'120px'}
            reportType="single-metric"
            attributes={[
              {
                dataType: 'alerts',
                time: {
                  from,
                  to,
                },
                name: RECOVERED_LABEL,
                selectedMetricField: RECORDS_FIELD,
                reportDefinitions: {
                  ...MONITOR_STATUS_RULE,
                  ...queryIdFilter,
                },
                filters: [
                  { field: 'kibana.alert.status', values: ['recovered'] },
                  ...(locationFilter ?? []),
                ],
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 80 }}>
          <ExploratoryViewEmbeddable
            sparklineMode
            customHeight="100px"
            reportType="kpi-over-time"
            attributes={[
              {
                seriesType: 'area',
                time: {
                  from,
                  to,
                },
                reportDefinitions: {
                  ...MONITOR_STATUS_RULE,
                  ...queryIdFilter,
                },
                dataType: 'alerts',
                selectedMetricField: 'recovered_alerts',
                name: RECOVERED_LABEL,
                filters: [
                  { field: 'kibana.alert.status', values: ['recovered'] },
                  ...(locationFilter ?? []),
                ],
                color: isAmsterdam
                  ? euiTheme.colors.vis.euiColorVisBehindText0
                  : euiTheme.colors.vis.euiColorVis0,
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const ALERTS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.alerts', {
  defaultMessage: 'Alerts',
});

const ACTIVE_LABEL = i18n.translate('xpack.synthetics.detailsPanel.alerts.active', {
  defaultMessage: 'Active',
});

const RECOVERED_LABEL = i18n.translate('xpack.synthetics.detailsPanel.alerts.recovered', {
  defaultMessage: 'Recovered',
});
