/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ONBOARDING_CALLOUT } from '../../../screens/privileged_user_monitoring';
import { cleanFleet } from '../../../tasks/api_calls/fleet';
import {
  clickOktaCard,
  togglePrivilegedUserMonitoring,
} from '../../../tasks/entity_analytics/privmon';
import { installIntegration } from '../../../tasks/integrations';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { deletePrivMonEngine } from '../../../tasks/privileged_user_monitoring';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL } from '../../../urls/navigation';

// FLAKY: https://github.com/elastic/kibana/issues/236985
// FLAKY: https://github.com/elastic/kibana/issues/236986
describe.skip(
  'Privileged User Monitoring - Integrations onboarding',
  {
    tags: ['@ess'],
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'linux_process' });
      deletePrivMonEngine(); // Just in case another test left it behind
    });

    beforeEach(() => {
      login();
      togglePrivilegedUserMonitoring();
    });

    afterEach(() => {
      togglePrivilegedUserMonitoring();
      deletePrivMonEngine();
      cleanFleet();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'linux_process' });
    });

    it('should install okta integration and display the dashboard when opening privileged user monitoring page', () => {
      visit(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL);

      clickOktaCard();
      installIntegration();

      visit(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_URL);
      cy.get(ONBOARDING_CALLOUT).should('contain.text', 'Privileged user monitoring set up');
    });
  }
);
