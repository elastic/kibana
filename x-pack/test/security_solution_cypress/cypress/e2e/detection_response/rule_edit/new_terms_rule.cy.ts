/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NewTermsRule,
  NewTermsRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getNewTermsRule } from '../../../objects/rule';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  editNewTermsFields,
  editNewTermsHistoryWindowSize,
  editRuleQuery,
  saveEditedRule,
  visitEditRulePage,
} from '../../../tasks/rule_edit';
import { CreateRulePropsRewrites } from '../../../objects/types';
import {
  checkNewTermsRuleFieldDetails,
  checkNewTermsRuleHistoryWindowDetails,
  checkQueryDetails,
} from '../../../tasks/rule_details';

describe('New terms rules - rule edit', { tags: ['@ess', '@serverless'] }, () => {
  const originalRule = getNewTermsRule({ enabled: false });
  // Fill any specific values you want tested,
  const ruleEdits: CreateRulePropsRewrites<NewTermsRuleCreateProps> = {
    query: 'agent.name:*',
    new_terms_fields: ['agent.name'],
    history_window_start: 'now-250h',
  };

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule<NewTermsRule>(originalRule).then((createdRule) => {
      visitEditRulePage(createdRule.body.id);
    });
  });

  it('Allows new term rule details to be edited', () => {
    editRuleQuery(ruleEdits.query);
    editNewTermsFields(ruleEdits.new_terms_fields ?? []);
    editNewTermsHistoryWindowSize(ruleEdits.history_window_start ?? '');

    saveEditedRule();

    checkQueryDetails(ruleEdits.query);
    checkNewTermsRuleFieldDetails(ruleEdits.new_terms_fields ?? []);
    checkNewTermsRuleHistoryWindowDetails(ruleEdits.history_window_start ?? '');
  });
});
