/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OVERLAY_CONTAINER } from '../../../screens/alerts';
import {
  openAnalyzerForFirstAlertInTimeline,
  openSessionViewerFromAlertTable,
} from '../../../tasks/alerts';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';

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
    cy.get(OVERLAY_CONTAINER).should('be.visible');
  });

  it('should have analyzer button visible & open analyzer on click', () => {
    openAnalyzerForFirstAlertInTimeline();
    cy.get(OVERLAY_CONTAINER).should('be.visible');
  });
});
