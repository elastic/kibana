/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON } from '../../../screens/security_main';
import { CREATE_NEW_TIMELINE, TIMELINE_FLYOUT_HEADER } from '../../../screens/timeline';

import { waitForAllHostsToBeLoaded } from '../../../tasks/hosts/all_hosts';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  closeTimelineUsingCloseButton,
  closeTimelineUsingToggle,
  openTimelineUsingToggle,
} from '../../../tasks/security_main';
import {
  closeCreateTimelineOptionsPopover,
  openCreateTimelineOptionsPopover,
} from '../../../tasks/timeline';

import { hostsUrl } from '../../../urls/navigation';

describe('timeline flyout button', () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    waitForAllHostsToBeLoaded();
  });

  it('toggles open the timeline', { tags: ['@ess', '@serverless'] }, () => {
    openTimelineUsingToggle();
    cy.get(TIMELINE_FLYOUT_HEADER).should('have.css', 'visibility', 'visible');
    closeTimelineUsingToggle();
  });

  it(
    're-focuses the toggle button when timeline is closed by clicking the active timeline toggle button',
    { tags: ['@ess', '@serverless'] },
    () => {
      openTimelineUsingToggle();
      closeTimelineUsingToggle();

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
    'the `(+)` button popover menu owns focus when open',
    { tags: ['@ess', '@serverless'] },
    () => {
      openCreateTimelineOptionsPopover();
      cy.get(CREATE_NEW_TIMELINE).focus();
      cy.get(CREATE_NEW_TIMELINE).should('have.focus');
      closeCreateTimelineOptionsPopover();
      cy.get(CREATE_NEW_TIMELINE).should('not.exist');
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
