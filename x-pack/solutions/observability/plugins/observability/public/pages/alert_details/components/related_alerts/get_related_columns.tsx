/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { ALERT_CASE_IDS, ALERT_RULE_NAME, ALERT_STATUS } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';

export const RELATED_ALERT_REASON = 'relatedAlertReason';
export const RELATION_COL = 'relatedRelation';
export const RELATED_ACTIONS_COL = 'relatedActions';

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
      id: RELATED_ALERT_REASON,
      initialWidth: 300,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.relationColumnDescription', {
        defaultMessage: 'Relation',
      }),
      id: RELATION_COL,
      initialWidth: 350,
    },
    {
      id: ALERT_CASE_IDS,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.caseIdsColumnDescription', {
        defaultMessage: 'Related cases',
      }),
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.actionsColumnDescription', {
        defaultMessage: 'Actions',
      }),
      id: RELATED_ACTIONS_COL,
      initialWidth: 120,
    },
  ];
};
