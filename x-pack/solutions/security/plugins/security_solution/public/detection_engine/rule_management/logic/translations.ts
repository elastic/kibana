/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_AND_TIMELINE_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.rulesAndTimelines',
  {
    defaultMessage: 'Failed to fetch Rules and Timelines',
  }
);

export const RULE_MANAGEMENT_FILTERS_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.ruleManagementFiltersFetchFailure',
  {
    defaultMessage: 'Failed to fetch rule filters',
  }
);

export const RULE_ADD_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.addRuleFailDescription',
  {
    defaultMessage: 'Failed to add Rule',
  }
);

export const BOOTSTRAP_PREBUILT_RULES_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.bootstrapPrebuiltRulesFailure',
  {
    defaultMessage: 'Failed to bootstrap prebuilt rules',
  }
);
