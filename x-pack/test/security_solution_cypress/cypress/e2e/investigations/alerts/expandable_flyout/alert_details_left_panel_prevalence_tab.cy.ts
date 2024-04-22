/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openPrevalenceTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel_prevalence_tab';
import { openInsightsTab } from '../../../../tasks/expandable_flyout/alert_details_left_panel';
import { expandDocumentDetailsExpandableFlyoutLeftSection } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB } from '../../../../screens/expandable_flyout/alert_details_left_panel';
import {
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_ALERT_COUNT_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_NAME_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_TYPE_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_DOC_COUNT_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_HOST_PREVALENCE_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_USER_PREVALENCE_CELL,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_DATE_PICKER,
} from '../../../../screens/expandable_flyout/alert_details_left_panel_prevalence_tab';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout left panel prevalence',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule({ ...getNewRule(), investigation_fields: { field_names: ['host.os.name'] } });
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
      expandDocumentDetailsExpandableFlyoutLeftSection();
      openInsightsTab();
      openPrevalenceTab();
    });

    it('should display prevalence tab', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB)
        .should('have.text', 'Insights')
        .and('have.class', 'euiTab-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON)
        .should('have.text', 'Prevalence')
        .and('have.class', 'euiButtonGroupButton-isSelected');

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_DATE_PICKER).should(
        'contain.text',
        'Last 30 days'
      );

      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_TYPE_CELL)
        .should('contain.text', 'host.os.name')
        .and('contain.text', 'host.name')
        .and('contain.text', 'user.name');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_NAME_CELL)
        .should('contain.text', 'Mac OS X')
        .and('contain.text', 'siem-kibana')
        .and('contain.text', 'test');
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_ALERT_COUNT_CELL).should(
        'contain.text',
        1
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_DOC_COUNT_CELL).should(
        'contain.text',
        '—'
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_HOST_PREVALENCE_CELL).should(
        'contain.text',
        100
      );
      cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_USER_PREVALENCE_CELL).should(
        'contain.text',
        100
      );
    });
  }
);
