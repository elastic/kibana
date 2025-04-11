/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { BrushEndListener } from '@elastic/charts';
import { type XYBrushEvent } from '@elastic/charts';
import { useSummaryTimeRange, ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { useBoolean } from '@kbn/react-hooks';
import type { TimeRange } from '@kbn/es-query';
import { INFRA_ALERT_CONSUMERS } from '../../../../../../../common/constants';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { HeightRetainer } from '../../../../../../components/height_retainer';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useAlertsQuery } from '../../../hooks/use_alerts_query';
import type { HostsState } from '../../../hooks/use_unified_search_url_state';
import type { AlertsEsQuery } from '../../../../../../utils/filters/create_alerts_es_query';
import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
} from '../../../../../../components/shared/alerts/constants';
import AlertsStatusFilter from '../../../../../../components/shared/alerts/alerts_status_filter';
import { CreateAlertRuleButton } from '../../../../../../components/shared/alerts/links/create_alert_rule_button';
import { LinkToAlertsPage } from '../../../../../../components/shared/alerts/links/link_to_alerts_page';
import { AlertFlyout } from '../../../../../../alerting/inventory/components/alert_flyout';
import { usePluginConfig } from '../../../../../../containers/plugin_config_context';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';

export const AlertsTabContent = () => {
  const { featureFlags } = usePluginConfig();
  const { hostNodes } = useHostsViewContext();

  const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();
  const [isAlertFlyoutVisible, { toggle: toggleAlertFlyout }] = useBoolean(false);

  const { onDateRangeChange, searchCriteria } = useUnifiedSearchContext();

  const hostNamesKuery = hostNodes.map((host) => `host.name: "${host.name}"`).join(' OR ');

  return (
    <HeightRetainer>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-alerts">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter onChange={setAlertStatus} status={alertStatus} />
          </EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
            {featureFlags.inventoryThresholdAlertRuleEnabled && (
              <EuiFlexItem grow={false}>
                <CreateAlertRuleButton
                  onClick={toggleAlertFlyout}
                  data-test-subj="infraHostAlertsTabCreateAlertsRuleButton"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <LinkToAlertsPage
                dateRange={searchCriteria.dateRange}
                data-test-subj="infraHostAlertsTabAlertsShowAllButton"
                kuery={hostNamesKuery}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiFlexItem>
          <MemoAlertSummaryWidget
            alertsQuery={alertsEsQueryByStatus}
            dateRange={searchCriteria.dateRange}
            onRangeSelection={onDateRangeChange}
          />
        </EuiFlexItem>
        {alertsEsQueryByStatus && (
          <EuiFlexItem>
            <ObservabilityAlertsTable
              id={ALERTS_TABLE_ID}
              ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS}
              consumers={INFRA_ALERT_CONSUMERS}
              initialPageSize={ALERTS_PER_PAGE}
              query={alertsEsQueryByStatus}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {featureFlags.inventoryThresholdAlertRuleEnabled && (
        <AlertFlyout
          nodeType="host"
          setVisible={toggleAlertFlyout}
          visible={isAlertFlyoutVisible}
        />
      )}
    </HeightRetainer>
  );
};

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: HostsState['dateRange'];
  onRangeSelection: (dateRange: TimeRange) => void;
}

const MemoAlertSummaryWidget = React.memo(
  ({ alertsQuery, dateRange, onRangeSelection }: MemoAlertSummaryWidgetProps) => {
    const { services } = useKibanaContextForPlugin();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const { charts, triggersActionsUi } = services;
    const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

    const onBrushEnd: BrushEndListener = (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (x) {
        const [start, end] = x;

        const from = new Date(start).toISOString();
        const to = new Date(end).toISOString();

        onRangeSelection({ from, to });
      }
    };

    const chartProps = {
      baseTheme: charts.theme.useChartsBaseTheme(),
      onBrushEnd,
    };

    return (
      <AlertSummaryWidget
        chartProps={chartProps}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS}
        consumers={INFRA_ALERT_CONSUMERS}
        filter={alertsQuery}
        fullSize
        timeRange={summaryTimeRange}
      />
    );
  }
);
