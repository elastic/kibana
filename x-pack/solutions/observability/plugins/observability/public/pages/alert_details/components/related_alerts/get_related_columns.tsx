/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_STATUS, ALERT_REASON } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { RELATED_ACTIONS_COL, RELATION_COL } from './related_alerts_cell';

export const getRelatedColumns = (): EuiDataGridColumn[] => {
  return [
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.statusColumnDescription', {
        defaultMessage: 'Alert Status',
      }),
      id: ALERT_STATUS,
      initialWidth: 120,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.ruleNameColumnDescription', {
        defaultMessage: 'Rule name',
      }),
      id: ALERT_RULE_NAME,
      initialWidth: 250,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonDescription', {
        defaultMessage: 'Reason',
      }),
      id: ALERT_REASON,
      initialWidth: 300,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.relationColumnDescription', {
        defaultMessage: 'Relation',
      }),
      id: RELATION_COL,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.actionsColumnDescription', {
        defaultMessage: 'Actions',
      }),
      id: RELATED_ACTIONS_COL,
      initialWidth: 150,
    },
  ];
};
