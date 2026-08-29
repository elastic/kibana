/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MANUAL_BADGE = i18n.translate('xpack.pnd.recommendedActionsDecisionForm.manualBadge', {
  defaultMessage: 'Manual — analyst executes outside Kibana',
});

export const NOTHING_STAGED_BODY = i18n.translate(
  'xpack.pnd.recommendedActionsDecisionForm.nothingStagedBody',
  {
    defaultMessage:
      'The recommended-actions step staged nothing for this incident. Approving closes out the incident without executing anything.',
  }
);

export const NOTHING_STAGED_TITLE = i18n.translate(
  'xpack.pnd.recommendedActionsDecisionForm.nothingStagedTitle',
  {
    defaultMessage: 'No containment actions were staged',
  }
);

export const PRIORITY_HARDENING = i18n.translate(
  'xpack.pnd.recommendedActionsDecisionForm.priorityHardening',
  {
    defaultMessage: 'Hardening',
  }
);

export const PRIORITY_IMMEDIATE = i18n.translate(
  'xpack.pnd.recommendedActionsDecisionForm.priorityImmediate',
  {
    defaultMessage: 'Immediate',
  }
);

export const PRIORITY_INVESTIGATION = i18n.translate(
  'xpack.pnd.recommendedActionsDecisionForm.priorityInvestigation',
  {
    defaultMessage: 'Investigation',
  }
);

export const AGENT_HUNT_BADGE = i18n.translate(
  'xpack.pnd.recommendedActionsDecisionForm.agentHuntBadge',
  {
    defaultMessage: 'Read-only agent hunt — findings post to the incident chat',
  }
);

export const TARGETS_NONE = i18n.translate('xpack.pnd.recommendedActionsDecisionForm.targetsNone', {
  defaultMessage: 'This action names no targets.',
});

/** How many of the discovery's constituent alerts this action targets. */
export const targetAlerts = (count: number): string =>
  i18n.translate('xpack.pnd.recommendedActionsDecisionForm.targetAlerts', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });

export const targetHosts = (hosts: string): string =>
  i18n.translate('xpack.pnd.recommendedActionsDecisionForm.targetHosts', {
    defaultMessage: 'Hosts: {hosts}',
    values: { hosts },
  });

export const targetIps = (ips: string): string =>
  i18n.translate('xpack.pnd.recommendedActionsDecisionForm.targetIps', {
    defaultMessage: 'IPs: {ips}',
    values: { ips },
  });

export const targetUsers = (users: string): string =>
  i18n.translate('xpack.pnd.recommendedActionsDecisionForm.targetUsers', {
    defaultMessage: 'Users: {users}',
    values: { users },
  });
