/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { grantClipboardReadPerm } from '../../../../tasks/common/clipboard';
import {
  DISCOVER_CELL_ACTIONS,
  DISCOVER_CONTAINER,
  GET_DISCOVER_DATA_GRID_CELL,
} from '../../../../screens/discover';
import { waitForDiscoverGridToLoad } from '../../../../tasks/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { createNewTimeline, goToEsqlTab } from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const TIMESTAMP_COLUMN_NAME = '@timestamp';

// FLAKY: https://github.com/elastic/kibana/issues/165650
describe.skip(
  `ESQL Datagrid Cell Actions`,
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      createNewTimeline();
      goToEsqlTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
      waitForDiscoverGridToLoad();
    });
    // @TODO: copy is incredibly flaky although it is written same strategy as above tests
    // Need to see what is the reaosn for that. Trusting that above tests prove that `Copy`
    // will also work correctly.
    it.skip('Copy', () => {
      grantClipboardReadPerm();
      cy.get(GET_DISCOVER_DATA_GRID_CELL(TIMESTAMP_COLUMN_NAME, 0)).then((sub) => {
        const selectedTimestamp = sub.text();
        cy.get(GET_DISCOVER_DATA_GRID_CELL(TIMESTAMP_COLUMN_NAME, 0)).realHover();
        cy.get(DISCOVER_CELL_ACTIONS.EXPAND_CELL_ACTIONS).trigger('click');
        cy.get(DISCOVER_CELL_ACTIONS.EXPANSION_POPOVER).should('be.visible');
        cy.get(DISCOVER_CELL_ACTIONS.COPY).should('be.visible').trigger('click');
        cy.window()
          .its('navigator.clipboard')
          .then((clipboard) => clipboard.readText())
          .should('eq', selectedTimestamp);
      });
    });
  }
);
