/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEqlRule } from '../../../../objects/rule';

import { createRule } from '../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  saveEditedRuleWithNonBlockingErrors,
  visitEditRulePage,
} from '../../../../tasks/edit_rule';
import { login } from '../../../../tasks/login';

describe('EQL query rules', { tags: ['@ess', '@serverless'] }, () => {
  context('Editing rule with non-blocking query validation errors', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
    });

    it('should allow user to save a rule and show confirmation modal when data source does not exist', () => {
      const rule = {
        ...getEqlRule(),
        index: ['fake*'],
      };
      createRule(rule).then((createdRule) => {
        visitEditRulePage(createdRule.body.id);
        saveEditedRuleWithNonBlockingErrors();
      });
    });

    it('should allow user to save a rule and show confirmation modal when data field does not exist', () => {
      const rule = {
        ...getEqlRule(),
        query: 'any where hello.world',
      };
      createRule(rule).then((createdRule) => {
        visitEditRulePage(createdRule.body.id);
        saveEditedRuleWithNonBlockingErrors();
      });
    });
  });
});
