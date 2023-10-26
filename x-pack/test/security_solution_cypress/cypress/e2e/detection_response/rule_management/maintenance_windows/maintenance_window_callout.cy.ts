/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH } from '@kbn/alerting-plugin/common';
import type { MaintenanceWindowCreateBody } from '@kbn/alerting-plugin/common';
import type { AsApiContract } from '@kbn/alerting-plugin/server/routes/lib';
import { cleanKibana } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';

describe(
  'Maintenance window callout on Rule Management page',
  { tags: ['@ess', '@serverless'] },
  () => {
    let maintenanceWindowId = '';

    before(() => {
      cleanKibana();
    });

    beforeEach(() => {
      login();

      const body: AsApiContract<MaintenanceWindowCreateBody> = {
        title: 'My maintenance window',
        duration: 60000, // 1 minute
        category_ids: ['securitySolution'],
        r_rule: {
          dtstart: new Date().toISOString(),
          tzid: 'Europe/Amsterdam',
          freq: 0,
          count: 1,
        },
      };

      // Create a test maintenance window
      cy.request({
        method: 'POST',
        url: INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
        headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
        body,
      }).then((response) => {
        maintenanceWindowId = response.body.id;
      });
    });

    afterEach(() => {
      // Delete a test maintenance window
      if (maintenanceWindowId) {
        cy.request({
          method: 'DELETE',
          url: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/${maintenanceWindowId}`,
          headers: {
            'kbn-xsrf': 'cypress-creds',
            'x-elastic-internal-origin': 'security-solution',
          },
        }).then(() => {
          maintenanceWindowId = '';
        });
      }
    });

    it('Displays the callout when there are running maintenance windows', () => {
      visit(RULES_MANAGEMENT_URL);

      cy.contains('A maintenance window is running for Security rules');
    });
  }
);
