/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteTimelines } from '../../../../tasks/api_calls/common';
import { GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON } from '../../../../screens/date_picker';
import {
  setStartDate,
  showStartEndDate,
  updateDateRangeInLocalDatePickers,
  updateDates,
} from '../../../../tasks/date_picker';
import {
  DISCOVER_CONTAINER,
  DISCOVER_RESULT_HITS,
  GET_DISCOVER_DATA_GRID_CELL_HEADER,
  DISCOVER_ESQL_INPUT_TEXT_CONTAINER,
} from '../../../../screens/discover';
import {
  addDiscoverEsqlQuery,
  submitDiscoverSearchBar,
  addFieldToTable,
  convertEditorNonBreakingSpaceToSpace,
} from '../../../../tasks/discover';
import { createNewTimeline, goToEsqlTab, openActiveTimeline } from '../../../../tasks/timeline';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';

const DEFAULT_DATE = '~ 15 minutes ago';
const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const NEW_START_DATE = 'Jan 18, 2023 @ 20:33:29.186';
const esqlQuery = 'from auditbeat-* | where ecs.version == "8.0.0"';

// FLAKY: https://github.com/elastic/kibana/issues/175180
describe.skip(
  'Basic esql search and filter operations',
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      deleteTimelines();
      visitWithTimeRange(ALERTS_URL);
      openActiveTimeline();
      cy.window().then((win) => {
        win.onbeforeunload = null;
      });
      createNewTimeline();
      goToEsqlTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
    });

    it('should show data according to the esql query', () => {
      addDiscoverEsqlQuery(`${esqlQuery} | limit 1`);
      submitDiscoverSearchBar();
      cy.get(DISCOVER_RESULT_HITS).should('have.text', 1);
    });

    it('should be able to add fields to the table', () => {
      addDiscoverEsqlQuery(`${esqlQuery} | limit 1`);
      submitDiscoverSearchBar();
      addFieldToTable('host.name');
      addFieldToTable('user.name');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('host.name')).should('be.visible');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('user.name')).should('be.visible');
    });

    it('should remove the query when the back button is pressed after adding a query', () => {
      addDiscoverEsqlQuery(esqlQuery);
      submitDiscoverSearchBar();
      cy.get(DISCOVER_ESQL_INPUT_TEXT_CONTAINER).then((subj) => {
        const currentQuery = subj.text();
        const sanitizedQuery = convertEditorNonBreakingSpaceToSpace(currentQuery);
        expect(sanitizedQuery).to.eq(esqlQuery);
      });
      cy.go('back');
      cy.get(DISCOVER_ESQL_INPUT_TEXT_CONTAINER).then((subj) => {
        const currentQuery = subj.text();
        const sanitizedQuery = convertEditorNonBreakingSpaceToSpace(currentQuery);
        expect(sanitizedQuery).to.not.eq(esqlQuery);
      });
    });

    it(`should change the timerange to ${DEFAULT_DATE} when back is pressed after modifying timerange to ${NEW_START_DATE} without saving`, () => {
      setStartDate(NEW_START_DATE, DISCOVER_CONTAINER);
      updateDates(DISCOVER_CONTAINER);

      cy.go('back');
      showStartEndDate(DISCOVER_CONTAINER);
      cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(DISCOVER_CONTAINER)).should(
        'have.text',
        DEFAULT_DATE
      );
    });
  }
);
