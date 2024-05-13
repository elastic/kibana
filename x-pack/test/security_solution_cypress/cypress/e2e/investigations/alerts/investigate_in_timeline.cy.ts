/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { disableExpandableFlyout } from '../../../tasks/api_calls/kibana_advanced_settings';
import { getNewRule } from '../../../objects/rule';
import {
  PROVIDER_BADGE,
  QUERY_TAB_BUTTON,
  TIMELINE_FILTER_BADGE,
  TIMELINE_TITLE,
} from '../../../screens/timeline';

import { expandFirstAlert, investigateFirstAlertInTimeline } from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { ALERTS_URL } from '../../../urls/navigation';
import {
  ALERT_FLYOUT,
  INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON,
  INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON,
  INSIGHTS_RELATED_ALERTS_BY_ANCESTRY,
  INSIGHTS_RELATED_ALERTS_BY_SESSION,
  SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON,
} from '../../../screens/alerts_details';
import { verifyInsightCount } from '../../../tasks/alerts_details';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';

describe('Investigate in timeline', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule());
  });

  describe('From alerts table', () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should open new timeline from alerts table', () => {
      investigateFirstAlertInTimeline();
      cy.get(PROVIDER_BADGE)
        .first()
        .invoke('text')
        .then((eventId) => {
          cy.get(PROVIDER_BADGE).filter(':visible').should('have.text', eventId);
        });
    });
  });

  describe('From alerts details flyout', () => {
    beforeEach(() => {
      login();
      disableExpandableFlyout();
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
    });

    it('should open a new timeline from a prevalence field', () => {
      // Only one alert matches the exact process args in this case
      const alertCount = 1;

      // Click on the last button that lets us investigate in timeline.
      // We expect this to be the `process.args` row.
      cy.get(ALERT_FLYOUT).find(SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON).eq(5).scrollIntoView();
      cy.get(ALERT_FLYOUT)
        .find(SUMMARY_VIEW_INVESTIGATE_IN_TIMELINE_BUTTON)
        .eq(5)
        .should('be.visible')
        .and('have.text', alertCount)
        .click();

      // Make sure a new timeline is created and opened
      cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');

      // The alert count in this timeline should match the count shown on the alert flyout
      cy.get(QUERY_TAB_BUTTON).should('contain.text', alertCount);

      // The correct filter is applied to the timeline query
      cy.get(TIMELINE_FILTER_BADGE).should(
        'have.text',
        ' {"bool":{"must":[{"term":{"process.args":"-zsh"}},{"term":{"process.args":"unique"}}]}}'
      );
    });

    it('should open a new timeline from an insights module', () => {
      verifyInsightCount({
        tableSelector: INSIGHTS_RELATED_ALERTS_BY_SESSION,
        investigateSelector: INSIGHTS_INVESTIGATE_IN_TIMELINE_BUTTON,
      });
    });

    it('should open a new timeline with alert ids from the process ancestry', () => {
      verifyInsightCount({
        tableSelector: INSIGHTS_RELATED_ALERTS_BY_ANCESTRY,
        investigateSelector: INSIGHTS_INVESTIGATE_ANCESTRY_ALERTS_IN_TIMELINE_BUTTON,
      });
    });
  });
});
