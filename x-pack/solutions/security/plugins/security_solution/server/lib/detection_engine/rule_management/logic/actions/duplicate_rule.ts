/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';

import { SERVER_APP_ID } from '../../../../../../common/constants';
import type { InternalRuleCreate, RuleParams } from '../../../rule_schema';
import { transformToActionFrequency } from '../../normalization/rule_actions';

const DUPLICATE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.cloneRule.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

interface DuplicateRuleParams {
  rule: SanitizedRule<RuleParams>;
}

export const duplicateRule = async ({ rule }: DuplicateRuleParams): Promise<InternalRuleCreate> => {
  // Generate a new static ruleId
  const ruleId: InternalRuleCreate['params']['ruleId'] = uuidv4();

  // Duplicated rules are always considered custom rules
  const immutable: InternalRuleCreate['params']['immutable'] = false;
  const ruleSource: InternalRuleCreate['params']['ruleSource'] = {
    type: 'internal',
  };

  const actions: InternalRuleCreate['actions'] = transformToActionFrequency(
    rule.actions,
    rule.throttle
  );

  return {
    name: `${rule.name} [${DUPLICATE_TITLE}]`,
    tags: rule.tags,
    alertTypeId: ruleTypeMappings[rule.params.type],
    consumer: SERVER_APP_ID,
    params: {
      ...rule.params,
      ruleId,
      immutable,
      ruleSource,
      exceptionsList: [],
    },
    schedule: rule.schedule,
    enabled: false,
    actions,
    systemActions: rule.systemActions ?? [],
  };
};
