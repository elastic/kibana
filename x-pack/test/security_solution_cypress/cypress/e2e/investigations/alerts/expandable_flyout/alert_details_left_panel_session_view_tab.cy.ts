/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import {
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_ERROR,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_session_view_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_BUTTON_GROUP,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout left panel session view',
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
    });

    it('should display session view under visualize', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB)
        .should('be.visible')
        .and('have.text', 'Visualize');

      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_BUTTON_GROUP).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON)
        .should('be.visible')
        .and('have.text', 'Session View');

      // TODO ideally we would have a test for the session view component instead
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_ERROR)
        .should('be.visible')
        .and('contain.text', 'Unable to display session view')
        .and('contain.text', 'There was an error displaying session view');
    });
  }
);
