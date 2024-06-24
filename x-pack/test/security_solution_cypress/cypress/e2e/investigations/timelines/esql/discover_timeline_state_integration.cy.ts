/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitWithTimeRange } from '../../../../tasks/navigation';
import { BASIC_TABLE_LOADING } from '../../../../screens/common';
import {
  clickSavedObjectTagsFilter,
  goToSavedObjectSettings,
} from '../../../../tasks/stack_management';
import {
  navigateFromKibanaCollapsibleTo,
  openKibanaNavigation,
} from '../../../../tasks/kibana_navigation';
import {
  addDiscoverEsqlQuery,
  addFieldToTable,
  verifyDiscoverEsqlQuery,
} from '../../../../tasks/discover';
import {
  GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON,
  GET_LOCAL_SHOW_DATES_BUTTON,
} from '../../../../screens/date_picker';
import { ALERTS_URL } from '../../../../urls/navigation';
import {
  DISCOVER_CONTAINER,
  DISCOVER_DATA_VIEW_SWITCHER,
  GET_DISCOVER_DATA_GRID_CELL_HEADER,
} from '../../../../screens/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login } from '../../../../tasks/login';
import {
  addNameToTimelineAndSave,
  createNewTimeline,
  createTimelineFromBottomBar,
  goToEsqlTab,
  openTimelineById,
  openTimelineFromSettings,
} from '../../../../tasks/timeline';
import { LOADING_INDICATOR } from '../../../../screens/security_header';
import { STACK_MANAGEMENT_PAGE } from '../../../../screens/kibana_navigation';
import {
  GET_SAVED_OBJECTS_TAGS_OPTION,
  SAVED_OBJECTS_ROW_TITLES,
} from '../../../../screens/common/stack_management';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const TIMELINE_REQ_WITH_SAVED_SEARCH = 'TIMELINE_REQ_WITH_SAVED_SEARCH';
const TIMELINE_PATCH_REQ = 'TIMELINE_PATCH_REQ';

const TIMELINE_RESPONSE_SAVED_OBJECT_ID_PATH =
  'response.body.data.persistTimeline.timeline.savedObjectId';
const esqlQuery = 'from auditbeat-* | where ecs.version == "8.0.0"';

const handleIntercepts = () => {
  cy.intercept('PATCH', '/api/timeline', (req) => {
    if (Object.hasOwn(req.body, 'timeline') && req.body.timeline.savedSearchId === null) {
      req.alias = TIMELINE_PATCH_REQ;
    }
  });
  cy.intercept('PATCH', '/api/timeline', (req) => {
    if (Object.hasOwn(req.body, 'timeline') && req.body.timeline.savedSearchId !== null) {
      req.alias = TIMELINE_REQ_WITH_SAVED_SEARCH;
    }
  });
};

