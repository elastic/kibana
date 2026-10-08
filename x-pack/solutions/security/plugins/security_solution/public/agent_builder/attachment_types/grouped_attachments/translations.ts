/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_SUBTITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.groupedAttachments.attackSubtitle',
  { defaultMessage: 'Attack' }
);

export const ALERT_SUBTITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.groupedAttachments.alertSubtitle',
  { defaultMessage: 'Alert' }
);

export const RULE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.groupedAttachments.ruleSubtitle',
  { defaultMessage: 'Rule' }
);

export const RULE_FALLBACK_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.groupedAttachments.ruleFallbackTitle',
  { defaultMessage: 'Untitled rule' }
);

export const alertsTitle = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.groupedAttachments.alertsTitle', {
    defaultMessage: '{count} {count, plural, one {alert} other {alerts}}',
    values: { count },
  });

export const rulesTitle = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.groupedAttachments.rulesTitle', {
    defaultMessage: '{count} {count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const attacksTitle = (count: number) =>
  i18n.translate('xpack.securitySolution.agentBuilder.groupedAttachments.attacksTitle', {
    defaultMessage: '{count} {count, plural, one {attack} other {attacks}}',
    values: { count },
  });
