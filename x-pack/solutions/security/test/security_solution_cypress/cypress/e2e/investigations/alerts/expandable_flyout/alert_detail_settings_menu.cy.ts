/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  expandAlertAtIndexExpandableFlyout,
  expandAlertInTimelineAtIndexExpandableFlyout,
} from '../../../../tasks/expandable_flyout/common';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  clickOnPushModeOption,
  openRenderMenu,
} from '../../../../tasks/expandable_flyout/alert_detail_settings_menu';
import {
  DOCUMENT_DETAILS_FLYOUT_FLYOUT_TYPE_BUTTON_GROUP,
  DOCUMENT_DETAILS_FLYOUT_OVERLAY_OPTION,
  DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION,
} from '../../../../screens/expandable_flyout/alert_detail_settings_menu';
import { investigateFirstAlertInTimeline } from '../../../../tasks/alerts';
import { TIMELINE_FLYOUT } from '../../../../screens/timeline';

describe('Alert details expandable flyout', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule();

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(rule);
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should allow user to switch between push and overlay modes for flyout opened from alerts page', () => {
    expandAlertAtIndexExpandableFlyout();
    openRenderMenu();

    cy.log('should have the overlay option selected by default');

    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERLAY_OPTION).should(
      'have.class',
      'euiButtonGroupButton-isSelected'
    );
    cy.get(DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION).should(
      'not.have.class',
      'euiButtonGroupButton-isSelected'
    );

    cy.log('should persist selection via localstorage');

    clickOnPushModeOption();
    cy.reload();
    openRenderMenu();

    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERLAY_OPTION).should(
      'not.have.class',
      'euiButtonGroupButton-isSelected'
    );
    cy.get(DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION).should(
      'have.class',
      'euiButtonGroupButton-isSelected'
    );
  });

  it('should not allow user to switch between push and overlay modes for flyout opened from timeline', () => {
    investigateFirstAlertInTimeline();
    cy.get(TIMELINE_FLYOUT).within(() => expandAlertInTimelineAtIndexExpandableFlyout());
    openRenderMenu();

    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERLAY_OPTION).should(
      'have.class',
      'euiButtonGroupButton-isSelected'
    );
    cy.get(DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION).should(
      'not.have.class',
      'euiButtonGroupButton-isSelected'
    );
    cy.get(DOCUMENT_DETAILS_FLYOUT_FLYOUT_TYPE_BUTTON_GROUP).should('be.disabled');
  });
});
