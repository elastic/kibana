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
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_LINK,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_RIGHT_SECTION,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_LINK,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_entities_tab';
import {
  HOST_PANEL_HEADER,
  HOST_PREVIEW_PANEL_FOOTER,
  OPEN_HOST_FLYOUT_LINK,
} from '../../../../screens/hosts/flyout_host_panel';
import {
  USER_PANEL_HEADER,
  USER_PREVIEW_PANEL_FOOTER,
  OPEN_USER_FLYOUT_LINK,
} from '../../../../screens/users/flyout_user_panel';
import {
  PREVIEW_SECTION,
  PREVIEW_BANNER,
} from '../../../../screens/expandable_flyout/alert_details_preview_panel';
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

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_RIGHT_SECTION).should(
        'contain.text',
        'Related hosts: 0'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS).should('exist');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_RIGHT_SECTION).should(
        'contain.text',
        'Related users: 0'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS).should('exist');
    });

    it('should open host preview when click on host details title', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_LINK).should(
        'contain.text',
        'siem-kibana'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_LINK).click();

      cy.get(PREVIEW_SECTION).should('exist');
      cy.get(PREVIEW_BANNER).should('have.text', 'Preview host details');
      cy.get(HOST_PANEL_HEADER).should('exist');
      cy.get(HOST_PREVIEW_PANEL_FOOTER).should('exist');

      cy.log('click on footer link');

      cy.get(OPEN_HOST_FLYOUT_LINK).click();
      cy.get(HOST_PANEL_HEADER).should('exist');
      cy.get(PREVIEW_SECTION).should('not.exist');
      cy.get(HOST_PREVIEW_PANEL_FOOTER).should('not.exist');
    });

    it('should open user preview when click on user details title', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_LINK).should('contain.text', 'test');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_LINK).click();

      cy.get(PREVIEW_SECTION).should('exist');
      cy.get(PREVIEW_BANNER).should('have.text', 'Preview user details');
      cy.get(USER_PANEL_HEADER).should('exist');
      cy.get(USER_PREVIEW_PANEL_FOOTER).should('exist');

      cy.log('click on footer link');

      cy.get(OPEN_USER_FLYOUT_LINK).click();
      cy.get(USER_PANEL_HEADER).should('exist');
      cy.get(PREVIEW_SECTION).should('not.exist');
      cy.get(USER_PREVIEW_PANEL_FOOTER).should('not.exist');
    });
  }
);
