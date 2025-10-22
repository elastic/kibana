/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';

import { ENTITY_ANALYTICS_URL } from '../../../../urls/navigation';

import {
  ANOMALIES_TABLE,
  ANOMALIES_TABLE_ROWS,
  ANOMALIES_TABLE_ENABLE_JOB_LOADER,
  ANOMALIES_TABLE_COUNT_COLUMN,
} from '../../../../screens/entity_analytics';
import { setRowsPerPageTo } from '../../../../tasks/table_pagination';
import {
  enableJob,
  navigateToNextPage,
  waitForAnomaliesToBeLoaded,
} from '../../../../tasks/entity_analytics';

describe('Entity Analytics Dashboard', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  describe('With anomalies data', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'network' });
      login();
      visitWithTimeRange(ENTITY_ANALYTICS_URL);
      cy.get(ANOMALIES_TABLE).should('be.visible');
      waitForAnomaliesToBeLoaded();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'network' });
    });

    it('should enable a job and renders the table with pagination', () => {
      // Enables the job and perform checks
      cy.get(ANOMALIES_TABLE_ROWS, { timeout: 120000 })
        .eq(5)
        .within(() => {
          enableJob();
          cy.get(ANOMALIES_TABLE_ENABLE_JOB_LOADER).should('be.visible');
          cy.get(ANOMALIES_TABLE_COUNT_COLUMN).should('include.text', '0');
        });

      // Checks pagination
      cy.get(ANOMALIES_TABLE_ROWS, { timeout: 120000 }).should('have.length', 10);

      // navigates to next page
      navigateToNextPage();
      cy.get(ANOMALIES_TABLE_ROWS).should('have.length', 10);

      // updates rows per page to 25 items
      setRowsPerPageTo(25);
      cy.get(ANOMALIES_TABLE_ROWS).should('have.length', 25);
    });
  });
});
