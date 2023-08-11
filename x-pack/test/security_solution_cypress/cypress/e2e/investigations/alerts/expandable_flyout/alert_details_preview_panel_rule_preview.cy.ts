/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import {
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SECTION,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_HEADER,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_TITLE,
  DOCUMENT_DETAILS_FLYOUT_CREATED_BY,
  DOCUMENT_DETAILS_FLYOUT_UPDATED_BY,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_BODY,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER,
} from '../../../../screens/expandable_flyout/alert_details_preview_panel_rule_preview';
import {
  toggleRulePreviewAboutSection,
  toggleRulePreviewDefinitionSection,
  toggleRulePreviewScheduleSection,
} from '../../../../tasks/expandable_flyout/alert_details_preview_panel_rule_preview';
import { clickRuleSummaryButton } from '../../../../tasks/expandable_flyout/alert_details_right_panel_overview_tab';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe('Alert details expandable flyout rule preview panel', () => {
  const rule = getNewRule();

  beforeEach(() => {
    cleanKibana();
    login();
    createRule(rule);
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    expandFirstAlertExpandableFlyout();
    clickRuleSummaryButton();
  });

  describe('rule preview', () => {
    it(
      'should display rule preview and its sub sections',
      { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
      () => {
        cy.log('rule preview panel');

        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SECTION).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_HEADER).should('be.visible');
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_BODY).should('be.visible');

        cy.log('title');

        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_TITLE).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_TITLE).should('be.visible');
        cy.get(DOCUMENT_DETAILS_FLYOUT_CREATED_BY).should('be.visible');
        cy.get(DOCUMENT_DETAILS_FLYOUT_UPDATED_BY).should('be.visible');

        cy.log('about');

        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_HEADER)
          .should('be.visible')
          .and('contain.text', 'About');
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_ABOUT_SECTION_CONTENT).should('be.visible');
        toggleRulePreviewAboutSection();

        cy.log('definition');

        toggleRulePreviewDefinitionSection();
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_HEADER)
          .should('be.visible')
          .and('contain.text', 'Definition');
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_DEFINITION_SECTION_CONTENT).should(
          'be.visible'
        );
        toggleRulePreviewDefinitionSection();

        cy.log('schedule');

        toggleRulePreviewScheduleSection();
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_HEADER)
          .should('be.visible')
          .and('contain.text', 'Schedule');
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_SCHEDULE_SECTION_CONTENT).should('be.visible');
        toggleRulePreviewScheduleSection();

        cy.log('footer');
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_RULE_PREVIEW_FOOTER).should('be.visible');
      }
    );
  });
});
