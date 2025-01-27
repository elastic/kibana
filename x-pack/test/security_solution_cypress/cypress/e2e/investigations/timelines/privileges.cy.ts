/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { hostsUrl } from '../../../urls/navigation';
import { ACTIVE_TIMELINE_BOTTOM_BAR } from '../../../screens/timeline';
import { TIMELINES } from '../../../screens/security_header';
import {
  NAV_SEARCH_INPUT,
  NAV_SEARCH_NO_RESULTS,
  NAV_SEARCH_RESULTS,
} from '../../../screens/search_bar';

describe('Privileges', { tags: ['@ess', '@skipInServerless'] }, () => {
  describe('Timeline', () => {
    it('should not show timeline elements for users with insufficient privileges', () => {
      login(ROLES.timeline_none);
      visitWithTimeRange(hostsUrl('allHosts'));
      // no timeline bottom bar
      cy.get(ACTIVE_TIMELINE_BOTTOM_BAR).should('not.exist');
      // no link to the timelines page
      cy.get(TIMELINES).should('not.exist');
      // no search result for timeline in the nav search
      cy.get(NAV_SEARCH_INPUT).type('Timelines');
      cy.get(NAV_SEARCH_NO_RESULTS).should('exist');
    });

    it('should show timeline elements for users with sufficient privileges', () => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      cy.get(ACTIVE_TIMELINE_BOTTOM_BAR).should('exist');
      cy.get(TIMELINES).should('exist');
      cy.get(NAV_SEARCH_INPUT).type('Timelines');
      cy.get(NAV_SEARCH_RESULTS).contains('Timelines');
    });
  });

  // Somehow, these tests fail on CI...
  describe.skip('Notes', () => {
    it('should show notes in search for users with privileges', () => {
      login(ROLES.t3_analyst);
      visitWithTimeRange(hostsUrl('allHosts'));
      cy.get(NAV_SEARCH_INPUT).focus();
      cy.get(NAV_SEARCH_INPUT).type('Notes');
      cy.get(NAV_SEARCH_RESULTS).contains('Notes');
    });

    it('should not show notes in search for users with insufficient privileges', () => {
      login(ROLES.notes_none);
      visitWithTimeRange(hostsUrl('allHosts'));
      // no search result for notes in the nav search
      cy.get(NAV_SEARCH_INPUT).focus();
      cy.get(NAV_SEARCH_INPUT).type('Notes');
      cy.get(NAV_SEARCH_NO_RESULTS).should('exist');
    });
  });
});
