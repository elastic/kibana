/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { ALERTS_URL, TIMELINES_URL } from '../../../urls/navigation';
import { ALERTS_HISTOGRAM_SERIES, ALERT_RULE_NAME, MESSAGE } from '../../../screens/alerts';
import { TIMELINE_QUERY, TIMELINE_VIEW_IN_ANALYZER } from '../../../screens/timeline';
import { selectAlertsHistogram } from '../../../tasks/alerts';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { deleteTimelines } from '../../../tasks/api_calls/timelines';

describe('Ransomware Detection Alerts', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', {
      archiveName: 'ransomware_detection',
      useCreate: true,
      docsOnly: true,
    });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'ransomware_detection' });
  });

  describe('Ransomware in Alerts Page', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should show ransomware alerts on alerts page', () => {
      cy.log('should show ransomware alerts in alerts table');

      cy.get(ALERT_RULE_NAME).should('have.text', 'Ransomware Detection Alert');

      cy.log('should show ransomware prevention alert in the trend chart');

      selectAlertsHistogram();
      cy.get(ALERTS_HISTOGRAM_SERIES).should('have.text', 'Ransomware Detection Alert');
    });
  });

  describe('Ransomware in Timelines', () => {
    beforeEach(() => {
      deleteTimelines();
      login();
      visitWithTimeRange(TIMELINES_URL);
    });

    it('should show ransomware entries in timelines table', () => {
      openTimelineUsingToggle();
      cy.get(TIMELINE_QUERY).type('event.code: "ransomware"{enter}');

      // Wait for grid to load, it should have an analyzer icon
      cy.get(TIMELINE_VIEW_IN_ANALYZER).should('exist');

      cy.get(MESSAGE).should('have.text', 'Ransomware Detection Alert');
    });
  });
});
