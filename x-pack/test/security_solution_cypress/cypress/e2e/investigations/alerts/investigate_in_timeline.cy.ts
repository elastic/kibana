/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import {
  ANALYZER_GRAPH_TAB_BUTTON,
  PROVIDER_BADGE,
  QUERY_TAB_BUTTON,
  TIMELINE_TITLE,
} from '../../../screens/timeline';
import { closeTimeline } from '../../../tasks/timeline';
import { investigateFirstAlertInTimeline } from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import { expandAlertAtIndexExpandableFlyout } from '../../../tasks/expandable_flyout/common';
import {
  clickAnalyzerPreviewTitleToOpenTimeline,
  toggleOverviewTabAboutSection,
  toggleOverviewTabInvestigationSection,
  toggleOverviewTabVisualizationsSection,
} from '../../../tasks/expandable_flyout/alert_details_right_panel_overview_tab';
import {
  expandDocumentDetailsExpandableFlyoutLeftSection,
  openTakeActionButton,
  selectTakeActionItem,
} from '../../../tasks/expandable_flyout/alert_details_right_panel';
import { DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE } from '../../../screens/expandable_flyout/alert_details_right_panel';
import {
  openTimelineFromPrevalenceTableCell,
  openPrevalenceTab,
} from '../../../tasks/expandable_flyout/alert_details_left_panel_prevalence_tab';
import {
  openCorrelationsTab,
  openTimelineFromRelatedByAncestry,
  openTimelineFromRelatedBySession,
  openTimelineFromRelatedSourceEvent,
} from '../../../tasks/expandable_flyout/alert_details_left_panel_correlations_tab';

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
        expandAlertAtIndexExpandableFlyout();
      });

      it('should open a new timeline from take action button', () => {
        openTakeActionButton();
        selectTakeActionItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE);

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
      });

      it('should open a new timeline from analyzer graph preview', () => {
        toggleOverviewTabAboutSection();
        toggleOverviewTabInvestigationSection();
        toggleOverviewTabVisualizationsSection();
        clickAnalyzerPreviewTitleToOpenTimeline();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');
        cy.get(ANALYZER_GRAPH_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
      });

      it('should open a new timeline from the prevalence detail table', () => {
        expandDocumentDetailsExpandableFlyoutLeftSection();
        openPrevalenceTab();
        openTimelineFromPrevalenceTableCell();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
      });

      it('should open a new timeline from the correlations tab', () => {
        expandDocumentDetailsExpandableFlyoutLeftSection();
        openCorrelationsTab();
        openTimelineFromRelatedSourceEvent();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');

        closeTimeline();
        openTimelineFromRelatedBySession();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');

        closeTimeline();
        openTimelineFromRelatedByAncestry();

        cy.get(TIMELINE_TITLE).should('have.text', 'Untitled timeline');
        cy.get(QUERY_TAB_BUTTON).should('have.class', 'euiTab-isSelected');
      });
    });
  }
);
