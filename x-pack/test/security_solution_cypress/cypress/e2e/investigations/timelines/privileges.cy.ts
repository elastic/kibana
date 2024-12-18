/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';

import { ALERTS_URL, TIMELINES_URL } from '../../../urls/navigation';
import { ACTIVE_TIMELINE_BOTTOM_BAR, NOTES_TAB_BUTTON } from '../../../screens/timeline';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import { TIMELINES } from '../../../screens/security_header';
import {
  NAV_SEARCH_INPUT,
  NAV_SEARCH_NO_RESULTS,
  NAV_SEARCH_RESULTS,
} from '../../../screens/search_bar';
import { createTimeline, deleteTimelines } from '../../../tasks/api_calls/timelines';
import { openTimelineById } from '../../../tasks/timeline';
import { addNoteToTimeline } from '../../../tasks/api_calls/notes';
import { getTimeline } from '../../../objects/timeline';

describe('Privileges', { tags: ['@ess', '@skipInServerless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'endpoint' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'endpoint' });
  });

  describe('Timeline', () => {
    it('should not show timeline elements for users with insufficient privileges', () => {
      deleteAlertsAndRules();
      login(ROLES.timeline_none);
      createRule(getNewRule());
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
      // no timeline bottom bar
      cy.get(ACTIVE_TIMELINE_BOTTOM_BAR).should('not.exist');
      // no link to the timelines page
      cy.get(TIMELINES).should('not.exist');
      // no search result for timeline in the nav search
      cy.get(NAV_SEARCH_INPUT).type('Timelines');
      cy.get(NAV_SEARCH_NO_RESULTS).should('exist');
    });

    it('should show timeline elements for users with sufficient privileges', () => {
      deleteAlertsAndRules();
      login(ROLES.t3_analyst);
      createRule(getNewRule());
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
      cy.get(ACTIVE_TIMELINE_BOTTOM_BAR).should('exist');
      cy.get(TIMELINES).should('exist');
      cy.get(NAV_SEARCH_INPUT).type('Timelines');
      cy.get(NAV_SEARCH_RESULTS).contains('Timelines');
    });
  });

  describe('Notes', () => {
    let currTimelineId = '';
    before(() => {
      deleteTimelines();
      login();
      visit(TIMELINES_URL);
      createTimeline(getTimeline())
        .then((response) => response.body.savedObjectId)
        .then((timelineId) => {
          currTimelineId = timelineId;
          addNoteToTimeline(getTimeline().notes, timelineId).should((response) =>
            expect(response.status).to.equal(200)
          );
        });
    });

    it('should show notes tab to users with privileges', () => {
      login(ROLES.t3_analyst);
      visit(TIMELINES_URL);
      openTimelineById(currTimelineId);
      cy.get(NOTES_TAB_BUTTON).should('exist');
      cy.get(NOTES_TAB_BUTTON).contains('1');
    });

    it('should not show notes tab to users with insufficient privileges', () => {
      login(ROLES.notes_none);
      visit(TIMELINES_URL);
      openTimelineById(currTimelineId);
      cy.get(NOTES_TAB_BUTTON).should('be.disabled');
    });
  });
});
