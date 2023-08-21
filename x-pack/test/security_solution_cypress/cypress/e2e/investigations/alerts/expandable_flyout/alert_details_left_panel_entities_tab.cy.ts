/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_entities_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { openEntitiesTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_entities_tab';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout left panel entities',
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
      openInsightsTab();
      openEntitiesTab();
    });

    it('should display analyzer graph and node list under Insights Entities', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('be.visible')
        .and('have.text', 'Insights');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON)
        .should('be.visible')
        .and('have.text', 'Entities');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS).scrollIntoView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS).scrollIntoView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS).should('be.visible');
    });
  }
);
