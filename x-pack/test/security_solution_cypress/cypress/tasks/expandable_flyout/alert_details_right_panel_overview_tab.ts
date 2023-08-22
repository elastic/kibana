/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID,
  INSIGHTS_ENTITIES_TITLE_LINK_TEST_ID,
  INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TITLE_LINK_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/right/components/test_ids';
import {
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_ALERT_REASON_PREVIEW_BUTTON,
} from '../../screens/expandable_flyout/alert_details_right_panel_overview_tab';

/* About section */

/**
 * Toggle the Overview tab about section in the document details expandable flyout right section
 */
export const toggleOverviewTabAboutSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER).should('be.visible').click();
};

/* Investigation section */

/**
 * Toggle the Overview tab investigation section in the document details expandable flyout right section
 */
export const toggleOverviewTabInvestigationSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER)
    .should('be.visible')
    .click();
};

/* Insights section */

/**
 * Toggle the Overview tab insights section in the document details expandable flyout right section
 */
export const toggleOverviewTabInsightsSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER).should('be.visible').click();
};

/**
 * Click on the header in the right section, Insights, Entities
 */
export const navigateToEntitiesDetails = () => {
  cy.get(INSIGHTS_ENTITIES_TITLE_LINK_TEST_ID).scrollIntoView();
  cy.get(INSIGHTS_ENTITIES_TITLE_LINK_TEST_ID).should('be.visible').click();
};

/**
 * Click on the header in the right section, Insights, Threat Intelligence
 */
export const navigateToThreatIntelligenceDetails = () => {
  cy.get(INSIGHTS_THREAT_INTELLIGENCE_TITLE_LINK_TEST_ID).scrollIntoView();
  cy.get(INSIGHTS_THREAT_INTELLIGENCE_TITLE_LINK_TEST_ID).should('be.visible').click();
};

/**
 * Click on the header in the right section, Insights, Correlations
 */
export const navigateToCorrelationsDetails = () => {
  cy.get(INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID).scrollIntoView();
  cy.get(INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID).should('be.visible').click();
};

/**
 * Click on the view all button under the right section, Insights, Prevalence
 */
export const navigateToPrevalenceDetails = () => {
  cy.get(INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID).scrollIntoView();
  cy.get(INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID).should('be.visible').click();
};

/* Visualizations section */

/**
 * Toggle the Overview tab visualizations section in the document details expandable flyout right section
 */
export const toggleOverviewTabVisualizationsSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER)
    .should('be.visible')
    .click();
};

/**
 * Toggle the Overview tab response section in the document details expandable flyout right section
 */
export const toggleOverviewTabResponseSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_HEADER).should('be.visible').click();
};

/**
 * Click on the investigation guide button under the right section, Visualization
 */
export const clickInvestigationGuideButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON)
    .should('be.visible')
    .click();
};

/**
 * Click `Rule summary` button to open rule preview panel
 */
export const clickRuleSummaryButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE)
    .should('be.visible')
    .within(() => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON)
        .should('be.visible')
        .click();
    });
};

/**
 * Click `Show full reason` button to open alert reason preview panel
 */
export const clickAlertReasonButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE)
    .should('be.visible')
    .within(() => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_ALERT_REASON_PREVIEW_BUTTON)
        .should('be.visible')
        .click();
    });
};
