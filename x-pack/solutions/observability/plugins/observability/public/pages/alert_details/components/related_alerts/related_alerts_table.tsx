/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_START, ALERT_UUID } from '@kbn/rule-data-utils';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { RELATED_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import type { AlertsTableSortCombinations } from '@kbn/response-ops-alerts-table/types';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import { getRelatedColumns } from './get_related_columns';
import { getBuildRelatedAlertsQuery } from '../../hooks/related_alerts/get_build_related_alerts_query';
import type { AlertData } from '../../../../hooks/use_fetch_alert_detail';
import type { GetObservabilityAlertsTableProp, ObservabilityAlertsTableContext } from '../../../..';
import { observabilityFeatureId } from '../../../..';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useKibana } from '../../../../utils/kibana_react';
import { AlertsTableCellValue } from '../../../../components/alerts_table/common/cell_value';
import { casesFeatureIdV2 } from '../../../../../common';
import { useFilterProximalParam } from '../../hooks/use_filter_proximal_param';
import { RelatedAlertsTableFilter } from './related_alerts_table_filter';
import { AlertsTableExpandedAlertView } from '../../../../components/alerts_flyout/alerts_table_expanded_alert_view';

interface Props {
  alertData: AlertData;
}

const columns = getRelatedColumns();
const initialSort: AlertsTableSortCombinations[] = [
  {
    _score: {
      order: 'desc',
    },
  },
  {
    [ALERT_START]: {
      order: 'desc',
    },
  },
  {
    [ALERT_UUID]: {
      order: 'desc',
    },
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: casesFeatureIdV2,
  owner: [observabilityFeatureId],
};

export function RelatedAlertsTable({ alertData }: Props) {
  const { formatted: alert } = alertData;
  const { filterProximal } = useFilterProximalParam();
  const esQuery = getBuildRelatedAlertsQuery({ alert, filterProximal });
  const { observabilityRuleTypeRegistry, config } = usePluginContext();
  const { services } = useKibana();

  const onLoaded = useCallback(
    ({ totalAlertsCount }: { totalAlertsCount: number }) =>
      services.telemetryClient.reportRelatedAlertsLoaded(totalAlertsCount),
    [services.telemetryClient]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="relatedAlertsTable">
      <EuiSpacer size="s" />
      <RelatedAlertsTableFilter />
      <AlertsTable<ObservabilityAlertsTableContext>
        id={RELATED_ALERTS_TABLE_ID}
        query={esQuery}
        columns={columns}
        onLoaded={onLoaded}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
        minScore={1.5}
        trackScores={true}
        sort={initialSort}
        casesConfiguration={caseConfiguration}
        additionalContext={{
          observabilityRuleTypeRegistry,
          config,
          parentAlert: alert,
        }}
        toolbarVisibility={{
          showSortSelector: false,
        }}
        renderCellValue={AlertsTableCellValue}
        renderExpandedAlertView={AlertsTableExpandedAlertView}
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
        height="600px"
        emptyState={{
          messageTitle: i18n.translate('xpack.observability.relatedAlertsTable.emptyState.title', {
            defaultMessage: 'No related alerts found',
          }),
          messageBody: i18n.translate('xpack.observability.relatedAlertsTable.emptyState.body', {
            defaultMessage:
              'No existing alerts match our related alerts criteria at this time. This may change if more alerts appear, so you may want to check back later.',
          }),
        }}
      />
    </EuiFlexGroup>
  );
}
