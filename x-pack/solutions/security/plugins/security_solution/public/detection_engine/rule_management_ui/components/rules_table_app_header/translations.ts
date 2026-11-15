/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export {
  ADD_NEW_RULE,
  IMPORT_RULE,
  IMPORT_VALUE_LISTS,
  PAGE_TITLE,
  RULE_SETTINGS_TITLE,
  UPLOAD_VALUE_LISTS_TOOLTIP,
} from '../../../common/translations';
export { ADD_ELASTIC_RULES } from '../pre_packaged_rules/translations';

export const ADD_ELASTIC_RULES_WITH_COUNT = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.appHeader.addElasticRulesWithCount',
    {
      values: { count },
      defaultMessage: 'Add Elastic rules ({count})',
    }
  );

export const CREATE_RULE_MENU_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.buttonLabel',
  {
    defaultMessage: 'Create rule',
  }
);

export const CREATE_RULE_MORE_OPTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.moreOptionsAriaLabel',
  {
    defaultMessage: 'More rule creation options',
  }
);

export const AI_RULE_CREATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.contextMenu.aiRuleCreation',
  {
    defaultMessage: 'AI rule creation',
  }
);