// Failing: See https://github.com/elastic/kibana/issues/180755
describe.skip(
  'Discover Timeline State Integration',
  {
    tags: ['@ess', '@skipInServerless'],
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      createTimelineFromBottomBar();
      goToEsqlTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
      handleIntercepts();
    });

    describe('ESQL tab state', () => {
      it('should be able create an empty timeline with default esql tab state', () => {
        addNameToTimelineAndSave('Timerange timeline');
        createNewTimeline();
        goToEsqlTab();
        cy.get(GET_LOCAL_SHOW_DATES_BUTTON(DISCOVER_CONTAINER)).should(
          'contain.text',
          `Last 15 minutes`
        );
      });
      it('should save/restore esql tab dataview/timerange/filter/query/columns when saving/resoring timeline', () => {
        const timelineSuffix = Date.now();
        const timelineName = `DataView timeline-${timelineSuffix}`;
        const column1 = 'event.category';
        const column2 = 'ecs.version';
        addDiscoverEsqlQuery(esqlQuery);
        addFieldToTable(column1);
        addFieldToTable(column2);

        // create a custom timeline
        addNameToTimelineAndSave(timelineName);
        cy.wait(`@${TIMELINE_PATCH_REQ}`)
          .its(TIMELINE_RESPONSE_SAVED_OBJECT_ID_PATH)
          .then((timelineId) => {
            cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
            // create an empty timeline
            createNewTimeline();
            // switch to old timeline
            openTimelineFromSettings();
            openTimelineById(timelineId);
            goToEsqlTab();
            cy.get(LOADING_INDICATOR).should('not.exist');
            verifyDiscoverEsqlQuery(esqlQuery);
            cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER(column1)).should('exist');
            cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER(column2)).should('exist');
            cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(DISCOVER_CONTAINER)).should(
              'have.text',
              INITIAL_START_DATE
            );
          });
      });
      it('should save/restore esql tab dataview/timerange/filter/query/columns when timeline is opened via url', () => {
        const timelineSuffix = Date.now();
        const timelineName = `DataView timeline-${timelineSuffix}`;
        const column1 = 'event.category';
        const column2 = 'ecs.version';
        addDiscoverEsqlQuery(esqlQuery);
        addFieldToTable(column1);
        addFieldToTable(column2);

        // create a custom timeline
        addNameToTimelineAndSave(timelineName);
        cy.wait(`@${TIMELINE_PATCH_REQ}`)
          .its(TIMELINE_RESPONSE_SAVED_OBJECT_ID_PATH)
          .then((timelineId) => {
            cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
            // reload the page with the exact url
            cy.reload();
            verifyDiscoverEsqlQuery(esqlQuery);
            cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER(column1)).should('exist');
            cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER(column2)).should('exist');
            cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(DISCOVER_CONTAINER)).should(
              'have.text',
              INITIAL_START_DATE
            );
          });
      });
      it('should save/restore esql tab ES|QL when saving timeline', () => {
        const timelineSuffix = Date.now();
        const timelineName = `ES|QL timeline-${timelineSuffix}`;
        addNameToTimelineAndSave(timelineName);
        cy.wait(`@${TIMELINE_PATCH_REQ}`)
          .its(TIMELINE_RESPONSE_SAVED_OBJECT_ID_PATH)
          .then((timelineId) => {
            cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
            // create an empty timeline
            createNewTimeline();
            // switch to old timeline
            openTimelineFromSettings();
            openTimelineById(timelineId).then(() => {
              cy.get(LOADING_INDICATOR).should('not.exist');
              goToEsqlTab();
              cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('not.exist');
            });
          });
      });
    });

    describe('Discover saved search state for ESQL tab', () => {
      it('should save esql tab saved search with `Security Solution` tag', () => {
        const timelineSuffix = Date.now();
        const timelineName = `SavedObject timeline-${timelineSuffix}`;
        addDiscoverEsqlQuery(esqlQuery);
        addNameToTimelineAndSave(timelineName);
        cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
        cy.get(LOADING_INDICATOR).should('not.exist');
        openKibanaNavigation();
        navigateFromKibanaCollapsibleTo(STACK_MANAGEMENT_PAGE);
        cy.get(LOADING_INDICATOR).should('not.exist');
        goToSavedObjectSettings();
        cy.get(LOADING_INDICATOR).should('not.exist');
        clickSavedObjectTagsFilter();
        cy.get(GET_SAVED_OBJECTS_TAGS_OPTION('Security_Solution')).trigger('click');
        cy.get(BASIC_TABLE_LOADING).should('not.exist');
        cy.get(SAVED_OBJECTS_ROW_TITLES).should(
          'contain.text',
          `Saved search for timeline - ${timelineName}`
        );
      });

      it('should rename the saved search on timeline rename', () => {
        const initialTimelineSuffix = Date.now();
        const initialTimelineName = `Timeline-${initialTimelineSuffix}`;
        addDiscoverEsqlQuery(esqlQuery);
        addNameToTimelineAndSave(initialTimelineName);
        cy.get(LOADING_INDICATOR).should('not.exist');
        const timelineSuffix = Date.now();
        const renamedTimelineName = `Rename timeline-${timelineSuffix}`;
        addNameToTimelineAndSave(renamedTimelineName);
        cy.wait(`@${TIMELINE_REQ_WITH_SAVED_SEARCH}`);
        openKibanaNavigation();
        navigateFromKibanaCollapsibleTo(STACK_MANAGEMENT_PAGE);
        cy.get(LOADING_INDICATOR).should('not.exist');
        goToSavedObjectSettings();
        cy.get(LOADING_INDICATOR).should('not.exist');
        clickSavedObjectTagsFilter();
        cy.get(GET_SAVED_OBJECTS_TAGS_OPTION('Security_Solution')).trigger('click');
        cy.get(BASIC_TABLE_LOADING).should('not.exist');
        cy.get(SAVED_OBJECTS_ROW_TITLES).should(
          'contain.text',
          `Saved search for timeline - ${renamedTimelineName}`
        );
      });
    });

    // Issue for enabling below tests: https://github.com/elastic/kibana/issues/165913
    context.skip('Advanced Settings', () => {
      it('rows per page in saved search should be according to the user selected number of pages', () => {});
      it('rows per page in new search should be according to the value selected in advanced settings', () => {});
    });
  }
);
