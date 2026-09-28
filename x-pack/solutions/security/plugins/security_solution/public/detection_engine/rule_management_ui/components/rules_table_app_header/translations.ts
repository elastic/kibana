/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export { ADD_NEW_RULE } from '../../../common/translations';

export const CREATE_RULE_MENU_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.buttonLabel',
  {
    defaultMessage: 'Create a rule',
  }
);

export const AI_RULE_CREATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.aiRuleCreation',
  {
    defaultMessage: 'AI rule creation',
  }
);

export const MANUAL_RULE_CREATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.manual',
  {
    defaultMessage: 'Manual rule creation',
  }
);
