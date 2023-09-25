/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON } from '../../../../screens/date_picker';
import { fillAddFilterForm, fillAddFilterFormAsQueryDSL } from '../../../../tasks/search_bar';
import {
  setStartDate,
  updateDateRangeInLocalDatePickers,
  updateDates,
} from '../../../../tasks/date_picker';
import {
  DISCOVER_CONTAINER,
  DISCOVER_NO_RESULTS,
  DISCOVER_RESULT_HITS,
  DISCOVER_FILTER_BADGES,
  DISCOVER_QUERY_INPUT,
  GET_DISCOVER_DATA_GRID_CELL_HEADER,
  DISCOVER_DATA_VIEW_SWITCHER,
} from '../../../../screens/discover';
import {
  addDiscoverKqlQuery,
  switchDataViewTo,
  submitDiscoverSearchBar,
  openAddDiscoverFilterPopover,
  addFieldToTable,
  createAdHocDataView,
} from '../../../../tasks/discover';
import { createNewTimeline, gotToDiscoverTab } from '../../../../tasks/timeline';
import { login, visit } from '../../../../tasks/login';
import { ALERTS_URL } from '../../../../urls/navigation';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const NEW_START_DATE = 'Jan 18, 2023 @ 20:33:29.186';

describe(
  'Basic discover search and filter operations',
  {
    env: { ftrConfig: { enableExperimental: ['discoverInTimeline'] } },
    tags: ['@ess', '@serverless'],
  },
  () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      createNewTimeline();
      gotToDiscoverTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
    });
    it('should change data when dataView is changed', () => {
      switchDataViewTo('.kibana-event-log');
      cy.get(DISCOVER_RESULT_HITS).should('have.text', '1');
    });

    it('should show data according to kql query', () => {
      const kqlQuery = '_id:"invalid"';
      addDiscoverKqlQuery(kqlQuery);
      submitDiscoverSearchBar();
      cy.get(DISCOVER_NO_RESULTS).should('be.visible');
    });
    it('should show correct data according to filter applied', () => {
      openAddDiscoverFilterPopover();
      fillAddFilterForm({
        key: 'agent.type',
        value: 'winlogbeat',
      });
      cy.get(DISCOVER_FILTER_BADGES).should('have.length', 1);
      cy.get(DISCOVER_RESULT_HITS).should('have.text', '1');
    });
    it('should show correct data according to query DSL', () => {
      const query = {
        bool: {
          filter: [
            {
              term: {
                'agent.type': 'winlogbeat',
              },
            },
          ],
        },
      };
      openAddDiscoverFilterPopover();
      fillAddFilterFormAsQueryDSL(JSON.stringify(query));
      cy.get(DISCOVER_FILTER_BADGES).should('have.length', 1);
      cy.get(DISCOVER_RESULT_HITS).should('have.text', '1');
    });

    it('should be able to create ad-hoc dataview without saving', () => {
      const adHocDVName = 'adHocDataView';
      const indexPattern = 'audit';
      createAdHocDataView(adHocDVName, indexPattern);
      cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', adHocDVName);
    });

    it('should be able to add fields to the table', () => {
      addFieldToTable('host.name');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('host.name')).should('be.visible');
      addFieldToTable('user.name');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('user.name')).should('be.visible');
    });

    context('navigation', () => {
      it('should remove the filter when back is pressed after adding a filter', () => {
        openAddDiscoverFilterPopover();
        fillAddFilterForm({
          key: 'agent.type',
          value: 'winlogbeat',
        });
        cy.get(DISCOVER_FILTER_BADGES).should('have.length', 1);
        cy.go('back');
        cy.get(DISCOVER_FILTER_BADGES).should('not.exist');
      });
      it('should removed the query when back is pressed after adding a query', () => {
        const kqlQuery = '_id:"invalid"';
        addDiscoverKqlQuery(kqlQuery);
        submitDiscoverSearchBar();
        cy.get(DISCOVER_QUERY_INPUT).should('have.text', kqlQuery);
        cy.go('back');
        cy.get(DISCOVER_QUERY_INPUT).should('not.have.text', kqlQuery);
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
