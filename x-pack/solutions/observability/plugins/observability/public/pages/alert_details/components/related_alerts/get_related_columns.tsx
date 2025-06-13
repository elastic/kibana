/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { ALERT_CASE_IDS, ALERT_RULE_NAME, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';

export const RELATED_ALERT_REASON = 'relatedAlertReason';
export const RELATION_COL = 'relatedRelation';
export const RELATED_ACTIONS_COL = 'relatedActions';

export const getRelatedColumns = (): EuiDataGridColumn[] => {
  return [
    {
      id: ALERT_STATUS,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.statusColumnDescription', {
        defaultMessage: 'Alert Status',
      }),
      initialWidth: 120,
      isSortable: false,
      actions: false,
    },
    {
      id: ALERT_START,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.startColumnDescription', {
        defaultMessage: 'Triggered',
      }),
      initialWidth: 120,
      isSortable: false,
      actions: false,
    },
    {
      id: ALERT_RULE_NAME,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.ruleNameColumnDescription', {
        defaultMessage: 'Rule name',
      }),
      initialWidth: 250,
      isSortable: false,
      actions: false,
    },
    {
      id: RELATED_ALERT_REASON,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonDescription', {
        defaultMessage: 'Reason',
      }),
      initialWidth: 400,
      isSortable: false,
      actions: false,
    },
    {
      id: RELATION_COL,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.relationColumnDescription', {
        defaultMessage: 'Relation',
      }),
      initialWidth: 350,
      isSortable: false,
      actions: false,
    },
    {
      id: ALERT_CASE_IDS,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.caseIdsColumnDescription', {
        defaultMessage: 'Attached cases',
      }),
      initialWidth: 150,
      isSortable: false,
      actions: false,
    },
    {
      id: RELATED_ACTIONS_COL,
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.actionsColumnDescription', {
        defaultMessage: 'Actions',
      }),
      initialWidth: 75,
      isResizable: false,
      isSortable: false,
      actions: false,
    },
  ];
};
