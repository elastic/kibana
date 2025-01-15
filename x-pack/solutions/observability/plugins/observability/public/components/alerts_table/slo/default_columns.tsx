/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We need to produce types and code transpilation at different folders during the build of the package.
 * We have types and code at different imports because we don't want to import the whole package in the resulting webpack bundle for the plugin.
 * This way plugins can do targeted imports to reduce the final code bundle
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { ALERT_DURATION, ALERT_REASON, ALERT_STATUS, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';

/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
export const columns: EuiDataGridColumn[] = [
  {
    displayAsText: i18n.translate(
      'xpack.observability.slo.sloAlertsEmbeddable.alertsTGrid.statusColumnDescription',
      {
        defaultMessage: 'Status',
      }
    ),
    id: ALERT_STATUS,
    initialWidth: 110,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observability.slo.sloAlertsEmbeddable.alertsTGrid.durationColumnDescription',
      {
        defaultMessage: 'Duration',
      }
    ),
    id: ALERT_DURATION,
    initialWidth: 116,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observability.slo.sloAlertsEmbeddable.alertsTGrid.sloColumnDescription',
      {
        defaultMessage: 'Rule name',
      }
    ),
    id: ALERT_RULE_NAME,
    initialWidth: 110,
  },
  {
    displayAsText: i18n.translate(
      'xpack.observability.slo.sloAlertsEmbeddable.alertsTGrid.reasonColumnDescription',
      {
        defaultMessage: 'Reason',
      }
    ),
    id: ALERT_REASON,
  },
];
