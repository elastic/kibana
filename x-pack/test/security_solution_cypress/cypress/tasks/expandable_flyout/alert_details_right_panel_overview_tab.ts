/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_BUTTON,
} from '../../screens/expandable_flyout/alert_details_right_panel_overview_tab';

/* About section */

/**
 * Toggle the Overview tab about section in the document details expandable flyout right section
 */
export const toggleOverviewTabAboutSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_ABOUT_SECTION_HEADER).click();
};

/* Investigation section */

/**
 * Toggle the Overview tab investigation section in the document details expandable flyout right section
 */
export const toggleOverviewTabInvestigationSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_SECTION_HEADER).click();
};

/* Insights section */

/**
 * Toggle the Overview tab insights section in the document details expandable flyout right section
 */
export const toggleOverviewTabInsightsSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_SECTION_HEADER).click();
};

/**
 * Click on the header in the right section, Insights, Entities
 */
export const navigateToEntitiesDetails = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_ENTITIES_HEADER).click();
};

/**
 * Click on the header in the right section, Insights, Threat Intelligence
 */
export const navigateToThreatIntelligenceDetails = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_THREAT_INTELLIGENCE_HEADER).click();
};

/**
 * Click on the header in the right section, Insights, Correlations
 */
export const navigateToCorrelationsDetails = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_CORRELATIONS_HEADER).click();
};

/**
 * Click on the view all button under the right section, Insights, Prevalence
 */
export const navigateToPrevalenceDetails = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INSIGHTS_PREVALENCE_HEADER).click();
};

/* Visualizations section */

/**
 * Toggle the Overview tab visualizations section in the document details expandable flyout right section
 */
export const toggleOverviewTabVisualizationsSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_VISUALIZATIONS_SECTION_HEADER).click();
};

/**
 * Toggle the Overview tab response section in the document details expandable flyout right section
 */
export const toggleOverviewTabResponseSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_SECTION_HEADER).click();
};

/**
 * Click on the investigation guide button under the right section, Visualization
 */
export const clickInvestigationGuideButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_INVESTIGATION_GUIDE_BUTTON).click();
};

/**
 * Click `Rule summary` button to open rule preview panel
 */
export const clickRuleSummaryButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_DESCRIPTION_TITLE).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_RULE_PREVIEW_BUTTON).click();
  });
};

/**
 * Click `Show full reason` button to open alert reason preview panel
 */
export const clickAlertReasonButton = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_REASON_TITLE).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_OPEN_ALERT_REASON_PREVIEW_BUTTON).click();
  });
};

/**
 * Click the Response button to open the response detail tab in the left section
 */
export const navigateToResponseDetails = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB_RESPONSE_BUTTON).should('be.visible').click();
};
