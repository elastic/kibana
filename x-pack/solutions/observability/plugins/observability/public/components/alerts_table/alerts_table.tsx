/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_START } from '@kbn/rule-data-utils';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import { AlertsTableExpandedAlertView } from '../alerts_flyout/alerts_table_expanded_alert_view';
import type { ObservabilityPublicStart } from '../..';
import AlertActions from '../alert_actions/alert_actions';
import { useKibana } from '../../utils/kibana_react';
import { casesFeatureId, observabilityFeatureId } from '../../../common';
import type {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  ObservabilityAlertsTableProps,
} from './types';
import { AlertsTableCellValue } from './common/cell_value';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { getColumns } from './common/get_columns';

const columns = getColumns({ showRuleName: true });
const initialSort = [
  {
    [ALERT_START]: {
      order: 'desc' as SortOrder,
    },
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: casesFeatureId,
  owner: [observabilityFeatureId],
};

export function ObservabilityAlertsTable(props: ObservabilityAlertsTableProps) {
  const { observability } = useKibana<{ observability?: ObservabilityPublicStart }>().services;
  const { observabilityRuleTypeRegistry, config } = usePluginContext();

  return (
    <AlertsTable<ObservabilityAlertsTableContext>
      columns={columns}
      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
      sort={initialSort}
      casesConfiguration={caseConfiguration}
      additionalContext={{
        observabilityRuleTypeRegistry:
          observabilityRuleTypeRegistry ?? observability?.observabilityRuleTypeRegistry,
        config,
      }}
      renderCellValue={AlertsTableCellValue}
      renderActionsCell={AlertActions}
      actionsColumnWidth={120}
      renderExpandedAlertView={AlertsTableExpandedAlertView}
      showAlertStatusWithFlapping
      {...props}
    />
  );
}

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertsTable;
export type ObservabilityAlertsTable = typeof ObservabilityAlertsTable;
