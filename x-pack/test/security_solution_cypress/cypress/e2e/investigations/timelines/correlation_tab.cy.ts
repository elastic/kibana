/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { openTimeline } from '../../../tasks/timelines';
import {
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_TAB_CONTENT_EQL,
  TIMELINE_CORRELATION_INPUT,
} from '../../../screens/timeline';
import { createTimeline } from '../../../tasks/api_calls/timelines';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { addEqlToTimeline, saveTimeline, clearEqlInTimeline } from '../../../tasks/timeline';

import { TIMELINES_URL } from '../../../urls/navigation';
import { EQL_QUERY_VALIDATION_ERROR } from '../../../screens/create_new_rule';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';

describe('Correlation tab', { tags: ['@ess', '@serverless'] }, () => {
  const eql = 'any where process.name == "zsh"';

  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
    createTimeline().then((response) => {
      visit(TIMELINES_URL);
      openTimeline(response.body.data.persistTimeline.timeline.savedObjectId);
      addEqlToTimeline(eql);
      saveTimeline();
      cy.wait('@updateTimeline');
    });
  });

  it('should update timeline after adding eql', () => {
    cy.get(`${TIMELINE_TAB_CONTENT_EQL} ${SERVER_SIDE_EVENT_COUNT}`)
      .invoke('text')
      .then(parseInt)
      .should('be.gt', 0);
  });

  it('should update timeline after removing eql', () => {
    clearEqlInTimeline();
    saveTimeline();
    cy.wait('@updateTimeline');
    cy.reload();
    cy.get(TIMELINE_CORRELATION_INPUT).should('be.visible');
    cy.get(TIMELINE_CORRELATION_INPUT).should('have.text', '');
  });

  it('should NOT update timeline after adding wrong eql', () => {
    const nonFunctionalEql = 'this is not valid eql';
    addEqlToTimeline(nonFunctionalEql);
    cy.get(EQL_QUERY_VALIDATION_ERROR).should('be.visible');
    cy.get(EQL_QUERY_VALIDATION_ERROR).should('have.text', '1');
    saveTimeline();
    cy.reload();
    cy.get(TIMELINE_CORRELATION_INPUT).should('be.visible');
    cy.get(TIMELINE_CORRELATION_INPUT).should('have.text', eql);
  });
});
