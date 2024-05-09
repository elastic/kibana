/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_RIGHT_SECTION,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_TITLE,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_RIGHT_SECTION,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_TITLE,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_entities_tab';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB } from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { openEntitiesTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_entities_tab';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout left panel entities',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openInsightsTab();
      openEntitiesTab();
    });

    it('should display host details and user details under Insights Entities', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('have.text', 'Insights')
        .and('have.class', 'euiTab-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON)
        .should('have.text', 'Entities')
        .and('have.class', 'euiButtonGroupButton-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_TITLE).should(
        'contain.text',
        'test'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_RIGHT_SECTION).should(
        'contain.text',
        'Related hosts: 0'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS).should('exist');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_TITLE).should(
        'contain.text',
        'siem-kibana'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_RIGHT_SECTION).should(
        'contain.text',
        'Related users: 0'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS).should('exist');
    });
  }
);
