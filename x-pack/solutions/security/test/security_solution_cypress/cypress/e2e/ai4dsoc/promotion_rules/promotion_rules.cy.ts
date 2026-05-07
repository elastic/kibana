/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { cleanFleet } from '../../../tasks/api_calls/fleet';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import {
  installIntegrationFromBrowsePage,
  visitPromotionRulesTab,
} from '../../../tasks/promotion_rules';
import { RULE_SWITCH } from '../../../screens/alerts_detection_rules';

const CROWDSTRIKE_INTEGRATION_NAME = 'crowdstrike';
const CROWDSTRIKE_RULE_NAME = 'CrowdStrike External Alerts';

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
    // Uses platform_engineer as a proxy for _search_ai_lake_soc_manager because
    // the Cypress SAML auth provider does not yet support tier-specific roles.
    // See: x-pack/solutions/security/test/security_solution_cypress/cypress/support/saml_auth.ts
    login('platform_engineer');
  });

  it('installs and displays the CrowdStrike promotion rule after integration install', () => {
    installIntegrationFromBrowsePage(CROWDSTRIKE_INTEGRATION_NAME);

    visitPromotionRulesTab();

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
