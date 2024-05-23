/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';

import {
  EXISTING_CASE_SELECT_BUTTON,
  VIEW_CASE_TOASTER_LINK,
} from '../../../../screens/expandable_flyout/common';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { ALERT_CHECKBOX, EMPTY_ALERT_TABLE } from '../../../../screens/alerts';
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
  DOCUMENT_DETAILS_FLYOUT_HEADER_ICON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_LINK_ICON,
  DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE,
  DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE_VALUE,
  DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES,
  DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY_VALUE,
  DOCUMENT_DETAILS_FLYOUT_HEADER_STATUS,
  DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE,
  DOCUMENT_DETAILS_FLYOUT_JSON_TAB,
  DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB,
} from '../../../../screens/expandable_flyout/alert_details_right_panel';
import {
  closeFlyout,
  collapseDocumentDetailsExpandableFlyoutLeftSection,
  expandDocumentDetailsExpandableFlyoutLeftSection,
  fillOutFormToCreateNewCase,
  openJsonTab,
  openTableTab,
  openTakeActionButton,
  openTakeActionButtonAndSelectItem,
  selectTakeActionItem,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { ELASTICSEARCH_USERNAME, IS_SERVERLESS } from '../../../../env_var_names_constants';

// We need to use the 'soc_manager' role in order to have the 'Respond' action displayed in serverless
const isServerless = Cypress.env(IS_SERVERLESS);
const role = isServerless ? 'soc_manager' : Cypress.env(ELASTICSEARCH_USERNAME);

describe('Alert details expandable flyout right panel', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule();

  beforeEach(() => {
    deleteAlertsAndRules();
    login(role);
    createRule(rule);
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should display header and footer basics', () => {
    expandAlertAtIndexExpandableFlyout();

    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ICON).should('exist');
    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE).should('have.text', rule.name);
    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_LINK_ICON).should('exist');

    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_STATUS).should('have.text', 'open');

    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE).should('have.text', 'Risk score');
    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE_VALUE)
      .should('be.visible')
      .and('have.text', rule.risk_score);

    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES).should('have.text', 'Assignees');

    cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY_VALUE)
      .should('be.visible')
      .and('have.text', upperFirst(rule.severity));

    cy.log('Verify all 3 tabs are visible');

    cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB)
      .should('have.text', 'Overview')
      .and('have.class', 'euiTab-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB)
      .should('have.text', 'Table')
      .and('not.have.class', 'euiTab-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB)
      .should('have.text', 'JSON')
      .and('not.have.class', 'euiTab-isSelected');

    cy.log('Verify the expand/collapse button is visible and functionality works');

    expandDocumentDetailsExpandableFlyoutLeftSection();
    cy.get(DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON).should('have.text', 'Collapse details');

    collapseDocumentDetailsExpandableFlyoutLeftSection();
    cy.get(DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON).should('have.text', 'Expand details');

    cy.log('Verify the take action button is visible on all tabs');

    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

    openTableTab();
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('have.class', 'euiTab-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');

    openJsonTab();
    cy.get(DOCUMENT_DETAILS_FLYOUT_JSON_TAB).should('have.class', 'euiTab-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER).should('be.visible');
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON).should('be.visible');
  });

  // TODO this will change when add to existing case is improved
  //  https://github.com/elastic/security-team/issues/6298
  it('should add to existing case', () => {
    expandAlertAtIndexExpandableFlyout();
    openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE);
    fillOutFormToCreateNewCase();
    openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_EXISTING_CASE);

    cy.get(EXISTING_CASE_SELECT_BUTTON).contains('Select').click();

    cy.get(VIEW_CASE_TOASTER_LINK).should('contain.text', 'View case');
  });

  // TODO this will change when add to new case is improved
  //  https://github.com/elastic/security-team/issues/6298
  it('should add to new case', () => {
    expandAlertAtIndexExpandableFlyout();
    openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE);
    fillOutFormToCreateNewCase();

    cy.get(VIEW_CASE_TOASTER_LINK).should('contain.text', 'View case');
  });

  it('should mark as acknowledged', () => {
    cy.get(ALERT_CHECKBOX).should('have.length', 1);

    expandAlertAtIndexExpandableFlyout();
    openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_MARK_AS_ACKNOWLEDGED);

    cy.get(TOASTER).should('have.text', 'Successfully marked 1 alert as acknowledged.');
    cy.get(EMPTY_ALERT_TABLE).should('exist');
  });

  it('should mark as closed', () => {
    cy.get(ALERT_CHECKBOX).should('have.length', 1);

    expandAlertAtIndexExpandableFlyout();
    openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_MARK_AS_CLOSED);

    cy.get(TOASTER).should('have.text', 'Successfully closed 1 alert.');
    cy.get(EMPTY_ALERT_TABLE).should('exist');
  });

  // these actions are now grouped together as we're not really testing their functionality but just the existence of the option in the dropdown
  it('should test other action within take action dropdown', () => {
    expandAlertAtIndexExpandableFlyout();

    cy.log('should add endpoint exception');

    // TODO figure out why this option is disabled in Cypress but not running the app locally
    //  https://github.com/elastic/security-team/issues/6300
    openTakeActionButton();
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_ENDPOINT_EXCEPTION).should('be.disabled');

    cy.log('should add rule exception');

    // TODO this isn't fully testing the add rule exception yet
    //  https://github.com/elastic/security-team/issues/6301
    selectTakeActionItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION);
    cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_HEADER).should('exist');
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
        cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_ENTRY).should('exist')
      );
  });

  describe('Local storage persistence', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
    });

    it('should remember which tab was selected when opening another alert or after page refresh', () => {
      expandAlertAtIndexExpandableFlyout();

      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).should('have.class', 'euiTab-isSelected');

      openTableTab();

      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('have.class', 'euiTab-isSelected');

      cy.log('should persist selected tab when opening a different alert');

      expandAlertAtIndexExpandableFlyout(1);

      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).should('not.have.class', 'euiTab-isSelected');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('have.class', 'euiTab-isSelected');

      cy.log('should persist selected tab after closing flyout');

      closeFlyout();
      expandAlertAtIndexExpandableFlyout();

      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).should('not.have.class', 'euiTab-isSelected');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('have.class', 'euiTab-isSelected');

      cy.log('should persist selected tab after page refresh');

      closeFlyout();
      cy.reload();

      expandAlertAtIndexExpandableFlyout();
      cy.get(DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB).should('not.have.class', 'euiTab-isSelected');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB).should('have.class', 'euiTab-isSelected');
    });
  });
});
