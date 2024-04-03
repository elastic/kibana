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
import { deleteTimelines } from '../../../tasks/api_calls/timelines';
import { addNoteToTimeline } from '../../../tasks/api_calls/notes';
import { createTimeline } from '../../../tasks/api_calls/timelines';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  addFilter,
  addNoteToFirstRowEvent,
  openTimelineById,
  pinFirstEvent,
} from '../../../tasks/timeline';

import { TIMELINES_URL } from '../../../urls/navigation';

const mockTimeline = getTimeline();

describe('Timeline query tab', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    visit(TIMELINES_URL);
    deleteTimelines();
    createTimeline(mockTimeline)
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) => {
        cy.wrap(timelineId).as('timelineId');
        addNoteToTimeline(mockTimeline.notes, timelineId);
        openTimelineById(timelineId);
        pinFirstEvent();
        addFilter(mockTimeline.filter);
      });
  });

  it('should display the right query and filters', () => {
    cy.get(TIMELINE_QUERY).should('have.text', `${mockTimeline.query}`);
    cy.get(TIMELINE_FILTER(mockTimeline.filter)).should('exist');
  });

  it('should be able to add event note', () => {
    const note = 'event note';
    addNoteToFirstRowEvent(note);
    cy.get(NOTE_CARD_CONTENT).should('contain', 'event note');
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
