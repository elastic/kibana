/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRule } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getNewRule } from '../../../../objects/rule';
import { cleanKibana } from '../../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../../tasks/rule_details';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { ALERTS_URL } from '../../../../urls/navigation';
import { closeFlyout } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE } from '../../../../screens/expandable_flyout/alert_details_right_panel';

describe('Expandable flyout state sync', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule();

  beforeEach(() => {
    cleanKibana();
    login();
    createRule<QueryRule>(rule);
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should test flyout url sync', () => {
    cy.url().should('not.include', 'eventFlyout');

    expandFirstAlertExpandableFlyout();

    cy.log('should serialize its state to url');

    cy.url().should('include', 'eventFlyout');
    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', rule.name);

    cy.log('should reopen the flyout after browser refresh');

    cy.reload();
    waitForAlertsToPopulate();

    cy.url().should('include', 'eventFlyout');
    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', rule.name);

    cy.log('should clear the url state when flyout is closed');

    closeFlyout();

    cy.url().should('not.include', 'eventFlyout');
  });
});
