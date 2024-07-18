/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINE_EVENT,
  TIMELINE_EVENTS_COUNT_NEXT_PAGE,
  TIMELINE_EVENTS_COUNT_PER_PAGE,
  TIMELINE_EVENTS_COUNT_PER_PAGE_BTN,
  TIMELINE_EVENTS_COUNT_PER_PAGE_OPTION,
  TIMELINE_EVENTS_COUNT_PREV_PAGE,
  TIMELINE_FLYOUT,
} from '../../../screens/timeline';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { populateTimeline } from '../../../tasks/timeline';

import { hostsUrl } from '../../../urls/navigation';

// Flaky on serverless
const defaultPageSize = 25;

describe(
  'Timeline Pagination',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'unifiedComponentsInTimelineDisabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'timeline' });
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openTimelineUsingToggle();
      populateTimeline();
    });

    afterEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'timeline' });
    });

    it(`should paginate records correctly`, () => {
      // should have ${defaultPageSize} events in the page by default
      cy.get(TIMELINE_EVENT).should('have.length', defaultPageSize);

      // should be able to go to next / previous page
      cy.get(`${TIMELINE_FLYOUT} ${TIMELINE_EVENTS_COUNT_NEXT_PAGE}`).first().click();
      cy.get(`${TIMELINE_FLYOUT} ${TIMELINE_EVENTS_COUNT_PREV_PAGE}`).first().click();

      // should select ${defaultPageSize} items per page by default
      cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE).should('contain.text', defaultPageSize);

      // should be able to change items count per page with the dropdown
      const itemsPerPage = 100;
      cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE_BTN).first().click();
      cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE_OPTION(itemsPerPage)).click();
      cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE).should('not.have.text', '0');
      cy.get(TIMELINE_EVENTS_COUNT_PER_PAGE)
        .invoke('text')
        .then((events) => {
          cy.wrap(parseInt(events, 10)).should('be.gt', defaultPageSize);
        });
    });
  }
);
