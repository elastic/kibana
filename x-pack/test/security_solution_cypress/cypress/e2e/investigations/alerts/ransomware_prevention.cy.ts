/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitTimeline, visitWithTimeRange } from '../../../tasks/navigation';

import { ALERTS_URL } from '../../../urls/navigation';
import { ALERTS_HISTOGRAM_SERIES, ALERT_RULE_NAME, MESSAGE } from '../../../screens/alerts';
import { TIMELINE_VIEW_IN_ANALYZER } from '../../../screens/timeline';
import { selectAlertsHistogram } from '../../../tasks/alerts';
import { deleteTimelines } from '../../../tasks/common';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { getTimeline } from '../../../objects/timeline';

describe('Ransomware Prevention Alerts', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', {
      archiveName: 'ransomware_prevention',
      useCreate: true,
      docsOnly: true,
    });
  });

  after(() => {
    cy.task('esArchiverUnload', 'ransomware_prevention');
  });

  describe('Ransomware display in Alerts Section', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
    });

    describe('Alerts table', () => {
      it('shows Ransomware Alerts', () => {
        cy.get(ALERT_RULE_NAME).should('have.text', 'Ransomware Prevention Alert');
      });
    });

    describe('Trend Chart', () => {
      beforeEach(() => {
        selectAlertsHistogram();
      });

      it('shows Ransomware Prevention Alert in the trend chart', () => {
        cy.get(ALERTS_HISTOGRAM_SERIES).should('have.text', 'Ransomware Prevention Alert');
      });
    });
  });

  describe('Ransomware in Timelines', function () {
    before(() => {
      deleteTimelines();
      createTimeline({ ...getTimeline(), query: 'event.code: "ransomware"' }).then((response) => {
        cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId');
      });
    });

    it('Renders ransomware entries in timelines table', function () {
      login();
      const timeline = this.timelineId;
      visitTimeline(timeline);
      // Wait for grid to load, it should have an analyzer icon
      cy.get(TIMELINE_VIEW_IN_ANALYZER).should('exist');

      cy.get(MESSAGE).should('have.text', 'Ransomware Prevention Alert');
    });
  });
});
