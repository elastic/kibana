/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_GAPS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.ruleGaps.callout.title',
  {
    defaultMessage: 'Some alerts may have been missed',
  }
);

export const RULE_GAPS_CALLOUT_MESSAGE = i18n.translate(
  'xpack.securitySolution.ruleGaps.callout.message',
  {
    defaultMessage:
      'Some alerts may have been missed in past 24h due to rule execution gaps. For more details visit Rule monitoring tab.',
  }
);
