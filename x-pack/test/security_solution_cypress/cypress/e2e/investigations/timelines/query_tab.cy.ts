/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';

import {
  UNLOCKED_ICON,
  PIN_EVENT,
  TIMELINE_FILTER,
  TIMELINE_QUERY,
  NOTE_CARD_CONTENT,
} from '../../../screens/timeline';
import { createTimeline } from '../../../tasks/api_calls/timelines';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  addFilter,
  openTimelineById,
  pinFirstEvent,
  refreshTimelinesUntilTimeLinePresent,
} from '../../../tasks/timeline';

import { TIMELINES_URL } from '../../../urls/navigation';

describe.skip('Timeline query tab', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    login();
    visit(TIMELINES_URL);
    createTimeline(getTimeline())
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) => {
        refreshTimelinesUntilTimeLinePresent(timelineId)
          // This cy.wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
          // request responses and indeterminism since on clicks to activates URL's.
          .then(() => cy.wrap(timelineId).as('timelineId'))
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          .then(() => cy.wait(1000))
          // TO-DO: Issue 163398
          // .then(() =>
          //   addNoteToTimeline(getTimeline().notes, timelineId).should((response) =>
          //     expect(response.status).to.equal(200)
          //   )
          // )
          .then(() => openTimelineById(timelineId))
          .then(() => pinFirstEvent())
          // TO-DO: Issue 163398
          // .then(() => persistNoteToFirstEvent('event note'))
          .then(() => addFilter(getTimeline().filter));
      });
  });

  describe('Query tab', () => {
    beforeEach(function () {
      login();
      visit(TIMELINES_URL);
      openTimelineById(this.timelineId).then(() => addFilter(getTimeline().filter));
    });

    it('should contain the right query', () => {
      cy.get(TIMELINE_QUERY).should('have.text', `${getTimeline().query}`);
    });

    // TO-DO: Issue 163398
    it.skip('should be able to add event note', () => {
      cy.get(NOTE_CARD_CONTENT).should('contain', 'event note');
    });

    it('should display timeline filter', () => {
      cy.get(TIMELINE_FILTER(getTimeline().filter)).should('exist');
    });

    it('should display pinned events', () => {
      cy.get(PIN_EVENT)
        .should('have.attr', 'aria-label')
        .and('match', /Unpin the event in row 2/);
    });

    it('should have an unlock icon', { tags: '@brokenInServerless' }, () => {
      cy.get(UNLOCKED_ICON).should('be.visible');
    });
  });
});
