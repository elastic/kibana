/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONVERSATION_DETAILS_LABELS = {
  alerts: (count: number) =>
    i18n.translate('xpack.securitySolution.agentBuilder.conversationDetails.alerts', {
      defaultMessage: '{count} {count, plural, one {alert} other {alerts}}',
      values: { count },
    }),
  attacks: (count: number) =>
    i18n.translate('xpack.securitySolution.agentBuilder.conversationDetails.attacks', {
      defaultMessage: '{count} {count, plural, one {attack} other {attacks}}',
      values: { count },
    }),
  entities: (count: number) =>
    i18n.translate('xpack.securitySolution.agentBuilder.conversationDetails.entities', {
      defaultMessage: '{count} {count, plural, one {entity} other {entities}}',
      values: { count },
    }),
  rules: (count: number) =>
    i18n.translate('xpack.securitySolution.agentBuilder.conversationDetails.rules', {
      defaultMessage: '{count} {count, plural, one {rule} other {rules}}',
      values: { count },
    }),
};
