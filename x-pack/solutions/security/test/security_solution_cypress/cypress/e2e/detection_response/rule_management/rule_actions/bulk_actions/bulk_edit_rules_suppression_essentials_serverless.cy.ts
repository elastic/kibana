/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { installMockPrebuiltRulesPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { DEFINITION_DETAILS, SUPPRESS_BY_DETAILS } from '../../../../../screens/rule_details';

import {
  selectAllRules,
  goToRuleDetailsOf,
  getRulesManagementTableRows,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';

import {
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  clickSetAlertSuppressionMenuItem,
} from '../../../../../tasks/rules_bulk_actions';

import { fillAlertSuppressionFields } from '../../../../../tasks/create_new_rule';

import { getDetails } from '../../../../../tasks/rule_details';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { createRule } from '../../../../../tasks/api_calls/rules';

import { getNewRule } from '../../../../../objects/rule';

const queryRule = getNewRule({ rule_id: '1', name: 'Query rule', enabled: false });

describe(
  'Bulk Edit - Alert Suppression, Essentials Serverless tier',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
      },
    },
  },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
    });

    beforeEach(() => {
      createRule(queryRule);

      visitRulesManagementTable();
      disableAutoRefresh();
    });

    it('Set alert suppression', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickSetAlertSuppressionMenuItem();

        fillAlertSuppressionFields(['source.ip']);

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if one of the rules has been updated
        goToRuleDetailsOf(queryRule.name);
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', 'source.ip');
        });
      });
    });
  }
);
