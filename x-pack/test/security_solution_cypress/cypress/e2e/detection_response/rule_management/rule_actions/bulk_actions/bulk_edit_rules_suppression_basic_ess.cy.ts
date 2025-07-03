/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { ALERT_SUPPRESSION_RULE_BULK_MENU_ITEM } from '../../../../../screens/rules_bulk_actions';
import { TOOLTIP } from '../../../../../screens/common';

import {
  selectAllRules,
  getRulesManagementTableRows,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';
import { clickBulkActionsButton } from '../../../../../tasks/rules_bulk_actions';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { startBasicLicense } from '../../../../../tasks/api_calls/licensing';
import { createRule } from '../../../../../tasks/api_calls/rules';

import { getNewRule } from '../../../../../objects/rule';

const queryRule = getNewRule({ rule_id: '1', name: 'Query rule', enabled: false });

describe('Bulk Edit - Alert Suppression, Basic License', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    startBasicLicense();
  });

  beforeEach(() => {
    createRule(queryRule);

    visitRulesManagementTable();
    disableAutoRefresh();
  });

  it('bulk suppression is disabled and and upselling message is shown on hover', () => {
    getRulesManagementTableRows().then((rows) => {
      selectAllRules();
      clickBulkActionsButton();

      cy.get(ALERT_SUPPRESSION_RULE_BULK_MENU_ITEM).should('be.disabled');
      cy.get(`${ALERT_SUPPRESSION_RULE_BULK_MENU_ITEM}`).parent().trigger('mouseover');
      // Platinum license is required for this option to be enabled
      cy.get(TOOLTIP).contains('Platinum license');
    });
  });
});
