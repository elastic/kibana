/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_SUPPRESSION_DURATION_INPUT,
  THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX,
} from '../../../../screens/create_new_rule';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { startBasicLicense } from '../../../../tasks/api_calls/licensing';
import { selectThresholdRuleType } from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { TOOLTIP } from '../../../../screens/common';

describe('Threshold rules, ESS basic license', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
    startBasicLicense();
  });

  it('Alert suppression is disabled for basic license', () => {
    selectThresholdRuleType();

    cy.get(THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX).should('be.disabled');
    cy.get(THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX).parent().trigger('mouseover');
    // Platinum license is required, tooltip on disabled alert suppression checkbox should tell this
    cy.get(TOOLTIP).contains('Platinum license');

    cy.get(ALERT_SUPPRESSION_DURATION_INPUT).eq(0).should('be.disabled');
    cy.get(ALERT_SUPPRESSION_DURATION_INPUT).eq(1).should('be.disabled');
  });
});
