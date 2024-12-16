/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_LOOKBACK_INCONSISTENCY_WARNING = (defaultValue: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.ruleSchedule.lookbackInconsistencyWarning',
    {
      defaultMessage:
        'There is an inconsistency in rule schedule configuration. Rule may run with gaps. Default value "{defaultValue}" is suggested for upgrade.',
      values: { defaultValue },
    }
  );
