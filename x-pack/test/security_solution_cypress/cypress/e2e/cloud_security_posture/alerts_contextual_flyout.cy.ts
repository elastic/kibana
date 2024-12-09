/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from '../../tasks/api_calls/rules';
import { getNewRule } from '../../objects/rule';
import { getDataTestSubjectSelector } from '../../helpers/common';

import { deleteAlertsAndRules } from '../../tasks/api_calls/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { visit } from '../../tasks/navigation';
import {
  expandFirstAlertHostFlyout,
  expandFirstAlertUserFlyout,
} from '../../tasks/asset_criticality/common';

const CSP_INSIGHT_ALERTS_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsAlertsTitleLink'
);

const CSP_INSIGHT_TAB_TITLE = getDataTestSubjectSelector('securitySolutionFlyoutInsightInputsTab');
const CSP_INSIGHT_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutMisconfigurationFindingsTable'
);

const ALERT_PREVIEW_EXPAND_BUTTON = getDataTestSubjectSelector(
  'alertPreviewExpandButtonTestSubject'
);

const EXPAND_DETAILS_BUTTON = getDataTestSubjectSelector(
  'securitySolutionFlyoutNavigationExpandDetailButton'
);

const PREVIEW_SECTION = getDataTestSubjectSelector('previewSection');

const clickAlertsTitle = () => {
  cy.get(CSP_INSIGHT_ALERTS_TITLE).click();
};

const clickAlertPreviewExpandButton = () => {
  cy.get(ALERT_PREVIEW_EXPAND_BUTTON).click();
};

const clickExpandButton = () => {
  cy.get(EXPAND_DETAILS_BUTTON).click();
};

const checkAlertsTitleExistAndClickable = () => {
  cy.log('check if Alerts preview title shown');
  cy.get(CSP_INSIGHT_ALERTS_TITLE).should('be.visible');
  waitForAlertsToPopulate();
  clickAlertsTitle();
};

describe('Alert details expandable flyout', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  context('Host name - Has Alerts', () => {
    beforeEach(() => {
      cy.reload();
    });
    it('should display Alerts preview under Insights Entities ', () => {
      expandFirstAlertHostFlyout();
      checkAlertsTitleExistAndClickable();
      cy.get(CSP_INSIGHT_TAB_TITLE).should('be.visible');
      cy.get(CSP_INSIGHT_TABLE).should('be.visible');
    });

    it('should display Alert preview flyout when clickin on Expand button on Alerts Row', () => {
      expandFirstAlertHostFlyout();
      checkAlertsTitleExistAndClickable();
      cy.get(ALERT_PREVIEW_EXPAND_BUTTON).click();
      cy.get(PREVIEW_SECTION).should('be.visible');
    });
  });

  context('User name - Has Alerts', () => {
    it('should display Alerts preview under Insights Entities ', () => {
      expandFirstAlertUserFlyout();
      checkAlertsTitleExistAndClickable();
      cy.get(CSP_INSIGHT_TAB_TITLE).should('be.visible');
      cy.get(CSP_INSIGHT_TABLE).should('be.visible');
    });

    it('should display Alert preview flyout when clickin on Expand button on Alerts Row', () => {
      expandFirstAlertUserFlyout();
      checkAlertsTitleExistAndClickable();
      cy.get(ALERT_PREVIEW_EXPAND_BUTTON).click();
      cy.get(PREVIEW_SECTION).should('be.visible');
    });
  });
});
