/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { AlertConsumers, SYNTHETICS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { useRefreshedRangeFromUrl } from '../../../hooks';
import { SyntheticsDatePicker } from '../../common/date_picker/synthetics_date_picker';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { ClientPluginsStart } from '../../../../../plugin';

export const MONITOR_ALERTS_TABLE_ID = 'xpack.observability.slo.sloDetails.alertTable';

export function MonitorDetailsAlerts() {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
    observability: { observabilityRuleTypeRegistry },
  } = useKibana<ClientPluginsStart>().services;

  const { monitorId: configId } = useParams<{ monitorId: string }>();

  const selectedLocation = useSelectedLocation();
  const { from, to } = useRefreshedRangeFromUrl();

  if (!selectedLocation) {
    return <EuiLoadingSpinner size="xl" />;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiFlexItem>
          <SyntheticsDatePicker fullWidth={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertsStateTable
            alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
            configurationId={AlertConsumers.OBSERVABILITY}
            id={MONITOR_ALERTS_TABLE_ID}
            data-test-subj="monitorAlertsTable"
            ruleTypeIds={SYNTHETICS_RULE_TYPE_IDS}
            consumers={[AlertConsumers.UPTIME, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY]}
            query={{
              bool: {
                filter: [
                  { term: { configId } },
                  { term: { 'location.id': selectedLocation?.id } },
                  { range: { '@timestamp': { gte: from, lte: to } } },
                ],
              },
            }}
            showAlertStatusWithFlapping
            initialPageSize={100}
            cellContext={{ observabilityRuleTypeRegistry }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
