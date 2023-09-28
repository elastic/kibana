/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_TO_TIMELINE,
  COPY,
  DESTINATION_DOMAIN,
  FILTER_IN,
  FILTER_OUT,
  SHOW_TOP_FIELD,
} from '../../../screens/network/flows';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { mouseoverOnToOverflowItem, openHoverActions } from '../../../tasks/network/flows';

import { NETWORK_URL } from '../../../urls/navigation';

const testDomainOne = 'myTest';
const testDomainTwo = 'myTest2';

// FLAKY: https://github.com/elastic/kibana/issues/165692
// Tracked by https://github.com/elastic/security-team/issues/7696
describe.skip('Overflow items', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  context('Network stats and tables', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'network' });
    });

    beforeEach(() => {
      login();
      visitWithTimeRange(NETWORK_URL);
      cy.get(DESTINATION_DOMAIN).should('not.exist');
      cy.get(FILTER_IN).should('not.exist');
      cy.get(FILTER_OUT).should('not.exist');
      cy.get(ADD_TO_TIMELINE).should('not.exist');
      cy.get(SHOW_TOP_FIELD).should('not.exist');
      cy.get(COPY).should('not.exist');

      openHoverActions();
      mouseoverOnToOverflowItem();
    });

    after(() => {
      cy.task('esArchiverUnload', 'network');
    });

    it('Shows more items in the popover', () => {
      cy.get(DESTINATION_DOMAIN).eq(0).should('have.text', testDomainOne);
      cy.get(DESTINATION_DOMAIN).eq(1).should('have.text', testDomainTwo);
    });

    it('Shows Hover actions for more items in the popover', () => {
      cy.get(FILTER_IN).should('exist');
      cy.get(FILTER_OUT).should('exist');
      cy.get(ADD_TO_TIMELINE).should('exist');
      cy.get(SHOW_TOP_FIELD).should('exist');
      cy.get(COPY).should('exist');
    });
  });
});
