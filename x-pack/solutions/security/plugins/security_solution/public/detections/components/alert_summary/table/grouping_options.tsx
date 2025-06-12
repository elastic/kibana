/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupOption } from '@kbn/grouping/src';
import { i18n } from '@kbn/i18n';

const INTEGRATION_NAME = i18n.translate(
  'xpack.securitySolution.alertsTable.groups.integrationName',
  {
    defaultMessage: 'Integration',
  }
);

const SEVERITY = i18n.translate('xpack.securitySolution.alertsTable.groups.severity', {
  defaultMessage: 'Severity',
});

const RULE_NAME = i18n.translate('xpack.securitySolution.alertsTable.groups.ruleName', {
  defaultMessage: 'Rule name',
});

/**
 * Returns a list of fields for the default grouping options. These are displayed in the `Group alerts by` dropdown button.
 * The default values are:
 * - signal.rule.id
 * - kibana.alert.severity
 * - kibana.alert.rule.name
 *
 * These go hand in hand with groupTitleRenderers, groupStatsRenderer and groupStatsAggregations
 */
export const groupingOptions: GroupOption[] = [
  {
    label: INTEGRATION_NAME,
    key: 'signal.rule.id',
  },
  {
    label: SEVERITY,
    key: 'kibana.alert.severity',
  },
  {
    label: RULE_NAME,
    key: 'kibana.alert.rule.name',
  },
];
