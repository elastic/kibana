/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getNewOverrideRule, getSeverityOverride4 } from '../../../objects/rule';

import { deleteAlertsAndRules } from '../../../tasks/common';
import { expandAdvancedSettings } from '../../../tasks/rule_creation';
import { login } from '../../../tasks/login';
import {
  editRiskOverride,
  editRuleNameOverride,
  editSeverityOverride,
  editTimestampOverride,
  goToAboutStepTab,
  visitEditRulePage,
  confirmEditDefineStepDetails,
  confirmEditAboutStepDetails,
  saveEditedRule,
} from '../../../tasks/rule_edit';
import { CreateRulePropsRewrites } from '../../../objects/types';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  confirmRuleDetailsAbout,
  confirmCustomQueryRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';

describe('Edit rule overrides', { tags: ['@ess', '@serverless'] }, () => {
  const originalRule = getNewOverrideRule({ enabled: false });
  const ruleEdits: CreateRulePropsRewrites<QueryRuleCreateProps> = {
    severity_mapping: [
      {
        field: 'agent.type',
        value: 'auditbeat',
        operator: 'equals',
        severity: 'low',
      },
    ],
    risk_score_mapping: [
      { field: 'client.port', value: '', operator: 'equals', risk_score: undefined },
    ],
    rule_name_override: 'event.reason',
    timestamp_override: 'event.created',
  };
  const editedRule = getNewOverrideRule(ruleEdits);

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(originalRule).then((createdRule) => {
      visitEditRulePage(createdRule.body.id);
    });
  });

  it('allows override options to be edited', function () {
    cy.log('Checking define step populates');
    confirmEditDefineStepDetails(originalRule);

    cy.log('Checking about step populates');
    goToAboutStepTab();
    confirmEditAboutStepDetails(originalRule);

    cy.log('Update about step fields');
    editSeverityOverride(editedRule.severity_mapping);
    editRiskOverride(editedRule.risk_score_mapping);
    expandAdvancedSettings();
    editRuleNameOverride(editedRule.rule_name_override);
    editTimestampOverride(editedRule.timestamp_override);

    saveEditedRule();

    // Not checking withing the above await because confirming that
    // edits persisted, checking against the response would not catch
    // if an expected changed value was not persisted.
    confirmRuleDetailsAbout(editedRule);
    confirmCustomQueryRuleDetailsDefinition(editedRule);
    confirmRuleDetailsSchedule(editedRule);
  });
});
