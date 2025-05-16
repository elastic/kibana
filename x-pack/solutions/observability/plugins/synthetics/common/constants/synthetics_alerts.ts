/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionGroup } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';

export { SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE } from '@kbn/rule-data-utils';

export type MonitorStatusActionGroup =
  | ActionGroup<'xpack.synthetics.alerts.actionGroups.monitorStatus'>
  | ActionGroup<'xpack.synthetics.alerts.actionGroups.tls'>;

export const MONITOR_STATUS: MonitorStatusActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
  name: i18n.translate('xpack.synthetics.alertRules.actionGroups.monitorStatus', {
    defaultMessage: 'Synthetics monitor status',
  }),
};

export const TLS_CERTIFICATE: MonitorStatusActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.tls',
  name: i18n.translate('xpack.synthetics.alertRules.actionGroups.tls', {
    defaultMessage: 'Synthetics TLS certificate',
  }),
};

export const ACTION_GROUP_DEFINITIONS: {
  MONITOR_STATUS: MonitorStatusActionGroup;
  TLS_CERTIFICATE: MonitorStatusActionGroup;
} = {
  MONITOR_STATUS,
  TLS_CERTIFICATE,
};

export const SYNTHETICS_RULE_TYPES_ALERT_CONTEXT = 'observability.uptime';

export { SYNTHETICS_RULE_TYPE_IDS as SYNTHETICS_RULE_TYPES } from '@kbn/rule-data-utils';
