/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { INDICATOR_MATCH_ENRICHMENT_SECTION } from '../../../../screens/alerts_details';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { openThreatIntelligenceTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_threat_intelligence_tab';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB } from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_threat_intelligence_tab';

describe(
  'Expandable flyout left panel threat intelligence',
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
      openThreatIntelligenceTab();
    });

    it('should serialize its state to url', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('have.text', 'Insights')
        .and('have.class', 'euiTab-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON)
        .should('have.text', 'Threat intelligence')
        .and('have.class', 'euiButtonGroupButton-isSelected');

      cy.get(INDICATOR_MATCH_ENRICHMENT_SECTION).should('exist');
    });
  }
);
