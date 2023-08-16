/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { INDICATOR_MATCH_ENRICHMENT_SECTION } from '../../../../screens/alerts_details';
import { cleanKibana } from '../../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { login, visit } from '../../../../tasks/login';
import { ALERTS_URL } from '../../../../urls/navigation';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { openThreatIntelligenceTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_threat_intelligence_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP,
} from '../../../../screens/expandable_flyout/alert_details_left_panel';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON } from '../../../../screens/expandable_flyout/alert_details_left_panel_threat_intelligence_tab';

describe(
  'Expandable flyout left panel threat intelligence',
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
      openThreatIntelligenceTab();
    });

    it('should serialize its state to url', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('be.visible')
        .and('have.text', 'Insights');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON)
        .should('be.visible')
        .and('have.text', 'Threat Intelligence');

      cy.get(INDICATOR_MATCH_ENRICHMENT_SECTION).should('be.visible');
    });
  }
);
