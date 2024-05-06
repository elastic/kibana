/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { SELECTED_ALERTS } from '../../../screens/alerts';
import { SERVER_SIDE_EVENT_COUNT } from '../../../screens/timeline';
import { selectAllAlerts, selectFirstPageAlerts } from '../../../tasks/alerts';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  bulkInvestigateSelectedEventsInTimeline,
  selectAllEvents,
  selectFirstPageEvents,
} from '../../../tasks/common/event_table';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import {
  waitsForEventsToBeLoaded,
  waitForEventsDataGridToBeLoaded,
} from '../../../tasks/hosts/events';
import { openEvents, openSessions } from '../../../tasks/hosts/main';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL, hostsUrl } from '../../../urls/navigation';

describe('Bulk Investigate in Timeline', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'bulk_process' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'bulk_process' });
  });

  context('Alerts', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createRule(getNewRule());
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('Adding multiple alerts to the timeline should be successful', () => {
      selectFirstPageAlerts();
      cy.get(SELECTED_ALERTS).then((sub) => {
        const alertCountText = sub.text();
        const alertCount = alertCountText.split(' ')[1];
        bulkInvestigateSelectedEventsInTimeline();
        cy.get('body').should('contain.text', `${alertCount} event IDs`);
        cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
      });
    });

    it('When selected all alerts are selected should be successfull', () => {
      selectAllAlerts();
      cy.get(SELECTED_ALERTS).then((sub) => {
        const alertCountText = sub.text(); // Selected 3,654 alerts
        const alertCount = alertCountText.split(' ')[1];
        bulkInvestigateSelectedEventsInTimeline();
        cy.get('body').should('contain.text', `${alertCount} event IDs`);
        cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
      });
    });
  });

  context('Host -> Events Viewer', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openEvents();
      waitsForEventsToBeLoaded();
      waitForEventsDataGridToBeLoaded();
    });

    it('Adding multiple events to the timeline should be successful', () => {
      selectFirstPageEvents();
      cy.get(SELECTED_ALERTS).then((sub) => {
        const alertCountText = sub.text();
        const alertCount = alertCountText.split(' ')[1];
        bulkInvestigateSelectedEventsInTimeline();
        cy.get('body').should('contain.text', `${alertCount} event IDs`);
        cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
      });
    });

    it('When selected all alerts are selected should be successfull', () => {
      selectAllEvents();
      cy.get(SELECTED_ALERTS).then((sub) => {
        const alertCountText = sub.text(); // Selected 3,654 alerts
        const alertCount = alertCountText.split(' ')[1];
        bulkInvestigateSelectedEventsInTimeline();
        cy.get('body').should('contain.text', `${alertCount} event IDs`);
        cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
      });
    });
  });

  context('Host -> Sessions Viewer', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
      openSessions();
      waitsForEventsToBeLoaded();
      waitForEventsDataGridToBeLoaded();
    });

    it('Adding multiple events to the timeline should be successful', () => {
      selectFirstPageEvents();
      cy.get(SELECTED_ALERTS).then((sub) => {
        const alertCountText = sub.text();
        const alertCount = alertCountText.split(' ')[1];
        bulkInvestigateSelectedEventsInTimeline();
        cy.get('body').should('contain.text', `${alertCount} event IDs`);
        cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
      });
    });

    it('When selected all events are selected should be successfull', () => {
      selectAllEvents();
      cy.get(SELECTED_ALERTS).then((sub) => {
        const alertCountText = sub.text(); // Selected 3,654 alerts
        const alertCount = alertCountText.split(' ')[1];
        bulkInvestigateSelectedEventsInTimeline();
        cy.get('body').should('contain.text', `${alertCount} event IDs`);
        cy.get(SERVER_SIDE_EVENT_COUNT).should('contain.text', alertCount);
      });
    });
  });
});
