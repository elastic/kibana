/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimelineNonValidQuery } from '../../../objects/timeline';

import {
  DELETE_NOTE,
  NOTES_AUTHOR,
  NOTES_CODE_BLOCK,
  NOTE_DESCRIPTION,
  NOTES_LINK,
  NOTES_TEXT,
  NOTES_TEXT_AREA,
  MARKDOWN_INVESTIGATE_BUTTON,
} from '../../../screens/timeline';
import { MODAL_CONFIRMATION_BTN } from '../../../screens/alerts_detection_rules';
import { createTimeline, deleteTimelines } from '../../../tasks/api_calls/timelines';

import { login } from '../../../tasks/login';
import { visitTimeline } from '../../../tasks/navigation';
import { addNotesToTimeline, goToNotesTab } from '../../../tasks/timeline';
import { getFullname } from '../../../tasks/common';

const author = Cypress.env('ELASTICSEARCH_USERNAME');
const link = 'https://www.elastic.co/';

describe('Timeline notes tab', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(function () {
    deleteTimelines();

    createTimeline(getTimelineNonValidQuery())
      .then((response) => response.body.data.persistTimeline.timeline.savedObjectId)
      .then((timelineId: string) => {
        login();
        visitTimeline(timelineId);
      });
    goToNotesTab();
  });

  it('should render mockdown', () => {
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.get(NOTES_TEXT_AREA).should('be.visible');
  });

  it('should contain notes', () => {
    addNotesToTimeline(getTimelineNonValidQuery().notes);
    cy.get(NOTES_TEXT).first().should('have.text', getTimelineNonValidQuery().notes);
  });

  it('should be able to render font in bold', () => {
    addNotesToTimeline(`**bold**`);
    cy.get(`${NOTES_TEXT} strong`).last().should('have.text', `bold`);
  });

  it('should be able to render font in italics', () => {
    addNotesToTimeline(`_italics_`);
    cy.get(`${NOTES_TEXT} em`).last().should('have.text', `italics`);
  });

  it('should be able to render code blocks', () => {
    addNotesToTimeline(`\`code\``);
    cy.get(NOTES_CODE_BLOCK).should('be.visible');
  });

  it('should render the right author', () => {
    getFullname('admin').then((username) => {
      addNotesToTimeline(getTimelineNonValidQuery().notes);
      cy.get(NOTES_AUTHOR).first().should('have.text', username);
    });
  });

  // this test is failing on MKI only, the change was introduced by this EUI PR https://github.com/elastic/kibana/pull/195525
  // for some reason, on MKI the value we're getting is testing-internal(opens in a new tab or window)' instead of 'testing-internal(external, opens in a new tab or window)'
  it.skip('should be able to render a link', () => {
    addNotesToTimeline(`[${author}](${link})`);
    cy.get(NOTES_LINK)
      .last()
      .should('have.text', `${author}(external, opens in a new tab or window)`);
    cy.get(NOTES_LINK).last().click();
  });

  it('should render insight query from markdown', () => {
    addNotesToTimeline(
      `!{investigate{"description":"2 top level OR providers, 1 nested AND","label":"test insight", "providers": [[{ "field": "event.id", "value": "kibana.alert.original_event.id", "queryType": "phrase", "excluded": "false" }], [{ "field": "event.category", "value": "network", "queryType": "phrase", "excluded": "false" }, {"field": "process.pid", "value": "process.pid", "queryType": "phrase", "excluded": "false"}]]}}`
    );
    cy.get(MARKDOWN_INVESTIGATE_BUTTON).should('exist');
  });

  it('should be able to delete a note', () => {
    const deleteNoteContent = 'delete me';
    addNotesToTimeline(deleteNoteContent);
    cy.get(DELETE_NOTE(0)).click();
    cy.get(MODAL_CONFIRMATION_BTN).click();
    cy.get(NOTE_DESCRIPTION).last().should('not.have.text', deleteNoteContent);
  });
});
