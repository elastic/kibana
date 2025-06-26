/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  openAnalyzerForFirstAlertInTimeline,
  openSessionViewerFromAlertTable,
} from '../../../tasks/alerts';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import { DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB } from '../../../screens/expandable_flyout/alert_details_left_panel';
import { DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON } from '../../../screens/expandable_flyout/alert_details_left_panel_session_view_tab';
import {
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT,
} from '../../../screens/expandable_flyout/alert_details_left_panel_analyzer_graph_tab';

describe('Alerts Table Action column', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', {
      archiveName: 'process_ancestry',
      useCreate: true,
      docsOnly: true,
    });
  });

  beforeEach(() => {
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'process_ancestry' });
  });

  it('should have session viewer button visible & open session viewer on click', () => {
    openSessionViewerFromAlertTable();
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB)
      .should('have.text', 'Visualize')
      .and('have.class', 'euiTab-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_SESSION_VIEW_BUTTON)
      .should('have.text', 'Session View')
      .and('have.class', 'euiButtonGroupButton-isSelected');
  });

  it('should have analyzer button visible & open analyzer on click', () => {
    openAnalyzerForFirstAlertInTimeline();
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB)
      .should('have.text', 'Visualize')
      .and('have.class', 'euiTab-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON)
      .should('have.text', 'Analyzer Graph')
      .and('have.class', 'euiButtonGroupButton-isSelected');
    cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT).should('exist');
  });
});
