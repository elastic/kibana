/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON } from '../../../../screens/date_picker';
import {
  setStartDate,
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
  convertNBSPToSP,
} from '../../../../tasks/discover';
import { createNewTimeline, goToEsqlTab } from '../../../../tasks/timeline';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const NEW_START_DATE = 'Jan 18, 2023 @ 20:33:29.186';
const esqlQuery = 'from auditbeat-* | where ecs.version == "8.0.0"';

describe(
  'Basic esql search and filter operations',
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
    });

    it('should show data according to esql query', () => {
      addDiscoverEsqlQuery(`${esqlQuery} | limit 1`);
      submitDiscoverSearchBar();
      cy.get(DISCOVER_RESULT_HITS).should('have.text', 1);
    });
    it('should be able to add fields to the table', () => {
      addFieldToTable('host.name');
      addFieldToTable('user.name');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('host.name')).should('be.visible');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('user.name')).should('be.visible');
    });

    context('navigation', () => {
      it.skip('should remove the query when back is pressed after adding a query', () => {
        addDiscoverEsqlQuery(esqlQuery);
        submitDiscoverSearchBar();
        cy.get(DISCOVER_ESQL_INPUT_TEXT_CONTAINER).then((subj) => {
          const currentQuery = subj.text();
          const sanitizedQuery = convertNBSPToSP(currentQuery);
          expect(sanitizedQuery).to.eq(esqlQuery);
        });
        cy.go('back');
        cy.get(DISCOVER_ESQL_INPUT_TEXT_CONTAINER).then((subj) => {
          const currentQuery = subj.text();
          const sanitizedQuery = convertNBSPToSP(currentQuery);
          expect(sanitizedQuery).to.not.eq(esqlQuery);
        });
      });

      it(`should changed the timerange to ${INITIAL_START_DATE} when back is pressed after modifying timerange from ${INITIAL_START_DATE} to ${NEW_START_DATE} `, () => {
        setStartDate(NEW_START_DATE, DISCOVER_CONTAINER);
        updateDates(DISCOVER_CONTAINER);

        cy.go('back');

        cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(DISCOVER_CONTAINER)).should(
          'have.text',
          INITIAL_START_DATE
        );
      });
    });
  }
);
