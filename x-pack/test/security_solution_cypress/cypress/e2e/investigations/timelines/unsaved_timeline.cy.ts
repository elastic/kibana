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
import { cleanKibana } from '../../../tasks/common';
import {
  navigateFromKibanaCollapsibleTo,
  openKibanaNavigation,
} from '../../../tasks/kibana_navigation';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { closeTimelineUsingToggle } from '../../../tasks/security_main';
import { createNewTimeline, populateTimeline, saveTimeline } from '../../../tasks/timeline';
import { hostsUrl, MANAGE_URL } from '../../../urls/navigation';

// https://github.com/elastic/kibana/issues/169021

describe('Save Timeline Prompts', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cleanKibana();
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
    createNewTimeline();
  });

  it('unchanged & unsaved timeline should NOT prompt when user navigates away', () => {
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.url().should('not.contain', hostsUrl('allHosts'));
  });

  it('Changed & unsaved timeline should prompt when user navigates away from security solution', () => {
    populateTimeline();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & unsaved timeline should NOT prompt when user navigates away within security solution where timelines are enabled', () => {
    populateTimeline();
    closeTimelineUsingToggle();
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
    saveTimeline();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('Changed & saved timeline should NOT prompt when user navigates within security solution where timelines are disabled', () => {
    populateTimeline();
    saveTimeline();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('When user navigates to the page where timeline is present, Timeline save modal should not exists.', () => {
    populateTimeline();
    closeTimelineUsingToggle();
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
    closeTimelineUsingToggle();
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
