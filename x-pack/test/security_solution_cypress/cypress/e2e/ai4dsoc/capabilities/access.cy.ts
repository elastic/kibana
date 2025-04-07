/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_SUMMARY_PROMPT, GET_STARTED_PAGE } from '../constants';
import { ALERT_SUMMARY_URL, ALERTS_URL, RULES_LANDING_URL } from '../../../urls/navigation';

describe('Cababilities', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login('admin');
  });
  describe('are set properly in order to visit pages', () => {
    it('alerts_summary', () => {
      visit(ALERT_SUMMARY_URL);
      cy.get(ALERTS_SUMMARY_PROMPT).should('exist');
    });
    it('alerts - should get redirected', () => {
      visit(ALERTS_URL);
      cy.get(GET_STARTED_PAGE).should('exist');
    });
    it('rules - should get redirected', () => {
      visit(RULES_LANDING_URL);
      cy.get(GET_STARTED_PAGE).should('exist');
    });
  });
});
