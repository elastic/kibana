/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fillAddFilterForm } from '../../../../tasks/search_bar';
import {
  addDiscoverKqlQuery,
  addFieldToTable,
  openAddDiscoverFilterPopover,
  switchDataViewTo,
  switchDataViewToSQL,
} from '../../../../tasks/discover';
import {
  GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON,
  GET_LOCAL_SHOW_DATES_BUTTON,
} from '../../../../screens/date_picker';
import { ALERTS_URL } from '../../../../urls/navigation';
import {
  DISCOVER_CONTAINER,
  DISCOVER_DATA_VIEW_SWITCHER,
  DISCOVER_FILTER_BADGES,
  DISCOVER_QUERY_INPUT,
  GET_DISCOVER_DATA_GRID_CELL_HEADER,
} from '../../../../screens/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login, visit } from '../../../../tasks/login';
import {
  addDescriptionToTimeline,
  addNameToTimeline,
  createNewTimeline,
  gotToDiscoverTab,
  openTimelineFromOpenTimelineModal,
  openTimelineFromSettings,
  waitForTimelineChanges,
} from '../../../../tasks/timeline';
import { LOADING_INDICATOR } from '../../../../screens/security_header';
import { enableDiscoverSQL } from '../../../../tasks/api_calls/kibana_advanced_settings';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const SAVED_SEARCH_UPDATE_REQ = 'SAVED_SEARCH_UPDATE_REQ';
const SAVED_SEARCH_CREATE_REQ = 'SAVED_SEARCH_CREATE_REQ';
const SAVED_SEARCH_GET_REQ = 'SAVED_SEARCH_GET_REQ';
const TIMELINE_REQ_WITH_SAVED_SEARCH = 'TIMELINE_REQ_WITH_SAVED_SEARCH';

describe(
  'Discover Timeline State Integration',
  {
    env: { ftrConfig: { enableExperimental: ['discoverInTimeline'] } },
    tags: ['@ess', '@serverless'],
  },

  () => {
    before(() => {
      cy.intercept('PATCH', '/api/timeline', (req) => {
        if (req.body.hasOwnProperty('timeline') && req.body.timeline.savedSearchId !== null) {
          req.alias = TIMELINE_REQ_WITH_SAVED_SEARCH;
        }
      });
      cy.intercept('POST', '/api/content_management/rpc/get', (req) => {
        if (req.body.hasOwnProperty('contentTypeId') && req.body.contentTypeId === 'search') {
          req.alias = SAVED_SEARCH_GET_REQ;
        }
      });
      cy.intercept('POST', '/api/content_management/rpc/create', (req) => {
        if (req.body.hasOwnProperty('contentTypeId') && req.body.contentTypeId === 'search') {
          req.alias = SAVED_SEARCH_CREATE_REQ;
        }
      });

      cy.intercept('POST', '/api/content_management/rpc/update', (req) => {
        if (req.body.hasOwnProperty('contentTypeId') && req.body.contentTypeId === 'search') {
          req.alias = SAVED_SEARCH_UPDATE_REQ;
        }
      });
    });
    beforeEach(() => {
      login();
      enableDiscoverSQL();
      visit(ALERTS_URL);
      createNewTimeline();
      gotToDiscoverTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
    });
    context('save/restore', () => {
      it('should be able create an empty timeline with default discover state', () => {
        addNameToTimeline('Timerange timeline');
        createNewTimeline();
        gotToDiscoverTab();
        cy.get(GET_LOCAL_SHOW_DATES_BUTTON(DISCOVER_CONTAINER)).should(
          'contain.text',
          `Last 15 minutes`
        );
      });
      it('should save/restore discover dataview/timerange/filter/query/columns when saving/resoring timeline', () => {
        const dataviewName = '.kibana-event-log';
        const timelineSuffix = Date.now();
        const timelineName = `DataView timeline-${timelineSuffix}`;
        const kqlQuery = '_id:*';
        const column1 = 'event.category';
        const column2 = 'ecs.version';
        switchDataViewTo(dataviewName);
        addDiscoverKqlQuery(kqlQuery);
        openAddDiscoverFilterPopover();
        fillAddFilterForm({
          key: 'ecs.version',
          value: '1.8.0',
        });
        addFieldToTable(column1);
        addFieldToTable(column2);

        // create a custom timeline
        addNameToTimeline(timelineName);
        waitForTimelineChanges();
        cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
        // create an empty timeline
        createNewTimeline();
        // switch to old timeline
        openTimelineFromSettings();
        openTimelineFromOpenTimelineModal(`${timelineSuffix}`);
        cy.get(LOADING_INDICATOR).should('not.exist');
        gotToDiscoverTab();
        cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', dataviewName);
        cy.get(DISCOVER_QUERY_INPUT).should('have.text', kqlQuery);
        cy.get(DISCOVER_FILTER_BADGES).should('have.length', 1);
        cy.get(DISCOVER_FILTER_BADGES).should('contain.text', 'ecs.version: 1.8.0');
        cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER(column1)).should('be.visible');
        cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER(column2)).should('be.visible');
        cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(DISCOVER_CONTAINER)).should(
          'have.text',
          INITIAL_START_DATE
        );
      });
      // TODO: change it to ESQL when feature branch is merged.
      it('should save/restore discover sql when saving timeline', () => {
        const timelineSuffix = Date.now();
        const timelineName = `SQL timeline-${timelineSuffix}`;
        switchDataViewToSQL();
        addNameToTimeline(timelineName);
        waitForTimelineChanges();
        cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
        // create an empty timeline
        createNewTimeline();
        // switch to old timeline
        openTimelineFromSettings();
        openTimelineFromOpenTimelineModal(`${timelineSuffix}`);
        cy.get(LOADING_INDICATOR).should('not.exist');
        gotToDiscoverTab();

        cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('have.attr', 'title', 'SQL');
      });
    });
    context('saved search tags', () => {
      it('should save discover saved search with `Security Solution` tag', () => {});
    });
    context('saved search', () => {
      it('should rename the saved search on timeline rename', () => {
        const timelineSuffix = Date.now();
        const timelineName = `Rename timeline-${timelineSuffix}`;
        const kqlQuery = '_id: *';
        addDiscoverKqlQuery(kqlQuery);

        addNameToTimeline(timelineName);
        waitForTimelineChanges();
        cy.wait(`@${SAVED_SEARCH_UPDATE_REQ}`);
        cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
        // create an empty timeline
        createNewTimeline();
        // switch to old timeline
        openTimelineFromSettings();
        openTimelineFromOpenTimelineModal(`${timelineSuffix}`);
        const timelineDesc = 'Timeline Description with Saved Seach';
        addDescriptionToTimeline(timelineDesc);
        cy.wait(`@${SAVED_SEARCH_UPDATE_REQ}`);
        cy.wait(`@${SAVED_SEARCH_UPDATE_REQ}`).then((interception) => {
          expect(interception.request.body.data.description).eq(timelineDesc);
        });
      });
    });

    context('Advanced Settings', () => {
      it('rows per page in saved search should be according to the user selected number of pages', () => {});
      it('rows per page in new search should be according to the value selected in advanced settings', () => {});
    });
  }
);
