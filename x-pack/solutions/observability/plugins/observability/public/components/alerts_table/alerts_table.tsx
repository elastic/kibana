/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import React from 'react';
import { ObservabilityPublicStart } from '../..';
import { casesFeatureId, observabilityFeatureId } from '../../../common';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../common/constants';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import AlertActions from '../alert_actions/alert_actions';
import { AlertsFlyoutBody } from '../alerts_flyout/alerts_flyout_body';
import { AlertsFlyoutFooter } from '../alerts_flyout/alerts_flyout_footer';
import { AlertsFlyoutHeader } from '../alerts_flyout/alerts_flyout_header';
import { AlertsTableCellValue } from './common/cell_value';
import { getColumns } from './common/get_columns';
import {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  ObservabilityAlertsTableProps,
} from './types';

const columns = getColumns({ showRuleName: true });
const initialSort = [
  {
    _score: {
      order: 'desc' as SortOrder,
    },
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: casesFeatureId,
  owner: [observabilityFeatureId],
};

export function ObservabilityAlertsTable(props: Omit<ObservabilityAlertsTableProps, 'services'>) {
  const {
    data,
    http,
    notifications,
    fieldFormats,
    application,
    licensing,
    cases,
    settings,
    observability,
  } = useKibana<{ observability?: ObservabilityPublicStart }>().services;
  const { observabilityRuleTypeRegistry, config } = usePluginContext();

  return (
    <AlertsTable<ObservabilityAlertsTableContext>
      columns={columns}
      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
      initialSort={initialSort}
      casesConfiguration={caseConfiguration}
      additionalContext={{
        observabilityRuleTypeRegistry:
          observabilityRuleTypeRegistry ?? observability?.observabilityRuleTypeRegistry,
        config,
      }}
      renderCellValue={AlertsTableCellValue}
      renderActionsCell={AlertActions}
      actionsColumnWidth={120}
      renderFlyoutHeader={AlertsFlyoutHeader}
      renderFlyoutBody={AlertsFlyoutBody}
      renderFlyoutFooter={AlertsFlyoutFooter}
      showAlertStatusWithFlapping
      services={{
        data,
        http,
        notifications,
        fieldFormats,
        application,
        licensing,
        cases,
        settings,
      }}
      {...props}
    />
  );
}

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertsTable;
export type ObservabilityAlertsTable = typeof ObservabilityAlertsTable;
