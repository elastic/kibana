/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { getTimeline } from '../../../objects/timeline';

import {
  LOCKED_ICON,
  NOTES_TEXT,
  PIN_EVENT,
  TIMELINE_DESCRIPTION,
  TIMELINE_FILTER,
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_QUERY,
  TIMELINE_PANEL,
  TIMELINE_STATUS,
  TIMELINE_TAB_CONTENT_GRAPHS_NOTES,
  TIMELINE_SAVE_MODAL_OPEN_BUTTON,
  SAVE_TIMELINE_BTN_TOOLTIP,
} from '../../../screens/timeline';
import { createTimelineTemplate } from '../../../tasks/api_calls/timelines';

import { deleteTimelines } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { visit, visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { selectCustomTemplates } from '../../../tasks/templates';
import {
  addFilter,
  addNameAndDescriptionToTimeline,
  addNotesToTimeline,
  clickingOnCreateTimelineFormTemplateBtn,
  closeTimeline,
  createNewTimeline,
  executeTimelineKQL,
  expandEventAction,
  goToQueryTab,
  pinFirstEvent,
  populateTimeline,
  addNameToTimelineAndSave,
} from '../../../tasks/timeline';

import { OVERVIEW_URL, TIMELINE_TEMPLATES_URL } from '../../../urls/navigation';

describe('Create a timeline from a template', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    deleteTimelines();
    login();
    createTimelineTemplate(getTimeline());
  });

  beforeEach(() => {
    login();
    visit(TIMELINE_TEMPLATES_URL);
  });

  it('Should have the same query and open the timeline modal', () => {
    selectCustomTemplates();
    expandEventAction();
    clickingOnCreateTimelineFormTemplateBtn();

    cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
    cy.get(TIMELINE_DESCRIPTION).should('have.text', getTimeline().description);
    cy.get(TIMELINE_QUERY).should('have.text', getTimeline().query);
    closeTimeline();
  });
});

describe('Timelines', (): void => {
  before(() => {
    deleteTimelines();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/169866
  describe.skip('Toggle create timeline from plus icon', () => {
    context('Privileges: CRUD', { tags: '@ess' }, () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(OVERVIEW_URL);
      });

      it('toggle create timeline ', () => {
        createNewTimeline();
        addNameAndDescriptionToTimeline(getTimeline());
        cy.get(TIMELINE_PANEL).should('be.visible');
      });
    });

    context('Privileges: READ', { tags: '@ess' }, () => {
      beforeEach(() => {
        login(ROLES.t1_analyst);
        visitWithTimeRange(OVERVIEW_URL, { role: ROLES.t1_analyst });
      });

      it('should not be able to create/update timeline ', () => {
        createNewTimeline();
        cy.get(TIMELINE_PANEL).should('be.visible');
        cy.get(TIMELINE_SAVE_MODAL_OPEN_BUTTON).should('be.disabled');
        cy.get(TIMELINE_SAVE_MODAL_OPEN_BUTTON).first().realHover();
        cy.get(SAVE_TIMELINE_BTN_TOOLTIP).should('be.visible');
        cy.get(SAVE_TIMELINE_BTN_TOOLTIP).should(
          'have.text',
          'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.'
        );
      });
    });
  });

  describe(
    'Creates a timeline by clicking untitled timeline from bottom bar',
    { tags: ['@ess', '@serverless'] },
    () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(OVERVIEW_URL);
        openTimelineUsingToggle();
        addNameAndDescriptionToTimeline(getTimeline());
        populateTimeline();
        goToQueryTab();
      });

      it.skip('can be added filter', () => {
        addFilter(getTimeline().filter);
        cy.get(TIMELINE_FILTER(getTimeline().filter)).should('exist');
      });

      it('pins an event', () => {
        pinFirstEvent();
        cy.get(PIN_EVENT)
          .should('have.attr', 'aria-label')
          .and('match', /Unpin the event in row 2/);
      });

      it('has a lock icon', () => {
        cy.get(LOCKED_ICON).should('be.visible');
      });

      // TO-DO: Issue 163398
      it.skip('can be added notes', () => {
        addNotesToTimeline(getTimeline().notes);
        cy.get(TIMELINE_TAB_CONTENT_GRAPHS_NOTES)
          .find(NOTES_TEXT)
          .should('have.text', getTimeline().notes);
      });
    }
  );

  describe('shows the different timeline states', () => {
    before(() => {
      login();
      visitWithTimeRange(OVERVIEW_URL);
      createNewTimeline();
    });

    it('should show the correct timeline status', { tags: ['@ess', '@serverless'] }, () => {
      // Unsaved
      cy.get(TIMELINE_PANEL).should('be.visible');
      cy.get(TIMELINE_STATUS).should('be.visible');
      cy.get(TIMELINE_STATUS).should('have.text', 'Unsaved');

      addNameToTimelineAndSave('Test');

      // Saved
      cy.get(TIMELINE_STATUS).should('be.visible');
      cy.get(TIMELINE_STATUS)
        .invoke('text')
        .should('match', /^Saved/);

      executeTimelineKQL('agent.name : *');

      // Saved but has unsaved changes
      cy.get(TIMELINE_STATUS).should('be.visible');
      cy.get(TIMELINE_STATUS)
        .invoke('text')
        .should('match', /^Has unsaved changes/);
    });
  });
});
