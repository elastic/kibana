/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MODAL_CONFIRMATION_BTN } from '../../../screens/alerts_detection_rules';
import {
  ALERTS_PAGE,
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

// FLAKY: https://github.com/elastic/kibana/issues/169588
describe.skip('Save Timeline Prompts', { tags: ['@ess'] }, () => {
  before(() => {
    login();
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

  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    openTimelineUsingToggle();
    createNewTimeline();
  });

  it('unchanged & unsaved timeline should NOT prompt when user navigates away', () => {
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.url().should('not.contain', hostsUrl('allHosts'));
  });

  it('Changed & unsaved timeline should prompt when user navigates away from security solution', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & unsaved timeline should NOT prompt when user navigates away within security solution where timelines are enabled', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    // navigate to any other page in security solution
    openKibanaNavigation();
    cy.get(CASES_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('Changed & unsaved timeline should prompt when user navigates away within security solution where timelines are disabled eg. admin screen', () => {
    populateTimeline();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & saved timeline should NOT prompt when user navigates away out of security solution', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('Changed & saved timeline should NOT prompt when user navigates within security solution where timelines are disabled', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('When user navigates to the page where timeline is present, Timeline save modal should not exists.', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();

    // Navigate back to HOSTS_URL and ensure that
    // timeline save modal is NOT present

    openKibanaNavigation();
    cy.get(ALERTS_PAGE).click();
    cy.get(TIMELINE_SAVE_MODAL).should('not.exist');
  });

  it('Changed and unsaved timeline should NOT prompt when user navigates from the page where timeline is disabled', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
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
describe('Save Timeline Prompts', { tags: ['@serverless'] }, () => {
  before(() => {
    login();
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

  beforeEach(() => {
    login();
    visitWithTimeRange(hostsUrl('allHosts'));
    openTimelineUsingToggle();
    createNewTimeline();
  });

  it('unchanged & unsaved timeline should NOT prompt when it is closed and navigate to any page', () => {
    closeTimelineUsingCloseButton();

    navigateToAlertsPageInServerless(); // security page with timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToExplorePageInServerless(); // security page with timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToDiscoverPageInServerless(); // external page
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('Changed & unsaved timeline should prompt when it is closed and navigate to Security page without timeline', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();

    navigateToAlertsPageInServerless(); // security page with timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
    navigateToExplorePageInServerless(); // security page with timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & unsaved timeline should prompt when it is closed and navigate to external page', () => {
    populateTimeline();
    closeTimelineUsingCloseButton();

    navigateToDiscoverPageInServerless();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & saved timeline should NOT prompt when it is closed', () => {
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

  it('Changed & unsaved timeline should NOT prompt when navigate to page with timeline using breadcrumbs', () => {
    populateTimeline();
    navigateToHostsUsingBreadcrumb(); // hosts has timelines enabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('Changed & unsaved timeline should NOT prompt when navigate to page without timeline using breadcrumbs', () => {
    populateTimeline();
    navigateToExploreUsingBreadcrumb(); // explore has timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
    cy.url().should('contain', EXPLORE_URL);
  });

  it('Changed & saved timeline should NOT prompt when user navigates within security solution where timelines are disabled', () => {
    populateTimeline();
    addNameToTimelineAndSave('Test');
    navigateToExploreUsingBreadcrumb(); // explore has timelines disabled
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });
});
