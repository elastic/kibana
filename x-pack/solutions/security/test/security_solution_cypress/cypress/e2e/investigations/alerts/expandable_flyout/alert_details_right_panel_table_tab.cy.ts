/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openTableTab } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandAlertAtIndexExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { closeTimeline, openActiveTimeline } from '../../../../tasks/timeline';
import { PROVIDER_BADGE } from '../../../../screens/timeline';
import { removeKqlFilter } from '../../../../tasks/search_bar';
import { COLUMN_HEADER, FILTER_BADGE, TIMESTAMP_COLUMN } from '../../../../screens/alerts';
import {
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_HOST_OS_BUILD_ROW,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW,
} from '../../../../screens/expandable_flyout/alert_details_right_panel_table_tab';
import {
  addToTimelineTableTabTable,
  filterInTableTabTable,
  filterOutTableTabTable,
  filterTableTabTable,
  toggleColumnTableTabTable,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel_table_tab';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout right panel table tab',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandAlertAtIndexExpandableFlyout();
      openTableTab();
    });

    it('should display and filter the table', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW)
        .should('be.visible')
        .and('contain.text', '@timestamp');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW)
        .should('be.visible')
        .and('contain.text', '_id');

      // this entry is the last one of the first page of the table and should not be visible
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_HOST_OS_BUILD_ROW)
        .should('not.be.visible')
        .and('contain.text', 'host.os.build');

      filterTableTabTable('timestamp');

      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW)
        .should('be.visible')
        .and('contain.text', '@timestamp');
    });

    it('should test cell actions', () => {
      cy.log('cell actions filter in');

      filterInTableTabTable();
      cy.get(FILTER_BADGE).first().should('contain.text', '@timestamp:');
      removeKqlFilter();

      cy.log('cell actions filter out');

      filterOutTableTabTable();
      cy.get(FILTER_BADGE).first().should('contain.text', 'NOT @timestamp:');
      removeKqlFilter();

      cy.log('cell actions add to timeline');

      addToTimelineTableTabTable();
      openActiveTimeline();
      cy.get(PROVIDER_BADGE).first().should('contain.text', '@timestamp');
      closeTimeline();

      cy.log('cell actions copy to clipboard');

      cy.get('body').realHover();
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL).first().realHover();
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD).should('be.visible');

      cy.log('cell actions toggle column');

      const timestampColumn = '@timestamp';
      cy.get(TIMESTAMP_COLUMN).should('be.visible');
      cy.get(COLUMN_HEADER).first().should('contain.text', timestampColumn);
      toggleColumnTableTabTable();
      cy.get(COLUMN_HEADER).first().should('not.contain.text', timestampColumn);
      toggleColumnTableTabTable();
      cy.get(TIMESTAMP_COLUMN).first().should('be.visible');
      cy.get(COLUMN_HEADER).should('contain.text', timestampColumn);
    });
  }
);
