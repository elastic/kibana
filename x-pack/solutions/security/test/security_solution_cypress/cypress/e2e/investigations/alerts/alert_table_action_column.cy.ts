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
import {
  DOCUMENT_FLYOUT_ANALYZER_GRAPH,
  DOCUMENT_FLYOUT_SESSION_VIEW,
} from '../../../screens/document_flyout';

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
    cy.get(DOCUMENT_FLYOUT_SESSION_VIEW).should('exist');
  });

  it('should have analyzer button visible & open analyzer on click', () => {
    openAnalyzerForFirstAlertInTimeline();
    cy.get(DOCUMENT_FLYOUT_ANALYZER_GRAPH).should('exist');
  });
});
