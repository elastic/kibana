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
import { addNotesToTimeline } from '../../../tasks/timeline';
import { getFullname } from '../../../tasks/common';

const author = Cypress.env('ELASTICSEARCH_USERNAME');
const link = 'https://www.elastic.co/';

describe('Timeline notes tab', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(function () {
    deleteTimelines();

    createTimeline(getTimelineNonValidQuery())
      .then((response) => response.body.savedObjectId)
      .then((timelineId: string) => {
        login();
        visitTimeline(timelineId);
      });
  });

  it('renders notes UI and basic content and delete it', () => {
    const note = getTimelineNonValidQuery().notes;
    addNotesToTimeline(note);

    cy.get(NOTES_TEXT_AREA).should('be.visible');
    cy.get(NOTES_TEXT).first().should('have.text', note);
    cy.get(DELETE_NOTE(0)).click();
    cy.get(MODAL_CONFIRMATION_BTN).click();
    cy.get(NOTE_DESCRIPTION).last().should('not.have.text', note);
  });

  it('renders common markdown (bold, italics, code, link)', () => {
    addNotesToTimeline(`**bold** _italics_ \`code\` [${author}](${link})`);

    // bold / italics / code
    cy.get(`${NOTES_TEXT} strong`).last().should('have.text', 'bold');
    cy.get(`${NOTES_TEXT} em`).last().should('have.text', 'italics');
    cy.get(NOTES_CODE_BLOCK).should('be.visible');

    // link
    cy.get(NOTES_LINK)
      .last()
      .should('have.attr', 'href', link)
      .and('contain.text', author)
      .and('contain.text', 'opens in a new tab or window');
  });

  it('shows the correct author and renders an investigate button from markdown', () => {
    // author check
    getFullname('admin').then((username) => {
      addNotesToTimeline(getTimelineNonValidQuery().notes);
      cy.get(NOTES_AUTHOR).first().should('have.text', username);
    });

    // investigate markdown button
    addNotesToTimeline(
      `!{investigate{"description":"2 top level OR providers, 1 nested AND","label":"test insight","providers":[[{"field":"event.id","value":"kibana.alert.original_event.id","queryType":"phrase","excluded":"false"}],[{"field":"event.category","value":"network","queryType":"phrase","excluded":"false"},{"field":"process.pid","value":"process.pid","queryType":"phrase","excluded":"false"}]]}}`
    );
    cy.get(MARKDOWN_INVESTIGATE_BUTTON).should('exist');
  });
});
