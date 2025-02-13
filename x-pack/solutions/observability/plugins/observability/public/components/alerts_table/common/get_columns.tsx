/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ALERT_INSTANCE_ID,
  TAGS,
} from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';

export const getColumns = (
  {
    showRuleName,
  }: {
    showRuleName?: boolean;
  } = { showRuleName: false }
): EuiDataGridColumn[] => {
  const ruleNameColumn: EuiDataGridColumn[] = showRuleName
    ? [
        {
          displayAsText: i18n.translate(
            'xpack.observability.alertsTGrid.ruleNameColumnDescription',
            {
              defaultMessage: 'Rule name',
            }
          ),
          id: ALERT_RULE_NAME,
          initialWidth: 150,
        },
      ]
    : [];

  return [
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.statusColumnDescription', {
        defaultMessage: 'Alert Status',
      }),
      id: ALERT_STATUS,
      initialWidth: 120,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.triggeredColumnDescription', {
        defaultMessage: 'Triggered',
      }),
      id: ALERT_START,
      initialWidth: 190,
      schema: 'datetime',
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.durationColumnDescription', {
        defaultMessage: 'Duration',
      }),
      id: ALERT_DURATION,
      initialWidth: 70,
    },
    ...ruleNameColumn,
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.sourceColumnDescription', {
        defaultMessage: 'Group',
      }),
      id: ALERT_INSTANCE_ID,
      initialWidth: 100,
    },
    {
      displayAsText: i18n.translate(
        'xpack.observability.alertsTGrid.observedValueColumnDescription',
        {
          defaultMessage: 'Observed value',
        }
      ),
      id: ALERT_EVALUATION_VALUE,
      initialWidth: 100,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.thresholdColumnDescription', {
        defaultMessage: 'Threshold',
      }),
      id: ALERT_EVALUATION_THRESHOLD,
      initialWidth: 100,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.tagsColumnDescription', {
        defaultMessage: 'Tags',
      }),
      id: TAGS,
      initialWidth: 150,
    },
    {
      displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonColumnDescription', {
        defaultMessage: 'Reason',
      }),
      id: ALERT_REASON,
    },
  ];
};
