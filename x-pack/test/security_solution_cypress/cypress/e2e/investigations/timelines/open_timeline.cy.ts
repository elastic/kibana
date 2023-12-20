/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';

import { TIMELINE_TITLE, OPEN_TIMELINE_MODAL } from '../../../screens/timeline';
import {
  TIMELINES_DESCRIPTION,
  TIMELINES_PINNED_EVENT_COUNT,
  TIMELINES_NOTES_COUNT,
  TIMELINES_FAVORITE,
} from '../../../screens/timelines';
import { deleteTimelines } from '../../../tasks/api_calls/common';
import { addNoteToTimeline } from '../../../tasks/api_calls/notes';

import { createTimeline } from '../../../tasks/api_calls/timelines';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  markAsFavorite,
  openTimelineById,
  openTimelineByIdFromOpenTimelineModal,
  openTimelineFromSettings,
  pinFirstEvent,
  refreshTimelinesUntilTimeLinePresent,
} from '../../../tasks/timeline';
import { TIMELINES_URL } from '../../../urls/navigation';

const defaultTimeline = getTimeline();

describe('Open timeline', { tags: ['@serverless', '@ess'] }, () => {
  beforeEach(function () {
    login();
    visit(TIMELINES_URL);
    deleteTimelines();
    createTimeline(defaultTimeline)
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) => {
        cy.wrap(timelineId).as('timelineId');
        refreshTimelinesUntilTimeLinePresent(timelineId);
        addNoteToTimeline(defaultTimeline.notes, timelineId);
        openTimelineById(timelineId);
        pinFirstEvent();
        markAsFavorite();
      });
  });

  it('should show timeline metadata', function () {
    openTimelineFromSettings();
    cy.get(OPEN_TIMELINE_MODAL).should('be.visible');
    openTimelineByIdFromOpenTimelineModal(this.timelineId);
    cy.contains(defaultTimeline.title).should('exist');
    cy.get(TIMELINES_DESCRIPTION).should('have.text', defaultTimeline.description);
    cy.get(TIMELINES_PINNED_EVENT_COUNT).should('have.text', '1');
    cy.get(TIMELINES_NOTES_COUNT).should('have.text', '1');
    cy.get(TIMELINES_FAVORITE).should('exist');
    cy.get(TIMELINE_TITLE).should('have.text', defaultTimeline.title);
  });
});
