/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_analyzer_graph_tab';
import { DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB } from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { openGraphAnalyzerTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_analyzer_graph_tab';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { ANALYZER_NODE } from '../../../../screens/alerts';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

// TODO enable once the visualize tabs are back
describe.skip(
  'Alert details expandable flyout left panel analyzer graph',
  { tags: ['@ess', '@skipInServerless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openGraphAnalyzerTab();
    });

    it('should display analyzer graph and node list under visualize', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB)
        .should('have.text', 'Visualize')
        .and('have.class', 'euiTab-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON)
        .should('have.text', 'Analyzer Graph')
        .and('have.class', 'euiButtonGroupButton-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT).should('exist');
      cy.get(ANALYZER_NODE).first().should('exist');
    });
  }
);
