/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { togglePrivilegedUserMonitoring } from '../../../tasks/entity_analytics/enable_privmon';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL } from '../../../urls/navigation';

describe(
  'Privileged User Monitoring - Page',
  {
    tags: ['@ess'],
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
    });

    beforeEach(() => {
      login();

      togglePrivilegedUserMonitoring();
    });

    afterEach(() => {
      togglePrivilegedUserMonitoring();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'all_users' });
    });

    it('renders page as expected', () => {
      visit(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL);

      cy.get('[data-test-subj="privilegedUserMonitoringOnboardingPanel"]').should(
        'contain.text',
        'Privileged user monitoring'
      );
    });
  }
);
