/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_FILTER, SERVER_SIDE_EVENT_COUNT } from '../../../screens/timeline';
import { LOADING_INDICATOR } from '../../../screens/security_header';

import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  addNameToTimelineAndSave,
  changeTimelineQueryLanguage,
  executeTimelineKQL,
  executeTimelineSearch,
  selectKqlFilterMode,
  selectKqlSearchMode,
} from '../../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../../tasks/timelines';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';

import { hostsUrl, TIMELINES_URL } from '../../../urls/navigation';

describe('Timeline search and filters', { tags: ['@ess', '@serverless'] }, () => {
  describe('timeline search or filter KQL bar', () => {
    beforeEach(() => {
      login();
      deleteTimelines();
      visitWithTimeRange(hostsUrl('allHosts'));
    });

    it('should execute a KQL query', () => {
      const hostExistsQuery = 'host.name: *';
      openTimelineUsingToggle();
      executeTimelineKQL(hostExistsQuery);

      cy.get(SERVER_SIDE_EVENT_COUNT).should(($count) => expect(+$count.text()).to.be.gt(0));
    });

    it('should execute a Lucene query', () => {
      const messageProcessQuery = 'message:Process\\ zsh*';
      openTimelineUsingToggle();
      changeTimelineQueryLanguage('lucene');
      executeTimelineSearch(messageProcessQuery);

      cy.get(SERVER_SIDE_EVENT_COUNT).should(($count) => expect(+$count.text()).to.be.gt(0));
    });
  });

  describe('Update kqlMode for timeline', () => {
    beforeEach(() => {
      login();
      deleteTimelines();
      visit(TIMELINES_URL);
      waitForTimelinesPanelToBeLoaded();
      openTimelineUsingToggle();
      cy.intercept('PATCH', '/api/timeline').as('update');
      cy.get(LOADING_INDICATOR).should('not.exist');
    });

    it('should be able to update timeline kqlMode with filter', () => {
      selectKqlFilterMode();
      addNameToTimelineAndSave('Test');
      cy.wait('@update').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.data.persistTimeline.timeline.kqlMode).should('eql', 'filter');
        cy.get(ADD_FILTER).should('exist');
      });
    });

    it('should be able to update timeline kqlMode with search', () => {
      selectKqlSearchMode();
      addNameToTimelineAndSave('Test');
      cy.wait('@update').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.data.persistTimeline.timeline.kqlMode).should('eql', 'search');
        cy.get(ADD_FILTER).should('not.exist');
      });
    });
  });
});
