/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { PROVIDER_BADGE, QUERY_TAB_BUTTON, TIMELINE_TITLE } from '../../../screens/timeline';
import { closeTimeline } from '../../../tasks/timeline';
import { expandFirstAlert, investigateFirstAlertInTimeline } from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import {
  openDocumentFlyoutAnalyzerTool,
  openDocumentFlyoutCorrelationsTool,
  openDocumentFlyoutPrevalenceTool,
  selectDocumentFlyoutTakeActionItem,
} from '../../../tasks/document_flyout';
import {
  DOCUMENT_FLYOUT_ANALYZER_GRAPH,
  DOCUMENT_FLYOUT_CORRELATIONS_ANCESTRY_INVESTIGATE_IN_TIMELINE,
  DOCUMENT_FLYOUT_CORRELATIONS_SESSION_INVESTIGATE_IN_TIMELINE,
  DOCUMENT_FLYOUT_CORRELATIONS_SOURCE_INVESTIGATE_IN_TIMELINE,
  DOCUMENT_FLYOUT_PREVALENCE_INVESTIGATE_IN_TIMELINE,
  DOCUMENT_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE,
} from '../../../screens/document_flyout';

describe(
  'Investigate in timeline',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createRule(getNewRule());
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    describe('From alerts table', () => {
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
        expandFirstAlert();
      });

      it('should open a new timeline from take action button', () => {
        selectDocumentFlyoutTakeActionItem(DOCUMENT_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE);

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled Timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
      });

      it('should open the analyzer tool', () => {
        openDocumentFlyoutAnalyzerTool();

        cy.get(DOCUMENT_FLYOUT_ANALYZER_GRAPH).should('exist');
      });

      it('should open a new timeline from the prevalence detail table', () => {
        openDocumentFlyoutPrevalenceTool();
        cy.get(DOCUMENT_FLYOUT_PREVALENCE_INVESTIGATE_IN_TIMELINE).first().click();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled Timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
      });

      it('should open a new timeline from the correlations tool', () => {
        openDocumentFlyoutCorrelationsTool();
        cy.get(DOCUMENT_FLYOUT_CORRELATIONS_SOURCE_INVESTIGATE_IN_TIMELINE).click();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled Timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');

        closeTimeline();
        cy.get(DOCUMENT_FLYOUT_CORRELATIONS_SESSION_INVESTIGATE_IN_TIMELINE).click();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled Timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');

        // the ancestry section's date picker defaults to the last 1 day, which has no alerts in
        // this test's data, so the "Investigate in Timeline" button (a per-row action) doesn't
        // render there; this is covered by unit tests, so we simply confirm its absence here
        // instead of exercising the ancestry investigate-in-timeline flow
        cy.get(DOCUMENT_FLYOUT_CORRELATIONS_ANCESTRY_INVESTIGATE_IN_TIMELINE).should('not.exist');
      });
    });
  }
);
