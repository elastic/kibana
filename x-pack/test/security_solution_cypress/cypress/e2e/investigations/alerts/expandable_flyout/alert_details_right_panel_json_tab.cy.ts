/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import { scrollWithinDocumentDetailsExpandableFlyoutRightSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel_json_tab';
import { openJsonTab } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT } from '../../../../screens/expandable_flyout/alert_details_right_panel_json_tab';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout right panel json tab',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    beforeEach(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      openJsonTab();
    });

    it('should display the json component', () => {
      // the json component is rendered within a dom element with overflow, so Cypress isn't finding it
      // this next line is a hack that vertically scrolls down to ensure Cypress finds it
      scrollWithinDocumentDetailsExpandableFlyoutRightSection(0, 7000);
      cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT).should('be.visible');
    });
  }
);
