/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openJsonTab } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import {
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB_COPY_TO_CLIPBOARD_BUTTON,
} from '../../../../screens/expandable_flyout/alert_details_right_panel_json_tab';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout right panel json tab',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
      openJsonTab();
    });

    it('should display the json component', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB_COPY_TO_CLIPBOARD_BUTTON).should(
        'have.text',
        'Copy to clipboard'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT)
        .should('contain.text', '_index')
        .and('contain.text', '_id');
    });
  }
);
