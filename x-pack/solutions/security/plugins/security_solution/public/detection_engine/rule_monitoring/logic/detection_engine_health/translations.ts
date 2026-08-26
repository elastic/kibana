/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SPACE_RULES_HEALTH_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.spaceRulesHealth.fetchError',
  {
    defaultMessage: 'Unable to fetch detection rules health for the current space',
  }
);

export const RULE_HEALTH_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleHealth.fetchError',
  {
    defaultMessage: 'Unable to fetch detection rule health',
  }
);
