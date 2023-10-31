/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER,
} from '../../screens/expandable_flyout/alert_details_preview_panel_rule_preview';

/* About section */

/**
 * Toggle the About Section in Rule Preview panel
 */
export const toggleRulePreviewAboutSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER).should('be.visible').click();
};

/* Definition section */

/**
 * Toggle the Definition Section in Rule Preview panel
 */
export const toggleRulePreviewDefinitionSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER)
    .should('be.visible')
    .click();
};

/* Schedule section */

/**
 * Toggle the Schedule Section in Rule Preview panel
 */
export const toggleRulePreviewScheduleSection = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER).should('be.visible').click();
};
