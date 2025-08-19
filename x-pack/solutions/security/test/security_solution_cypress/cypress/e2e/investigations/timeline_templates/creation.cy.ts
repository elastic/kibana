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
  TIMELINE_QUERY,
  TIMELINE_TITLE,
  TIMELINE_DATE_PICKER_CONTAINER,
  TIMELINE_TITLE_BY_ID,
} from '../../../screens/timeline';
import { TIMELINES_DESCRIPTION, TIMELINES_USERNAME } from '../../../screens/timelines';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  addFilter,
  addNameToTimelineAndSave,
  clickingOnCreateTemplateFromTimelineBtn,
  closeTimeline,
  createTimelineTemplateFromBottomBar,
  expandEventAction,
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
import {
  GET_LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON,
  GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON,
} from '../../../screens/date_picker';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM_AT } from '../../../screens/search_bar';

const mockTimeline = getTimeline();

// FLAKY: https://github.com/elastic/kibana/issues/183579
describe.skip('Timeline Templates', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept('PATCH', '/api/timeline').as('timeline');
  });

  it('should create a timeline template from empty', () => {
    visit(TIMELINES_URL);
    createTimelineTemplateFromBottomBar();

    populateTimeline();
    addFilter(mockTimeline.filter);
    showStartEndDate(TIMELINE_DATE_PICKER_CONTAINER);
    setEndDateNow(TIMELINE_DATE_PICKER_CONTAINER);
    const startDate = 'Jan 18, 2018 @ 00:00:00.000';
    setStartDate(startDate, TIMELINE_DATE_PICKER_CONTAINER);
    updateTimelineDates();

    cy.log('Try to pin an event');

    cy.get(PIN_EVENT).should(
      'have.attr',
      'aria-label',
      'This event may not be pinned while editing a template timeline'
    );
    cy.get(LOCKED_ICON).should('be.visible');

    cy.log('Save and close');

    addNameAndDescriptionToTimeline(mockTimeline);
    closeTimeline();

    cy.wait('@timeline').then(({ response }) => {
      const { createdBy, savedObjectId } = response?.body.data.persistTimeline.timeline;

      cy.log('Verify template shows on the table in the templates tab');

      openTimelineTemplatesTab();

      cy.get(TIMELINE_TITLE_BY_ID(savedObjectId)).should('have.text', mockTimeline.title);
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', mockTimeline.description);
      cy.get(TIMELINES_USERNAME).first().should('have.text', createdBy);

      cy.log('Open template and check that the template has been created correctly');

      openTimelineTemplate(savedObjectId);

      cy.get(TIMELINE_TITLE).should('have.text', mockTimeline.title);
      cy.get(TIMELINE_QUERY).should('contain.text', mockTimeline.query);
      cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM_AT(0))
        .should('contain.text', mockTimeline.filter.field)
        .and('contain.text', mockTimeline.filter.value);
      cy.get(
        GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(TIMELINE_DATE_PICKER_CONTAINER)
      ).should('have.text', startDate);
      cy.get(GET_LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON(TIMELINE_DATE_PICKER_CONTAINER)).should(
        'not.have.text',
        'now'
      );
    });
  });

  it('should create a template from an existing timeline', () => {
    createTimeline(mockTimeline);
    visit(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();
    expandEventAction();
    clickingOnCreateTemplateFromTimelineBtn();
    const savedName = 'Test';
    addNameToTimelineAndSave(savedName);

    cy.wait('@timeline').then(({ response }) => {
      const { createdBy, savedObjectId } = response?.body.data.persistTimeline.timeline;

      cy.log('Check that the template has been created correctly');

      cy.get(TIMELINE_TITLE).should('have.text', savedName);
      cy.get(TIMELINE_QUERY).should('have.text', mockTimeline.query);

      cy.log('Close timeline and verify template shows on the table in the templates tab');

      closeTimeline();
      openTimelineTemplatesTab();

      cy.get(TIMELINE_TITLE_BY_ID(savedObjectId)).should('have.text', savedName);
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', mockTimeline.description);
      cy.get(TIMELINES_USERNAME).first().should('have.text', createdBy);
    });
  });
});
