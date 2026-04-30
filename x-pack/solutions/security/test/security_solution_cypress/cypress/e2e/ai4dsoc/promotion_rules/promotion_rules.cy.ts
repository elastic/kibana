/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { cleanFleet } from '../../../tasks/api_calls/fleet';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import {
  ADD_INTEGRATION_BTN,
  SKIP_AGENT_INSTALLATION_BTN,
  SAVE_AND_CONTINUE_BTN,
} from '../../../screens/integrations';
import {
  RULE_SWITCH,
  MODAL_CONFIRMATION_CANCEL_BTN,
} from '../../../screens/alerts_detection_rules';

const CROWDSTRIKE_RULE_NAME = 'CrowdStrike External Alerts';
const CONFIGURATIONS_INTEGRATIONS_URL = '/app/security/configurations/integrations/browse';

const PROMOTION_RULES_BOOTSTRAP_TIMEOUT = 120_000; // 2 minutes

describe('Promotion Rules', { tags: '@serverless' }, () => {
  before(() => {
    cleanFleet();
    deleteAlertsAndRules();
  });

  after(() => {
    cleanFleet();
    deleteAlertsAndRules();
  });

  beforeEach(() => {
    login('admin');
  });

  it('installs and displays the CrowdStrike promotion rule after integration install', () => {
    // Install CrowdStrike integration via the UI
    visit(CONFIGURATIONS_INTEGRATIONS_URL);

    cy.get('[data-test-subj="integration-card:epr:crowdstrike"]').click();
    cy.get(ADD_INTEGRATION_BTN).click();
    cy.get(SKIP_AGENT_INSTALLATION_BTN).click();
    cy.get(SAVE_AND_CONTINUE_BTN).click();
    cy.get('[data-test-subj="postInstallAddAgentModal"]', { timeout: 30_000 }).should('be.visible');
    cy.get(MODAL_CONFIRMATION_CANCEL_BTN).click();

    // Navigate to the Rules tab
    visit(CONFIGURATIONS_INTEGRATIONS_URL);
    cy.contains('.euiTab', 'Rules').click();
    cy.url().should('include', '/configurations/basic_rules');

    // Verify the CrowdStrike promotion rule appears in the table
    cy.contains(CROWDSTRIKE_RULE_NAME, { timeout: PROMOTION_RULES_BOOTSTRAP_TIMEOUT }).should(
      'be.visible'
    );

    // Verify the rule is enabled (the switch toggle should be checked)
    cy.contains(CROWDSTRIKE_RULE_NAME)
      .closest('tr')
      .find(RULE_SWITCH)
      .should('have.attr', 'aria-checked', 'true');
  });
});
