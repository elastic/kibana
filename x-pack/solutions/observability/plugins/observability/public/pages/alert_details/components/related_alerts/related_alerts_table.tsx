/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiFlexGroup, EuiFormRow, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ALERT_START, ALERT_UUID } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { getRelatedColumns } from './get_related_columns';
import { getBuildRelatedAlertsQuery } from '../../hooks/related_alerts/get_build_related_alerts_query';
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
import { useProximalFilterParam } from '../../hooks/use_proximal_filter_param';

interface Props {
  alertData: AlertData;
}

const columns = getRelatedColumns();
const initialSort: Array<Record<string, SortOrder>> = [
  {
    _score: 'desc',
  },
  {
    [ALERT_START]: 'desc',
  },
  {
    [ALERT_UUID]: 'desc',
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: casesFeatureIdV2,
  owner: [observabilityFeatureId],
};

const RELATED_ALERTS_TABLE_ID = 'xpack.observability.alerts.relatedAlerts';

export function RelatedAlertsTable({ alertData }: Props) {
  const { formatted: alert } = alertData;
  const filterProximal = useProximalFilterParam();
  const esQuery = getBuildRelatedAlertsQuery({ alert, filterProximal });
  const { observabilityRuleTypeRegistry, config } = usePluginContext();
  const services = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="s" />
      <EuiPanel paddingSize="m" hasShadow={false} color="subdued">
        <EuiFlexGroup direction="row" alignItems="flexStart">
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.observability.alerts.relatedAlerts.filtersLabel', {
                defaultMessage: 'Filters',
              })}
            </strong>
          </EuiText>
          <EuiFormRow fullWidth>
            <EuiCheckbox
              label={i18n.translate(
                'xpack.observability.alerts.relatedAlerts.proximityCheckboxLabel',
                {
                  defaultMessage: 'Triggered around the same time',
                }
              )}
              checked={filterProximal}
              onChange={(event) => {
                const searchParams = new URLSearchParams(search);
                searchParams.set('filterProximal', String(event.target.checked));
                history.replace({ search: searchParams.toString() });
              }}
              id={'proximal-alerts-checkbox'}
              data-test-subj="proximal-alerts-checkbox"
            />
          </EuiFormRow>
        </EuiFlexGroup>
      </EuiPanel>
      <AlertsTable<ObservabilityAlertsTableContext>
        id={RELATED_ALERTS_TABLE_ID}
        query={esQuery}
        columns={columns}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
        minScore={1.5}
        trackScores={true}
        initialSort={initialSort}
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
        height="600px"
      />
    </EuiFlexGroup>
  );
}
