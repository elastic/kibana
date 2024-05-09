/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MODAL_CONFIRMATION_BTN } from '../../../screens/alerts_detection_rules';
import {
  APP_LEAVE_CONFIRM_MODAL,
  CASES_PAGE,
  MANAGE_PAGE,
  OBSERVABILITY_ALERTS_PAGE,
} from '../../../screens/kibana_navigation';
import { TIMELINE_SAVE_MODAL } from '../../../screens/timeline';
import {
  navigateFromKibanaCollapsibleTo,
  openKibanaNavigation,
} from '../../../tasks/kibana_navigation';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  closeTimelineUsingCloseButton,
  openTimelineUsingToggle,
} from '../../../tasks/security_main';
import {
  navigateToHostsUsingBreadcrumb,
  navigateToExploreUsingBreadcrumb,
  navigateToAlertsPageInServerless,
  navigateToDiscoverPageInServerless,
  navigateToExplorePageInServerless,
} from '../../../tasks/serverless/navigation';
import {
  addNameToTimelineAndSave,
  createNewTimeline,
  populateTimeline,
} from '../../../tasks/timeline';
import { EXPLORE_URL, hostsUrl, MANAGE_URL } from '../../../urls/navigation';

// FLAKY: https://github.com/elastic/kibana/issues/174068
describe.skip('[ESS] Save Timeline Prompts', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    openTimelineUsingToggle();
    createNewTimeline();
    /*
     * When timeline changes are pending, chrome would popup with
     * a confirm dialog stating that `you can lose unsaved changed.
     * Below changes will disable that.
     *
     * */
    cy.window().then((win) => {
      win.onbeforeunload = null;
    });
  });

  it('should NOT prompt when navigating with an unchanged & unsaved timeline', () => {
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.url().should('not.contain', hostsUrl('allHosts'));
  });

  it('should prompt when navigating away from security solution with a changed & unsaved timeline', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
  });

  it('should NOT prompt when navigating with a changed & unsaved timeline within security solution where timelines are enabled', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    // navigate to any other page in security solution
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(CASES_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('should prompt when navigating with a changed & unsaved timeline within security solution where timelines are disabled eg. admin screen', () => {
    populateTimeline();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(MANAGE_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
  });

  it('should NOT prompt when navigating with a changed & saved timeline out of security solution', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('should NOT prompt when navigating with a changed & saved timeline within security solution where timelines are disabled', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(MANAGE_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('should NOT prompt when navigating with a changed and unsaved timeline from the page where timeline is disabled', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(MANAGE_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
    // now we have come from MANAGE_PAGE where timeline is disabled
    // to outside app where timeline is not present.
    // There should be NO confirmation model in that case.
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    // should not be manage page i.e. successfull navigation
    cy.get(TIMELINE_SAVE_MODAL).should('not.exist');
    cy.url().should('not.contain', MANAGE_URL);
  });
});

// In serverless it is not possible to use the navigation menu without closing the timeline
describe('[serverless] Save Timeline Prompts', { tags: ['@serverless'] }, () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    openTimelineUsingToggle();
    createNewTimeline();
    /*
     * When timeline changes are pending, chrome would popup with
     * a confirm dialog stating that `you can lose unsaved changed.
     * Below changes will disable that.
     *
     * */
    cy.window().then((win) => {
      win.onbeforeunload = null;
    });
  });

  it('should NOT prompt when navigating with an unchanged & unsaved timeline to any page', () => {
    closeTimelineUsingCloseButton();

    navigateToAlertsPageInServerless(); // security page with timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToExplorePageInServerless(); // security page with timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToDiscoverPageInServerless(); // external page
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('should prompt when navigating with a changed & unsaved timeline to a security page without timeline', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();

    navigateToAlertsPageInServerless(); // security page with timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToExplorePageInServerless(); // security page with timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
  });

  it('should prompt when navigating with a changed & unsaved timeline to an external page', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();

    navigateToDiscoverPageInServerless();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
  });

  it('should NOT prompt when navigating with a changed & saved timeline to pages where timelines are disabled', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    closeTimelineUsingCloseButton();

    navigateToAlertsPageInServerless(); // security page with timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToExplorePageInServerless(); // security page with timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToDiscoverPageInServerless(); // external page
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('should NOT prompt when navigating with a changed & unsaved timeline to a page with timeline using breadcrumbs', () => {
    populateTimeline();
    navigateToHostsUsingBreadcrumb(); // hosts has timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('should prompt when navigating with a changed & unsaved timeline to page without timeline using breadcrumbs', () => {
    populateTimeline();
    navigateToExploreUsingBreadcrumb(); // explore has timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
    cy.url().should('contain', EXPLORE_URL);
  });

  it('should NOT prompt when navigating with a changed & saved timeline within security solution where timelines are disabled', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    navigateToExploreUsingBreadcrumb(); // explore has timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });
});
