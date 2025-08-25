/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import {
  CORRELATIONS_ANCESTRY_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON,
  CORRELATIONS_ANCESTRY_SECTION_TABLE,
  CORRELATIONS_ANCESTRY_SECTION_TITLE,
  CORRELATIONS_CASES_SECTION_TABLE,
  CORRELATIONS_CASES_SECTION_TITLE,
  CORRELATIONS_SESSION_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON,
  CORRELATIONS_SESSION_SECTION_TABLE,
  CORRELATIONS_SESSION_SECTION_TITLE,
  CORRELATIONS_SOURCE_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON,
  CORRELATIONS_SOURCE_SECTION_TABLE,
  CORRELATIONS_SOURCE_SECTION_TITLE,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB } from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { openCorrelationsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_correlations_tab';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import {
  createNewCaseFromExpandableFlyout,
  expandAlertAtIndexExpandableFlyout,
} from '../../../../tasks/expandable_flyout/common';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';

describe('Expandable flyout left panel correlations', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    expandAlertAtIndexExpandableFlyout();
    expandDocumentDetailsExpandableFlyoutLeftSection();
    createNewCaseFromExpandableFlyout();
    openInsightsTab();
    openCorrelationsTab();
  });

  it('should render correlations details correctly', () => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
      .should('have.text', 'Insights')
      .and('have.class', 'euiTab-isSelected');

    cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON)
      .should('have.text', 'Correlations')
      .and('have.class', 'euiButtonGroupButton-isSelected');

    // cy.log('suppressed alerts');

    // TODO get proper data to test suppressed alerts
    // cy.get(CORRELATIONS_SUPPRESSED_ALERTS_TITLE).scrollIntoView();
    // cy.get(CORRELATIONS_SUPPRESSED_ALERTS_TITLE)
    //   .should('be.visible')
    //   .and('contain.text', '1 suppressed alert');
    // cy.get(CORRELATIONS_SUPPRESSED_ALERTS_INVESTIGATE_IN_TIMELINE_BUTTON).should('be.visible');

    cy.log('related cases');

    cy.get(CORRELATIONS_CASES_SECTION_TITLE).should('contain.text', '1 related case');
    cy.get(CORRELATIONS_CASES_SECTION_TABLE)
      .should('contain.text', 'case')
      .and('contain.text', 'open');

    cy.log('related alerts by source event');

    cy.get(CORRELATIONS_SOURCE_SECTION_TITLE).should(
      'contain.text',
      '1 alert related by source event'
    );
    cy.get(CORRELATIONS_SOURCE_SECTION_TABLE).should('exist');
    cy.get(CORRELATIONS_SOURCE_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON).should(
      'contain.text',
      'Investigate in timeline'
    );

    cy.log('related alerts by session');

    cy.get(CORRELATIONS_SESSION_SECTION_TITLE).should('contain.text', '1 alert related by session');
    cy.get(CORRELATIONS_SESSION_SECTION_TABLE).should('exist');
    cy.get(CORRELATIONS_SESSION_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON).should(
      'contain.text',
      'Investigate in timeline'
    );

    cy.log('related alerts by ancestry');

    cy.get(CORRELATIONS_ANCESTRY_SECTION_TITLE).should(
      'contain.text',
      '1 alert related by ancestry'
    );
    cy.get(CORRELATIONS_ANCESTRY_SECTION_TABLE).should('exist');
    cy.get(CORRELATIONS_ANCESTRY_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON).should(
      'contain.text',
      'Investigate in timeline'
    );
  });
});
