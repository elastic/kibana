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
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../common';
import type {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  ObservabilityAlertsTableProps,
  ObservabilityRuleTypeRegistry,
  ConfigSchema,
} from './types';
import { AlertsTableCellValue } from './common/cell_value';
import { getColumns } from './common/get_columns';
import { AlertActions } from './components/alert_actions';

const columns = getColumns({ showRuleName: true });
const initialSort = [
  {
    [ALERT_START]: {
      order: 'desc' as SortOrder,
    },
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: 'observabilityCases',
  owner: ['observability'],
};

export interface ObservabilityAlertsTableComponentProps extends ObservabilityAlertsTableProps {
  observabilityRuleTypeRegistry?: ObservabilityRuleTypeRegistry;
  config?: ConfigSchema;
  renderExpandedAlertView?: GetObservabilityAlertsTableProp<'renderExpandedAlertView'>;
}

export function ObservabilityAlertsTable({
  observabilityRuleTypeRegistry,
  config,
  renderExpandedAlertView,
  ...props
}: ObservabilityAlertsTableComponentProps) {
  return (
    <AlertsTable<ObservabilityAlertsTableContext>
      columns={columns}
      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
      sort={initialSort}
      casesConfiguration={caseConfiguration}
      additionalContext={{
        observabilityRuleTypeRegistry,
        config,
      }}
      renderCellValue={AlertsTableCellValue}
      renderActionsCell={AlertActions}
      actionsColumnWidth={120}
      renderExpandedAlertView={renderExpandedAlertView}
      showAlertStatusWithFlapping
      {...props}
    />
  );
}

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertsTable;
export type ObservabilityAlertsTableType = typeof ObservabilityAlertsTable;

