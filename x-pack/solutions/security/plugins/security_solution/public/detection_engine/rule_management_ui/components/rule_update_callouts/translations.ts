/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HAS_RULE_UPDATE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetailsUpgrade.calloutTitle',
  {
    defaultMessage: 'Rule has available update',
  }
);

export const HAS_RULE_UPDATE_CALLOUT_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetailsUpgrade.calloutMessage',
  {
    defaultMessage:
      'This prebuilt rule has an update available, please upgrade to keep your rules up to date',
  }
);

export const HAS_RULE_UPDATE_CALLOUT_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetailsUpgrade.calloutButton',
  {
    defaultMessage: 'Review rule for upgrade',
  }
);
