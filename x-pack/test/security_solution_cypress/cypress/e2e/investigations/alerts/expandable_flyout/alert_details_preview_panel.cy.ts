/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  CORRELATIONS_ANCESTRY_SECTION_TABLE,
  CORRELATIONS_SESSION_SECTION_TABLE,
  CORRELATIONS_SOURCE_SECTION_TABLE,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';
import {
  openCorrelationsTab,
  clickExpandFromRelatedBySession,
  clickExpandFromRelatedByAncestry,
  clickExpandFromRelatedBySource,
} from '../../../../tasks/expandable_flyout/alert_details_left_panel_correlations_tab';
import {
  closePreview,
  goToPreviousPreview,
  openNewFlyout,
} from '../../../../tasks/expandable_flyout/alert_details_preview_panel';
import {
  DOCUMENT_DETAILS_FLYOUT_HEADER_LINK_ICON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON,
} from '../../../../screens/expandable_flyout/alert_details_right_panel';
import {
  PREVIEW_SECTION,
  PREVIEW_BANNER,
  DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER,
  DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK,
  PREVIEW_BACK_BUTTON,
  PREVIEW_CLOSE_BUTTON,
} from '../../../../screens/expandable_flyout/alert_details_preview_panel';
import {
  expandDocumentDetailsExpandableFlyoutLeftSection,
  openJsonTab,
  openTableTab,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel';

describe(
  'Opening alert previews from alert details flyout',
  { tags: ['@ess', '@serverless'] },
  () => {
    const rule = getNewRule();

    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openInsightsTab();
      openCorrelationsTab();
    });

    it('should render alert preview', () => {
      cy.log('related alerts by source');
      cy.get(CORRELATIONS_SOURCE_SECTION_TABLE).should('exist');
      clickExpandFromRelatedBySource();

      cy.log('Verify preview section is visible');
      cy.get(PREVIEW_SECTION).should('exist');
      cy.get(PREVIEW_BANNER).should('have.text', 'Preview alert details');
      cy.get(PREVIEW_BACK_BUTTON).should('exist');
      cy.get(PREVIEW_CLOSE_BUTTON).should('exist');

      cy.log('Verify title and main sections are rendered');
      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).eq(1).should('have.text', rule.name);
      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_LINK_ICON).should('exist');

      cy.log('Verify the open full alert detail footer is visible on all tabs');

      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK).should('be.visible');

      openTableTab(1);
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK).should('be.visible');

      openJsonTab(1);
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK).should('be.visible');
    });

    it('should close previews when close button is clicked', () => {
      cy.log('open alert preview from related alerts by session');
      cy.get(CORRELATIONS_SESSION_SECTION_TABLE).should('exist');
      clickExpandFromRelatedBySession();

      cy.log('Verify preview section is visible');

      cy.get(PREVIEW_SECTION).should('exist');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');

      // TO-DO: enable when we can have multiple alerts in correlations
      //   cy.log('open another alert ');
      //   clickExpandFromRelatedBySession(1);

      //   cy.get(PREVIEW_SECTION).should('exist');
      //   cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');

      cy.log('click close button');

      closePreview();
      cy.get(PREVIEW_SECTION).should('not.exist');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('not.exist');
    });

    // TO-DO: enable when we can have multiple alerts in correlations
    it('should go to previous previews when back button is clicked', () => {
      cy.log('open alert preview from related alerts by session');
      cy.get(CORRELATIONS_SESSION_SECTION_TABLE).should('exist');
      clickExpandFromRelatedBySession();

      cy.log('Verify preview section is visible');

      cy.get(PREVIEW_SECTION).should('exist');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');

      // TO-DO: enable when we can have multiple alerts in correlations
      //   cy.log('open another alert ');
      //   clickExpandFromRelatedBySession(1);

      //   cy.get(PREVIEW_SECTION).should('exist');
      //   cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');

      //   cy.log('click back button once');

      //   goToPreviousPreview();
      //   cy.get(PREVIEW_SECTION).should('exist');
      //   cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');

      cy.log('click back button again');
      goToPreviousPreview();
      cy.get(PREVIEW_SECTION).should('not.exist');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('not.exist');
    });

    it('should open a new flyout when footer link is clicked', () => {
      cy.log('open alert preview from related alerts by ancestry');
      cy.get(CORRELATIONS_ANCESTRY_SECTION_TABLE).should('exist');
      clickExpandFromRelatedByAncestry();

      cy.log('Verify preview section is visible');

      cy.get(PREVIEW_SECTION).should('exist');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('be.visible');

      cy.log('Click footer link to open alert details flyout');
      openNewFlyout();
      cy.get(PREVIEW_SECTION).should('not.exist');
      cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER).should('not.exist');

      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');
    });
  }
);
