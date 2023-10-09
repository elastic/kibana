/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRule } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  getSeverityOverride1,
  getSeverityOverride2,
  getSeverityOverride3,
  getSeverityOverride4,
  getSimpleCustomQueryRule,
} from '../../../objects/rule';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  checkRuleDetailsRuleDescription,
  checkRuleDetailsRuleNameOverride,
  checkRuleDetailsRuleRiskScore,
  checkRuleDetailsRuleRiskScoreOverride,
  checkRuleDetailsRuleSeverity,
  checkRuleDetailsRuleSeverityOverride,
  checkRuleDetailsRuleTimestampOverride,
} from '../../../tasks/rule_details';

describe('Rule overrides rule details', { tags: ['@ess', '@serverless'] }, () => {
  // Fill any override specific values you want tested,
  // common values across rules can be tested in ./common_flows.cy.ts
  const rule = getSimpleCustomQueryRule({
    severity_mapping: [
      getSeverityOverride1(),
      getSeverityOverride2(),
      getSeverityOverride3(),
      getSeverityOverride4(),
    ],
    risk_score_mapping: [
      { field: 'destination.port', value: '', operator: 'equals', risk_score: undefined },
    ],
    rule_name_override: 'agent.name',
    timestamp_override: 'event.start',
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
  });

  it('displays rule override option details', () => {
    createRule<QueryRule>(rule).then((createdRule) => {
      visit(ruleDetailsUrl(createdRule.body.id));
      checkRuleDetailsRuleDescription(createdRule.body.description);
      checkRuleDetailsRuleSeverity(createdRule.body.severity);
      checkRuleDetailsRuleRiskScore(createdRule.body.risk_score);
      checkRuleDetailsRuleSeverityOverride(createdRule.body.severity_mapping);
      checkRuleDetailsRuleRiskScoreOverride(createdRule.body.risk_score_mapping);
      checkRuleDetailsRuleTimestampOverride(createdRule.body.timestamp_override);
      checkRuleDetailsRuleNameOverride(createdRule.body.rule_name_override);
    });
  });
});
