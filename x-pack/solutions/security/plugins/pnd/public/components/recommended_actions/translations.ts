/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HEADING = i18n.translate('xpack.pnd.recommendedActions.heading', {
  defaultMessage: 'Recommended response actions',
});

export const NOT_EXECUTED = i18n.translate('xpack.pnd.recommendedActions.notExecuted', {
  defaultMessage:
    'The forensic investigation recommends these. Approving does not execute any of them.',
});

export const MANUAL_BADGE = i18n.translate('xpack.pnd.recommendedActions.manualBadge', {
  defaultMessage: 'Manual — analyst executes outside Kibana',
});

export const PRIORITY_HARDENING = i18n.translate('xpack.pnd.recommendedActions.priorityHardening', {
  defaultMessage: 'Hardening',
});

export const PRIORITY_IMMEDIATE = i18n.translate('xpack.pnd.recommendedActions.priorityImmediate', {
  defaultMessage: 'Immediate',
});

export const PRIORITY_INVESTIGATION = i18n.translate(
  'xpack.pnd.recommendedActions.priorityInvestigation',
  {
    defaultMessage: 'Investigation',
  }
);

export const TARGETS_NONE = i18n.translate('xpack.pnd.recommendedActions.targetsNone', {
  defaultMessage: 'This action names no targets.',
});

/** How many of the discovery's constituent alerts this action targets. */
export const targetAlerts = (count: number): string =>
  i18n.translate('xpack.pnd.recommendedActions.targetAlerts', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });

export const targetHosts = (hosts: string): string =>
  i18n.translate('xpack.pnd.recommendedActions.targetHosts', {
    defaultMessage: 'Hosts: {hosts}',
    values: { hosts },
  });

export const targetIps = (ips: string): string =>
  i18n.translate('xpack.pnd.recommendedActions.targetIps', {
    defaultMessage: 'IPs: {ips}',
    values: { ips },
  });

export const targetUsers = (users: string): string =>
  i18n.translate('xpack.pnd.recommendedActions.targetUsers', {
    defaultMessage: 'Users: {users}',
    values: { users },
  });
