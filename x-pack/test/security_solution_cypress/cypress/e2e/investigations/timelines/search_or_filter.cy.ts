/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_FILTER,
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_KQLMODE_FILTER,
  TIMELINE_KQLMODE_SEARCH,
  TIMELINE_SEARCH_OR_FILTER,
} from '../../../screens/timeline';
import { LOADING_INDICATOR } from '../../../screens/security_header';

import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  addNameToTimelineAndSave,
  changeTimelineQueryLanguage,
  executeTimelineKQL,
  executeTimelineSearch,
} from '../../../tasks/timeline';
import { waitForTimelinesPanelToBeLoaded } from '../../../tasks/timelines';

import { hostsUrl, TIMELINES_URL } from '../../../urls/navigation';

describe('Timeline search and filters', { tags: ['@ess', '@serverless'] }, () => {
  describe('timeline search or filter KQL bar', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
    });

    it('executes a KQL query', () => {
      const hostExistsQuery = 'host.name: *';
      openTimelineUsingToggle();
      executeTimelineKQL(hostExistsQuery);

      cy.get(SERVER_SIDE_EVENT_COUNT).should(($count) => expect(+$count.text()).to.be.gt(0));
    });

    it('executes a Lucene query', () => {
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
      visit(TIMELINES_URL);
      waitForTimelinesPanelToBeLoaded();
      openTimelineUsingToggle();
      cy.intercept('PATCH', '/api/timeline').as('update');
      cy.get(LOADING_INDICATOR).should('not.exist');
      cy.get(TIMELINE_SEARCH_OR_FILTER).click();
      cy.get(TIMELINE_SEARCH_OR_FILTER).should('exist');
    });

    it('should be able to update timeline kqlMode with filter', () => {
      cy.get(TIMELINE_KQLMODE_FILTER).click();
      addNameToTimelineAndSave('Test');
      cy.wait('@update').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.data.persistTimeline.timeline.kqlMode).should('eql', 'filter');
        cy.get(ADD_FILTER).should('exist');
      });
    });

    it('should be able to update timeline kqlMode with search', () => {
      cy.get(TIMELINE_KQLMODE_SEARCH).click();
      addNameToTimelineAndSave('Test');
      cy.wait('@update').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.data.persistTimeline.timeline.kqlMode).should('eql', 'search');
        cy.get(ADD_FILTER).should('not.exist');
      });
    });
  });
});
