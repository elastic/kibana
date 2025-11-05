/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMachineLearningRule } from '../../../../objects/rule';

import { RULE_NAME_HEADER } from '../../../../screens/rule_details';

import {
  createRuleWithoutEnabling,
  fillAboutRuleAndContinue,
  fillDefineMachineLearningRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectMachineLearningRuleType,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { forceStopAndCloseJob } from '../../../../support/machine_learning';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe('Machine Learning - Rule Creation', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    const machineLearningJobIds = ([] as string[]).concat(
      getMachineLearningRule().machine_learning_job_id
    );
    // ensure no ML jobs are started before the suite
    machineLearningJobIds.forEach((jobId) => forceStopAndCloseJob({ jobId }));
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates a new ml rule', () => {
    const mlRule = getMachineLearningRule();
    selectMachineLearningRuleType();
    fillDefineMachineLearningRuleAndContinue(mlRule);
    fillAboutRuleAndContinue(mlRule);
    fillScheduleRuleAndContinue(mlRule);
    createRuleWithoutEnabling();

    cy.log('Asserting we have a new rule created');
    cy.get(RULE_NAME_HEADER).should('contain', mlRule.name);
  });
});
