/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON } from '../../../screens/security_main';
import { TIMELINE_FLYOUT_HEADER } from '../../../screens/timeline';

import { waitForAllHostsToBeLoaded } from '../../../tasks/hosts/all_hosts';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  closeTimelineUsingCloseButton,
  openTimelineUsingToggle,
} from '../../../tasks/security_main';

import { hostsUrl } from '../../../urls/navigation';

// FLAKY: https://github.com/elastic/kibana/issues/183085
describe.skip('timeline flyout button', () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    waitForAllHostsToBeLoaded();
  });

  it('toggles open the timeline', { tags: ['@ess', '@serverless'] }, () => {
    openTimelineUsingToggle();
    cy.get(TIMELINE_FLYOUT_HEADER).should('have.css', 'visibility', 'visible');
    closeTimelineUsingCloseButton();
  });

  it(
    're-focuses the toggle button when timeline is closed by clicking the active timeline toggle button',
    { tags: ['@ess', '@serverless'] },
    () => {
      openTimelineUsingToggle();
      closeTimelineUsingCloseButton();

      cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
    }
  );

  it(
    're-focuses the toggle button when timeline is closed by clicking the [X] close button',
    { tags: ['@ess', '@serverless'] },
    () => {
      openTimelineUsingToggle();
      closeTimelineUsingCloseButton();

      cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
    }
  );

  it(
    're-focuses the toggle button when timeline is closed by pressing the Esc key',
    { tags: ['@ess', '@serverless'] },
    () => {
      openTimelineUsingToggle();
      cy.get('body').type('{esc}');

      cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
    }
  );

  it(
    'should render the global search dropdown when the input is focused',
    { tags: ['@ess'] },
    () => {
      openTimelineUsingToggle();
      cy.get('[data-test-subj="nav-search-input"]').focus();
      cy.get('[data-test-subj="nav-search-input"]').should('be.focused');
      cy.get('[data-test-subj="nav-search-option"]').should('be.visible');
      cy.get('[data-test-subj="nav-search-option"]').first().realHover();
      // check that at least one item is visible in the search bar after mousing over, i.e. it's still usable.
      cy.get('[data-test-subj="nav-search-option"]').its('length').should('be.gte', 1);
    }
  );
});
