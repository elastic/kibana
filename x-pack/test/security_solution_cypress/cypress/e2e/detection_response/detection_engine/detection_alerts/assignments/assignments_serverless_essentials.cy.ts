/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { getNewRule } from '../../../../../objects/rule';
import { refreshAlertPageFilter, selectFirstPageAlerts } from '../../../../../tasks/alerts';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { login } from '../../../../../tasks/login';
import { ALERTS_URL } from '../../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import {
  alertsTableShowsAssigneesForAlert,
  updateAssigneesForFirstAlert,
  bulkRemoveAllAssignees,
  loadPageAs,
} from '../../../../../tasks/alert_assignments';

// FLAKY: https://github.com/elastic/kibana/issues/172520
describe.skip(
  'Alert user assignment - Serverless Essentials',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });

      // Login into accounts so that they got activated and visible in user profiles list
      login(ROLES.t1_analyst);
      login(ROLES.t2_analyst);
      login(ROLES.t3_analyst);
      login(ROLES.soc_manager);
      login(ROLES.detections_admin);
      login(ROLES.platform_engineer);
    });

    after(() => {
      cy.task('esArchiverUnload', 'auditbeat_multiple');
    });

    beforeEach(() => {
      loadPageAs(ALERTS_URL);
      deleteAlertsAndRules();
      createRule(getNewRule({ rule_id: 'new custom rule' }));
      waitForAlertsToPopulate();
    });

    context('Authorization / RBAC', () => {
      it('users with editing privileges should be able to update assignees', () => {
        const editors = [
          ROLES.t1_analyst,
          ROLES.t2_analyst,
          ROLES.t3_analyst,
          ROLES.rule_author,
          ROLES.soc_manager,
          ROLES.detections_admin,
          ROLES.platform_engineer,
        ];
        editors.forEach((role) => {
          loadPageAs(ALERTS_URL, role);
          waitForAlertsToPopulate();

          // Unassign alert
          selectFirstPageAlerts();
          bulkRemoveAllAssignees();
          refreshAlertPageFilter();

          updateAssigneesForFirstAlert([role]);

          // Assignees should appear in the alerts table
          alertsTableShowsAssigneesForAlert([role]);
        });
      });
    });
  }
);
