/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_ALERT_REASON_PREVIEW_CONTAINER } from '../../../../screens/expandable_flyout/alert_details_preview_panel_alert_reason_preview';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { clickAlertReasonButton } from '../../../../tasks/expandable_flyout/alert_details_right_panel_overview_tab';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout rule preview panel',
  { tags: ['@ess', '@serverless'] },
  () => {
    const rule = getNewRule();

    beforeEach(() => {
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      clickAlertReasonButton();
    });

    describe('alert reason preview', () => {
      it('should display alert reason preview', () => {
        cy.get(DOCUMENT_DETAILS_FLYOUT_ALERT_REASON_PREVIEW_CONTAINER).scrollIntoView();
        cy.get(DOCUMENT_DETAILS_FLYOUT_ALERT_REASON_PREVIEW_CONTAINER).should('be.visible');
      });
    });
  }
);
