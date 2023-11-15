/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB,
  DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB_CONTENT,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_investigation_tab';
import { openInvestigationTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_investigation_tab';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout left panel investigation',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openInvestigationTab();
    });

    it('should display investigation guide', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB)
        .should('be.visible')
        .and('have.text', 'Investigation');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INVESTIGATION_TAB_CONTENT).should('be.visible');
    });
  }
);
