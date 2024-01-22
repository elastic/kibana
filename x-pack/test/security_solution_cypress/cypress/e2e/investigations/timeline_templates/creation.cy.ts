/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';

import {
  LOCKED_ICON,
  PIN_EVENT,
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_QUERY,
  TIMELINE_TITLE,
  TIMELINE_DATE_PICKER_CONTAINER,
} from '../../../screens/timeline';
import { TIMELINES_DESCRIPTION, TIMELINES_FAVORITE } from '../../../screens/timelines';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteTimelines } from '../../../tasks/api_calls/common';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  addFilter,
  addNameToTimelineAndSave,
  clickingOnCreateTemplateFromTimelineBtn,
  closeTimeline,
  createNewTimelineTemplate,
  createTimelineTemplateOptionsPopoverBottomBar,
  expandEventAction,
  markAsFavorite,
  openTimelineTemplate,
  populateTimeline,
  addNameAndDescriptionToTimeline,
  openTimelineTemplatesTab,
} from '../../../tasks/timeline';
import {
  updateTimelineDates,
  showStartEndDate,
  setStartDate,
  setEndDateNow,
} from '../../../tasks/date_picker';
import { waitForTimelinesPanelToBeLoaded } from '../../../tasks/timelines';

import { TIMELINES_URL } from '../../../urls/navigation';

describe('Timeline Templates', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept('PATCH', '/api/timeline').as('timeline');
  });

  it('Creates a timeline template', () => {
    visit(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();
    openTimelineUsingToggle();

    createNewTimelineTemplate();
    populateTimeline();

    cy.log('Add filter');
    addFilter(getTimeline().filter);

    cy.log('Update date range');
    showStartEndDate(TIMELINE_DATE_PICKER_CONTAINER);
    setEndDateNow(TIMELINE_DATE_PICKER_CONTAINER);
    setStartDate('Jan 18, 2018 @ 00:00:00.000', TIMELINE_DATE_PICKER_CONTAINER);
    updateTimelineDates();

    cy.log('Try to pin an event');
    cy.get(PIN_EVENT).should(
      'have.attr',
      'aria-label',
      'This event may not be pinned while editing a template timeline'
    );
    cy.get(LOCKED_ICON).should('be.visible');

    cy.log('Update title and description');
    addNameAndDescriptionToTimeline(getTimeline());

    cy.wait('@timeline').then(({ response }) => {
      const timelineId = response?.body.data.persistTimeline.timeline.savedObjectId;

      markAsFavorite();
      closeTimeline();

      cy.log('Open template from templates tab');
      openTimelineTemplatesTab();
      openTimelineTemplate(timelineId);

      cy.log('Check that the template has been created correclty');
      cy.contains(getTimeline().title).should('exist');
      cy.get(TIMELINE_TITLE).should('have.text', getTimeline().title);
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', getTimeline().description);
      cy.get(TIMELINES_FAVORITE).first().should('exist');
      cy.get(TIMELINE_QUERY).should('contain.text', getTimeline().query);
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

  it('should create timeline template from bottombar', () => {
    visit(TIMELINES_URL);
    createTimelineTemplateOptionsPopoverBottomBar();
    cy.get(TIMELINE_TITLE).should('have.text', 'Untitled template');
  });
});
