/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import type { TimeRange } from '@kbn/es-query';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { INFRA_ALERT_CONSUMERS } from '../../../../common/constants';
import type { AlertsCount } from '../../../hooks/use_alerts_count';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { createAlertsEsQuery } from '../../../utils/filters/create_alerts_es_query';
import { ALERT_STATUS_ALL } from './constants';
import AlertsStatusFilter from './alerts_status_filter';
import { useAssetDetailsUrlState } from '../../asset_details/hooks/use_asset_details_url_state';

interface AlertsOverviewProps {
  assetId: string;
  dateRange: TimeRange;
  onLoaded: (alertsCount?: AlertsCount) => void;
  onRangeSelection?: (dateRange: TimeRange) => void;
  assetType?: InventoryItemType;
}

export const AlertsOverview = ({
  assetId,
  dateRange,
  onLoaded,
  onRangeSelection,
  assetType,
}: AlertsOverviewProps) => {
  const { services } = useKibanaContextForPlugin();
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>(
    urlState?.alertStatus ?? ALERT_STATUS_ALL
  );
  const {
    charts,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = services;

  const baseTheme = charts.theme.useChartsBaseTheme();

  const alertsEsQueryByStatus = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange,
        assetIds: [assetId],
        status: alertStatus,
        assetType,
      }),
    [dateRange, assetId, alertStatus, assetType]
  );

  const alertsEsQuery = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange,
        assetIds: [assetId],
        status: ALERT_STATUS_ALL,
        assetType,
      }),
    [assetId, assetType, dateRange]
  );

  const summaryTimeRange = useSummaryTimeRange(dateRange);

  const onBrushEnd: BrushEndListener = useCallback(
    (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (x && onRangeSelection) {
        const [start, end] = x;

        const from = new Date(start).toISOString();
        const to = new Date(end).toISOString();

        onRangeSelection({ from, to });
      }
    },
    [onRangeSelection]
  );

  const chartProps = useMemo(
    () => ({
      baseTheme,
      onBrushEnd,
    }),
    [onBrushEnd, baseTheme]
  );

  const handleAlertStatusChange = (id: AlertStatus) => {
    setAlertStatus(id);
    setUrlState({ alertStatus: id });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-alerts">
      <EuiFlexGroup justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          <AlertsStatusFilter onChange={handleAlertStatusChange} status={alertStatus} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <AlertSummaryWidget
          chartProps={chartProps}
          ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS}
          consumers={INFRA_ALERT_CONSUMERS}
          filter={alertsEsQuery}
          timeRange={summaryTimeRange}
          onLoaded={onLoaded}
          fullSize
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <ObservabilityAlertsTable
          id={'assetDetailsAlertsTable'}
          ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS}
          consumers={INFRA_ALERT_CONSUMERS}
          query={alertsEsQueryByStatus}
          initialPageSize={5}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
