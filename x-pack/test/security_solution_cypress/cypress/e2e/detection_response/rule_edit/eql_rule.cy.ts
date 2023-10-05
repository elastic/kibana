/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getEqlRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { checkQueryDetails } from '../../../tasks/rule_details';
import { editEQLRuleQuery, saveEditedRule, visitEditRulePage } from '../../../tasks/rule_edit';
import { CreateRulePropsRewrites } from '../../../objects/types';

describe('EQL rule edit flows', { tags: ['@ess', '@serverless'] }, () => {
  const originalRule = getEqlRule({ enabled: false });
  const ruleEdits: CreateRulePropsRewrites<EqlRuleCreateProps> = {
    query: 'any where process.name == "newValue"',
  };
  const editedRule = getEqlRule(ruleEdits);

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(originalRule).then((createdRule) => {
      visitEditRulePage(createdRule.body.id);
    });
  });

  it('Allows a rule to be edited', () => {
    editEQLRuleQuery(ruleEdits.query);
    saveEditedRule();

    checkQueryDetails(editedRule.query);
  });
});
