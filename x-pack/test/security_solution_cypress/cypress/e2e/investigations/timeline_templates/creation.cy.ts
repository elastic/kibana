/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';

import {
  FAVORITE_TIMELINE,
  LOCKED_ICON,
  NOTES,
  NOTES_TAB_BUTTON,
  NOTES_TEXT_AREA,
  PIN_EVENT,
  TIMELINE_DESCRIPTION,
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_QUERY,
  TIMELINE_TITLE,
} from '../../../screens/timeline';
import {
  TIMELINES_DESCRIPTION,
  TIMELINES_PINNED_EVENT_COUNT,
  TIMELINES_NOTES_COUNT,
  TIMELINES_FAVORITE,
} from '../../../screens/timelines';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteTimelines } from '../../../tasks/api_calls/common';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  addDescriptionToTimeline,
  addFilter,
  addNameToTimelineAndSave,
  addNotesToTimeline,
  clickingOnCreateTemplateFromTimelineBtn,
  closeTimeline,
  createNewTimelineTemplate,
  expandEventAction,
  markAsFavorite,
  openTimelineTemplateFromSettings,
  populateTimeline,
} from '../../../tasks/timeline';
import { openTimeline, waitForTimelinesPanelToBeLoaded } from '../../../tasks/timelines';

import { TIMELINES_URL } from '../../../urls/navigation';

// FLAKY: https://github.com/elastic/kibana/issues/165661
describe('Timeline Templates', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept('PATCH', '/api/timeline').as('timeline');
  });

  it.skip('Creates a timeline template', () => {
    visit(TIMELINES_URL);
    openTimelineUsingToggle();
    createNewTimelineTemplate();
    populateTimeline();
    addFilter(getTimeline().filter);
    cy.get(PIN_EVENT).should(
      'have.attr',
      'aria-label',
      'This event may not be pinned while editing a template timeline'
    );
    cy.get(LOCKED_ICON).should('be.visible');

    addNameToTimelineAndSave(getTimeline().title);

    cy.wait('@timeline').then(({ response }) => {
      const timelineId = response?.body.data.persistTimeline.timeline.savedObjectId;

      addDescriptionToTimeline(getTimeline().description);
      addNotesToTimeline(getTimeline().notes);
      markAsFavorite();
      createNewTimelineTemplate();
      closeTimeline();
      openTimelineTemplateFromSettings(timelineId);

      cy.contains(getTimeline().title).should('exist');
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', getTimeline().description);
      cy.get(TIMELINES_PINNED_EVENT_COUNT).first().should('have.text', '1');
      cy.get(TIMELINES_NOTES_COUNT).first().should('have.text', '1');
      cy.get(TIMELINES_FAVORITE).first().should('exist');

      openTimeline(timelineId);

      cy.get(FAVORITE_TIMELINE).should('exist');
      cy.get(TIMELINE_TITLE).should('have.text', getTimeline().title);
      cy.get(TIMELINE_DESCRIPTION).should('have.text', getTimeline().description);
      cy.get(TIMELINE_QUERY).should('have.text', getTimeline().query);
      // Comments this assertion until we agreed what to do with the filters.
      // cy.get(TIMELINE_FILTER(timeline.filter)).should('exist');
      // cy.get(NOTES_COUNT).should('have.text', '1');
      cy.get(NOTES_TAB_BUTTON).click();
      cy.get(NOTES_TEXT_AREA).should('exist');
      cy.get(NOTES).should('have.text', getTimeline().notes);
    });
  });

  it('Create template from timeline', () => {
    createTimeline(getTimeline());
    visit(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();
    expandEventAction();
    clickingOnCreateTemplateFromTimelineBtn();
    addNameToTimelineAndSave('Test');
    cy.wait('@timeline', { timeout: 100000 });
    cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
    cy.get(TIMELINE_QUERY).should('have.text', getTimeline().query);
  });
});
