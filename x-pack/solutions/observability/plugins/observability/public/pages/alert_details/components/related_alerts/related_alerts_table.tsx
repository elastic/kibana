/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { getRelatedColumns } from './get_related_columns';
import { useBuildRelatedAlertsQuery } from '../../hooks/related_alerts/use_build_related_alerts_query';
import { AlertData } from '../../../../hooks/use_fetch_alert_detail';
import {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  observabilityFeatureId,
} from '../../../..';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useKibana } from '../../../../utils/kibana_react';
import { AlertsFlyoutBody } from '../../../../components/alerts_flyout/alerts_flyout_body';
import { AlertsFlyoutFooter } from '../../../../components/alerts_flyout/alerts_flyout_footer';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../../../common/constants';
import { AlertsTableCellValue } from '../../../../components/alerts_table/common/cell_value';
import { casesFeatureIdV2 } from '../../../../../common';

interface Props {
  alertData: AlertData;
}

const columns = getRelatedColumns();
const initialSort = [
  {
    ['_score']: {
      order: 'desc' as SortOrder,
    },
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: casesFeatureIdV2,
  owner: [observabilityFeatureId],
};

const RELATED_ALERTS_TABLE_ID = 'xpack.observability.alerts.relatedAlerts';

export function RelatedAlertsTable({ alertData }: Props) {
  const { formatted: alert } = alertData;
  const esQuery = useBuildRelatedAlertsQuery({ alert });
  const { observabilityRuleTypeRegistry, config } = usePluginContext();

  const services = useKibana().services;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        title={i18n.translate(
          'xpack.observability.relatedAlertsView.euiCallOut.relatedAlertsHeuristicsLabel',
          { defaultMessage: 'Related alerts heuristics' }
        )}
        iconType="search"
      >
        <p>
          {i18n.translate('xpack.observability.relatedAlertsView.p.weAreFetchingAlertsLabel', {
            defaultMessage:
              "We are fetching relevant alerts to the current alert based on some heuristics. Soon you'll be able to tweaks the weights applied to these heuristics",
          })}
        </p>
      </EuiCallOut>
      <AlertsTable<ObservabilityAlertsTableContext>
        id={RELATED_ALERTS_TABLE_ID}
        query={esQuery}
        columns={columns}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
        initialSort={initialSort}
        casesConfiguration={caseConfiguration}
        additionalContext={{
          observabilityRuleTypeRegistry,
          config,
          parentAlert: alert,
        }}
        renderCellValue={AlertsTableCellValue}
        renderFlyoutBody={AlertsFlyoutBody}
        renderFlyoutFooter={AlertsFlyoutFooter}
        showAlertStatusWithFlapping
        services={services}
        gridStyle={{
          border: 'horizontal',
          header: 'underline',
          cellPadding: 'l',
          fontSize: 'm',
        }}
        rowHeightsOptions={{
          defaultHeight: 'auto',
        }}
      />
    </EuiFlexGroup>
  );
}
