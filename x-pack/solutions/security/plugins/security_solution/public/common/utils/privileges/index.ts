/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '../../../detection_engine/rule_management/logic';
import * as i18nActions from '../../../detection_engine/common/translations';
import { isMlRule } from '../../../../common/machine_learning/helpers';

export const isBoolean = (obj: unknown): obj is boolean => typeof obj === 'boolean';

export const canEditRuleWithActions = (
  rule: Rule | null | undefined,
  privileges:
    | boolean
    | Readonly<{
        [x: string]: boolean;
      }>
): boolean => {
  if (rule == null) {
    return true;
  }
  if (rule.actions?.length > 0 && isBoolean(privileges)) {
    return privileges;
  }
  return true;
};

export const explainLackOfPermission = (
  rule: Rule | null | undefined,
  hasMlPermissions: boolean,
  hasReadActionsPrivileges:
    | boolean
    | Readonly<{
        [x: string]: boolean;
      }>,
  canEditRules: boolean
): string | undefined => {
  if (rule == null) {
    return undefined;
  } else if (isMlRule(rule.type) && !hasMlPermissions) {
    return i18nActions.ML_RULES_DISABLED_MESSAGE;
  } else if (!canEditRuleWithActions(rule, hasReadActionsPrivileges)) {
    return i18nActions.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES;
  } else if (!canEditRules) {
    return i18nActions.LACK_OF_KIBANA_RULES_FEATURE_PRIVILEGES;
  } else {
    return undefined;
  }
};
