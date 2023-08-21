/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import { openTableTab } from '../../../../tasks/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertExpandableFlyout } from '../../../../tasks/expandable_flyout/common';
import { closeTimeline, openActiveTimeline } from '../../../../tasks/timeline';
import { PROVIDER_BADGE } from '../../../../screens/timeline';
import { removeKqlFilter } from '../../../../tasks/search_bar';
import { FILTER_BADGE } from '../../../../screens/alerts';
import {
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW,
} from '../../../../screens/expandable_flyout/alert_details_right_panel_table_tab';
import {
  addToTimelineTableTabTable,
  clearFilterTableTabTable,
  copyToClipboardTableTabTable,
  filterInTableTabTable,
  filterOutTableTabTable,
  filterTableTabTable,
} from '../../../../tasks/expandable_flyout/alert_details_right_panel_table_tab';
import { cleanKibana } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe(
  'Alert details expandable flyout right panel table tab',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    beforeEach(() => {
      cleanKibana();
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
      openTableTab();
    });

    it('should display and filter the table', () => {
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW).should('be.visible');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW).should('be.visible');
      filterTableTabTable('timestamp');
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW).should('be.visible');
      clearFilterTableTabTable();
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

      copyToClipboardTableTabTable();
      cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD).should('be.visible');
    });
  }
);
