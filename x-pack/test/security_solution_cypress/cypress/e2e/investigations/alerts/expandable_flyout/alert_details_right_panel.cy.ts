/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import { tag } from '../../../../tags';

import {
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT,
  EXISTING_CASE_SELECT_BUTTON,
  VIEW_CASE_TOASTER_LINK,
} from '../../../../screens/expandable_flyout/common';
import {
  createNewCaseFromCases,
  expandFirstAlertExpandableFlyout,
  navigateToAlertsPage,
  navigateToCasesPage,
} from '../../../../tasks/expandable_flyout/common';
import { ALERT_CHECKBOX } from '../../../../screens/alerts';
import { CASE_DETAILS_PAGE_TITLE } from '../../../../screens/case_details';
import {
  DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_ENDPOINT_EXCEPTION,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_MARK_AS_ACKNOWLEDGED,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_CANCEL_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_HEADER,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_EXISTING_CASE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_ENTRY,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_SECTION,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_MARK_AS_CLOSED,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_RESPOND,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_CHAT_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE,
  DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE_VALUE,
  DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY,
  DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY_VALUE,
  DOCUMENT_DETAILS_FLYOUT_HEADER_STATUS,
  DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB,
} from '../../../../screens/expandable_flyout/alert_details_right_panel';
import {
  collapseDocumentDetailsExpandableFlyoutLeftSection,
  expandDocumentDetailsExpandableFlyoutLeftSection,
  openJsonTab,
  openTableTab,
  openTakeActionButton,
  openTakeActionButtonAndSelectItem,
  selectTakeActionItem,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout right panel',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    const rule = getNewRule();

    beforeEach(() => {
      cleanKibana();
      login();
      createRule(rule);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should display header and footer basics', () => {
      expandFirstAlertExpandableFlyout();

      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('be.visible').and('have.text', rule.name);

      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_CHAT_BUTTON).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_STATUS).should('be.visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE_VALUE)
        .should('be.visible')
        .and('have.text', rule.risk_score);

      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY_VALUE)
        .should('be.visible')
        .and('have.text', upperFirst(rule.severity));

      cy.log('Verify all 3 tabs are visible');

      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB)
        .should('be.visible')
        .and('have.text', 'Overview');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('be.visible').and('have.text', 'Table');
      cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB).should('be.visible').and('have.text', 'JSON');

      cy.log('Verify the expand/collapse button is visible and functionality works');

      expandDocumentDetailsExpandableFlyoutLeftSection();
      cy.get(DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON)
        .should('be.visible')
        .and('have.text', 'Collapse details');

      collapseDocumentDetailsExpandableFlyoutLeftSection();
      cy.get(DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON)
        .should('be.visible')
        .and('have.text', 'Expand details');

      cy.log('Verify the take action button is visible on all tabs');

      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).scrollIntoView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

      openTableTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).scrollIntoView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

      openJsonTab();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).scrollIntoView();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');
    });

    // TODO this will change when add to existing case is improved
    //  https://github.com/elastic/security-team/issues/6298
    it('should add to existing case', () => {
      navigateToCasesPage();
      createNewCaseFromCases();

      cy.get(CASE_DETAILS_PAGE_TITLE).should('be.visible').and('have.text', 'case');
      navigateToAlertsPage();
      expandFirstAlertExpandableFlyout();
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_EXISTING_CASE);

      cy.get(EXISTING_CASE_SELECT_BUTTON).should('be.visible').contains('Select').click();
      cy.get(VIEW_CASE_TOASTER_LINK).should('be.visible').and('contain.text', 'View case');
    });

    // TODO this will change when add to new case is improved
    //  https://github.com/elastic/security-team/issues/6298
    it('should add to new case', () => {
      expandFirstAlertExpandableFlyout();
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE);

      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT).type('case');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT).type(
        'case description'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON).click();

      cy.get(VIEW_CASE_TOASTER_LINK).should('be.visible').and('contain.text', 'View case');
    });

    it('should mark as acknowledged', () => {
      cy.get(ALERT_CHECKBOX).should('have.length', 2);

      expandFirstAlertExpandableFlyout();
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_MARK_AS_ACKNOWLEDGED);

      // TODO figure out how to verify the toasts pops up
      // cy.get(KIBANA_TOAST)
      //   .should('be.visible')
      //   .and('have.text', 'Successfully marked 1 alert as acknowledged.');
      cy.get(ALERT_CHECKBOX).should('have.length', 1);
    });

    it('should mark as closed', () => {
      cy.get(ALERT_CHECKBOX).should('have.length', 2);

      expandFirstAlertExpandableFlyout();
      openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_MARK_AS_CLOSED);

      // TODO figure out how to verify the toasts pops up
      // cy.get(KIBANA_TOAST).should('be.visible').and('have.text', 'Successfully closed 1 alert.');
      cy.get(ALERT_CHECKBOX).should('have.length', 1);
    });

    // these actions are now grouped together as we're not really testing their functionality but just the existence of the option in the dropdown
    it('should test other action within take action dropdown', () => {
      expandFirstAlertExpandableFlyout();

      cy.log('should add endpoint exception');

      // TODO figure out why this option is disabled in Cypress but not running the app locally
      //  https://github.com/elastic/security-team/issues/6300
      openTakeActionButton();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_ENDPOINT_EXCEPTION).should('be.disabled');

      cy.log('should add rule exception');

      // TODO this isn't fully testing the add rule exception yet
      //  https://github.com/elastic/security-team/issues/6301
      selectTakeActionItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION);
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_HEADER).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_CANCEL_BUTTON)
        .should('be.visible')
        .click();

      // cy.log('should isolate host');

      // TODO figure out why isolate host isn't showing up in the dropdown
      //  https://github.com/elastic/security-team/issues/6302
      // openTakeActionButton();
      // cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ISOLATE_HOST).should('be.visible');

      cy.log('should respond');

      // TODO this will change when respond is improved
      //  https://github.com/elastic/security-team/issues/6303
      openTakeActionButton();
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_RESPOND).should('be.disabled');

      cy.log('should investigate in timeline');

      selectTakeActionItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE);
      cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_SECTION)
        .first()
        .within(() =>
          cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_ENTRY).should('be.visible')
        );
    });
  }
);
