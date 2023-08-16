/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import {
  CORRELATIONS_ANCESTRY_SECTION,
  CORRELATIONS_ANCESTRY_TABLE,
  CORRELATIONS_CASES_SECTION,
  CORRELATIONS_SESSION_SECTION,
  CORRELATIONS_SOURCE_SECTION,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import {
  expandCorrelationsSection,
  openCorrelationsTab,
} from '../../../../tasks/expandable_flyout/alert_details_left_panel_correlations_tab';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import {
  createNewCaseFromExpandableFlyout,
  expandFirstAlertExpandableFlyout,
} from '../../../../tasks/expandable_flyout/common';
import { cleanKibana } from '../../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { login, visit } from '../../../../tasks/login';
import { ALERTS_URL } from '../../../../urls/navigation';

describe(
  'Expandable flyout left panel correlations',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    beforeEach(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      createNewCaseFromExpandableFlyout();
      openInsightsTab();
      openCorrelationsTab();
    });

    it('should render correlations details correctly', () => {
      cy.log('link the alert to a new case');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB).scrollIntoView();

      cy.log('should render the Insights header');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('be.visible')
        .and('have.text', 'Insights');

      cy.log('should render the inner tab switch');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP).should('be.visible');

      cy.log('should render correlations tab activator / button');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON)
        .should('be.visible')
        .and('have.text', 'Correlations');

      cy.log('should render all the correlations sections');

      cy.get(CORRELATIONS_ANCESTRY_SECTION)
        .should('be.visible')
        .and('have.text', '1 alert related by ancestry');

      cy.get(CORRELATIONS_SOURCE_SECTION)
        .should('be.visible')
        .and('have.text', '0 alerts related by source event');

      cy.get(CORRELATIONS_SESSION_SECTION)
        .should('be.visible')
        .and('have.text', '1 alert related by session');

      cy.get(CORRELATIONS_CASES_SECTION).should('be.visible').and('have.text', '1 related case');

      expandCorrelationsSection(CORRELATIONS_ANCESTRY_SECTION);

      cy.get(CORRELATIONS_ANCESTRY_TABLE).should('be.visible');
    });
  }
);
