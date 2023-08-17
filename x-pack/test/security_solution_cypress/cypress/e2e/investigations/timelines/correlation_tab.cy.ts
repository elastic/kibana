/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { openTimeline } from '../../../tasks/timelines';
import { getTimeline } from '../../../objects/timeline';

import {
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_TAB_CONTENT_EQL,
  TIMELINE_CORRELATION_INPUT,
} from '../../../screens/timeline';
import { createTimeline } from '../../../tasks/api_calls/timelines';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import { addEqlToTimeline } from '../../../tasks/timeline';

import { TIMELINES_URL } from '../../../urls/navigation';
import { EQL_QUERY_VALIDATION_ERROR } from '../../../screens/create_new_rule';
import { deleteTimelines } from '../../../tasks/common';

describe('Correlation tab', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  const eql = 'any where process.name == "zsh"';

  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
    createTimeline(getTimeline()).then((response) => {
      visitWithoutDateRange(TIMELINES_URL);
      openTimeline(response.body.data.persistTimeline.timeline.savedObjectId);
      addEqlToTimeline(eql);
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
    cy.get(TIMELINE_CORRELATION_INPUT).type('{selectAll} {del}');
    cy.get(TIMELINE_CORRELATION_INPUT).clear();
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
    cy.reload();
    cy.get(TIMELINE_CORRELATION_INPUT).should('be.visible');
    cy.get(TIMELINE_CORRELATION_INPUT).should('have.text', eql);
  });
});
