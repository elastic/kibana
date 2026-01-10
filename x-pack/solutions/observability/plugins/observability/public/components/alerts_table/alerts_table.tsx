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

// Include the Source column to distinguish between Kibana and external alerts
const columns = getColumns({ showRuleName: true, showSource: true });
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

// Use the unified alerts search strategy to include external events
const UNIFIED_ALERTS_SEARCH_STRATEGY = 'observabilityUnifiedAlertsSearchStrategy';

export function ObservabilityAlertsTable(props: ObservabilityAlertsTableProps) {
  const { observability } = useKibana<{ observability?: ObservabilityPublicStart }>().services;
  const { observabilityRuleTypeRegistry, config } = usePluginContext();

  // Ensure we always have rule type IDs - merge any passed ruleTypeIds with our defaults
  // This is important for Cases view which may pass empty ruleTypeIds for external alerts
  const effectiveRuleTypeIds =
    props.ruleTypeIds && props.ruleTypeIds.length > 0
      ? [...new Set([...props.ruleTypeIds, ...OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES])]
      : OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES;

  // eslint-disable-next-line no-console
  console.log('[ObservabilityAlertsTable] Using search strategy:', UNIFIED_ALERTS_SEARCH_STRATEGY);

  // Destructure ruleTypeIds from props to avoid passing it twice
  const { ruleTypeIds: _ruleTypeIds, ...restProps } = props;

  return (
    <AlertsTable<ObservabilityAlertsTableContext>
      columns={columns}
      ruleTypeIds={effectiveRuleTypeIds}
      sort={initialSort}
      casesConfiguration={caseConfiguration}
      searchStrategy={UNIFIED_ALERTS_SEARCH_STRATEGY}
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
      {...restProps}
    />
  );
}

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertsTable;
export type ObservabilityAlertsTable = typeof ObservabilityAlertsTable;
