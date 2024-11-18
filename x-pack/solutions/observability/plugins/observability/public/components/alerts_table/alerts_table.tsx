/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_DURATION } from '@kbn/rule-data-utils';
import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from '../../utils/kibana_react';
import { casesFeatureId, observabilityFeatureId } from '../../../common';
import { ObservabilityAlertsTableContext, ObservabilityAlertsTableProps } from './types';
import { AlertsTableCellValue } from './common/cell_value';
import { AlertsFlyoutBody } from '../alerts_flyout/alerts_flyout_body';
import { AlertsFlyoutHeader } from '../alerts_flyout/alerts_flyout_header';
import { AlertsFlyoutFooter } from '../alerts_flyout/alerts_flyout_footer';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { getColumns } from './common/get_columns';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../common/constants';

const columns = getColumns();
const initialSort = [
  {
    [ALERT_DURATION]: {
      order: 'desc' as SortOrder,
    },
  },
];

export function ObservabilityAlertsTable(props: ObservabilityAlertsTableProps) {
  const {
    triggersActionsUi: { getAlertsStateTable: AlertsTable },
  } = useKibana().services;
  const { observabilityRuleTypeRegistry, config } = usePluginContext();

  return (
    <AlertsTable<ObservabilityAlertsTableContext>
      columns={columns}
      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
      initialSort={initialSort}
      casesConfiguration={{ featureId: casesFeatureId, owner: [observabilityFeatureId] }}
      additionalContext={{ observabilityRuleTypeRegistry, config }}
      renderCellValue={AlertsTableCellValue}
      renderFlyoutHeader={AlertsFlyoutHeader}
      renderFlyoutBody={AlertsFlyoutBody}
      renderFlyoutFooter={AlertsFlyoutFooter}
      showAlertStatusWithFlapping
      {...props}
    />
  );
}
