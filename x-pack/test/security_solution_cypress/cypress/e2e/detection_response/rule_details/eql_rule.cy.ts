/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EqlRule } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getEqlRule, getEqlSequenceRule } from '../../../objects/rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { checkEQLQueryDetails, checkEQLRuleTypeDetails } from '../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { createRule } from '../../../tasks/api_calls/rules';
import { ruleDetailsUrl } from '../../../urls/rule_details';

describe('EQL rule details', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
  });

  it('Displays correct details for EQL rule', function () {
    createRule<EqlRule>(getEqlRule()).then((createdRule) => {
      visit(ruleDetailsUrl(createdRule.body.id));

      cy.get(RULE_NAME_HEADER).should('contain', `${createdRule.body.name}`);

      // Not using rule details utils here to be explicit about what fields we are testing for this rule type
      checkEQLQueryDetails(createdRule.body.query);
      checkEQLRuleTypeDetails();
    });
  });

  it('Displays correct details for EQL sequence rule', function () {
    createRule<EqlRule>(getEqlSequenceRule()).then((createdRule) => {
      visit(ruleDetailsUrl(createdRule.body.id));

      cy.get(RULE_NAME_HEADER).should('contain', `${createdRule.body.name}`);

      // Not using rule details utils here to be explicit about what fields we are testing for this rule type
      checkEQLQueryDetails(createdRule.body.query);
      checkEQLRuleTypeDetails();
    });
  });
});
