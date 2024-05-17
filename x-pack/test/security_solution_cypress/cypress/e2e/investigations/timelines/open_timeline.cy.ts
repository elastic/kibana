/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';
import { OPEN_TIMELINE_MODAL, TIMELINE_TITLE } from '../../../screens/timeline';
import {
  TIMELINES_DESCRIPTION,
  TIMELINES_FAVORITE,
  TIMELINES_NOTES_COUNT,
  TIMELINES_PINNED_EVENT_COUNT,
} from '../../../screens/timelines';
import { addNoteToTimeline } from '../../../tasks/api_calls/notes';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  markAsFavorite,
  openTimelineById,
  openTimelineFromSettings,
  pinFirstEvent,
  refreshTimelinesUntilTimeLinePresent,
} from '../../../tasks/timeline';
import { TIMELINES_URL } from '../../../urls/navigation';

const mockTimeline = getTimeline();

describe('Open timeline modal', { tags: ['@serverless', '@ess'] }, () => {
  beforeEach(function () {
    deleteTimelines();
    login();
    visit(TIMELINES_URL);
    createTimeline()
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) => {
        refreshTimelinesUntilTimeLinePresent(timelineId)
          // This cy.wait is here because we cannot do a pipe on a timeline as that will introduce multiple URL
          // request responses and indeterminism since on clicks to activates URL's.
          .then(() => cy.wrap(timelineId).as('timelineId'))
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          .then(() => cy.wait(1000))
          .then(() =>
            addNoteToTimeline(mockTimeline.notes, timelineId).should((response) =>
              expect(response.status).to.equal(200)
            )
          )
          .then(() => openTimelineById(timelineId))
          .then(() => pinFirstEvent())
          .then(() => markAsFavorite());
      });
  });

  it('should display timeline info in the open timeline modal', () => {
    openTimelineFromSettings();
    cy.get(OPEN_TIMELINE_MODAL).should('be.visible');
    cy.contains(mockTimeline.title).should('exist');
    cy.get(TIMELINES_DESCRIPTION).last().should('have.text', mockTimeline.description);
    cy.get(TIMELINES_PINNED_EVENT_COUNT).last().should('have.text', '1');
    cy.get(TIMELINES_NOTES_COUNT).last().should('have.text', '1');
    cy.get(TIMELINES_FAVORITE).last().should('exist');
    cy.get(TIMELINE_TITLE).should('have.text', mockTimeline.title);
  });
});
