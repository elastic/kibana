/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupOption } from '@kbn/grouping/src';
import { i18n } from '@kbn/i18n';

const RULE_NAME = i18n.translate('xpack.securitySolution.alertsTable.groups.ruleName', {
  defaultMessage: 'Rule name',
});

const USER_NAME = i18n.translate('xpack.securitySolution.alertsTable.groups.userName', {
  defaultMessage: 'User name',
});

const HOST_NAME = i18n.translate('xpack.securitySolution.alertsTable.groups.hostName', {
  defaultMessage: 'Host name',
});

const SOURCE_IP = i18n.translate('xpack.securitySolution.alertsTable.groups.sourceIP', {
  defaultMessage: 'Source IP',
});

/**
 * Returns a list of fields for the default grouping options. These are displayed in the `Group alerts by` dropdown button.
 *
 * These go hand in hand with defaultGroupTitleRenderers, defaultGroupStats and defaultGroupStatsAggregations.
 */
export const defaultGroupingOptions: GroupOption[] = [
  {
    label: RULE_NAME,
    key: 'kibana.alert.rule.name',
  },
  {
    label: USER_NAME,
    key: 'user.name',
  },
  {
    label: HOST_NAME,
    key: 'host.name',
  },
  {
    label: SOURCE_IP,
    key: 'source.ip',
  },
];
