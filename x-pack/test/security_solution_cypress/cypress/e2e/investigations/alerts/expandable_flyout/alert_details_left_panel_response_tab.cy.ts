/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_RESPONSE_EMPTY } from '../../../../screens/expandable_flyout/alert_details_left_panel_response_tab';
import { openResponseTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_response_tab';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe('Alert details expandable flyout left panel investigation', () => {
  beforeEach(() => {
    cleanKibana();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    expandFirstAlertExpandableFlyout();
    expandDocumentDetailsExpandableFlyoutLeftSection();
    openResponseTab();
  });

  it('should display empty response message', () => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_RESPONSE_EMPTY).should('be.visible');
  });
});
