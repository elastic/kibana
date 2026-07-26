/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installMockPrebuiltRulesPackage } from '../../../../tasks/api_calls/prebuilt_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { goToExecutionLogTab, getBackfillsTableRows } from '../../../../tasks/rule_details';
import { getNewRule } from '../../../../objects/rule';
import {
  RULE_BACKFILLS_INFO_HEADEAR,
  RULE_BACKFILLS_COLUMN_ERROR,
  RULE_BACKFILLS_COLUMN_PENDING,
  RULE_BACKFILLS_COLUMN_RUNNING,
  RULE_BACKFILLS_COLUMN_COMPLETED,
  RULE_BACKFILLS_COLUMN_TOTAL,
  RULE_BACKFILLS_DELETE_BUTTON,
  RULE_BACKFILLS_DELETE_MODAL,
  RULE_BACKFILL_DELETE_MODAL_CONFIRM_BUTTON,
} from '../../../../screens/rule_details';
import {
  interceptFindBackfills,
  interceptDeleteBackfill,
  FIRST_BACKFILL_ID,
} from '../../../../tasks/api_calls/backfill';

describe(
  'Backfill groups',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  function () {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    before(() => {
      login();
      deleteAlertsAndRules();
      createRule(getNewRule()).then((rule) => {
        cy.wrap(rule.body.id).as('ruleId');
      });
    });

    it('should show backfill groups', function () {
      visit(ruleDetailsUrl(this.ruleId, 'alerts'));
      waitForAlertsToPopulate();
      interceptFindBackfills();
      goToExecutionLogTab();

      cy.get(RULE_BACKFILLS_INFO_HEADEAR).contains('Manual/Gap fill tasks');
      getBackfillsTableRows().should('have.length', 2);
      getBackfillsTableRows().eq(0).contains('Pending');
      getBackfillsTableRows().eq(0).find(RULE_BACKFILLS_COLUMN_ERROR).contains('1');
      getBackfillsTableRows().eq(0).find(RULE_BACKFILLS_COLUMN_PENDING).contains('1');
      getBackfillsTableRows().eq(0).find(RULE_BACKFILLS_COLUMN_RUNNING).contains('0');
      getBackfillsTableRows().eq(0).find(RULE_BACKFILLS_COLUMN_COMPLETED).contains('2');
      getBackfillsTableRows().eq(0).find(RULE_BACKFILLS_COLUMN_TOTAL).contains('4');

      getBackfillsTableRows().eq(1).contains('Running');
      getBackfillsTableRows().eq(1).find(RULE_BACKFILLS_COLUMN_ERROR).contains('0');
      getBackfillsTableRows().eq(1).find(RULE_BACKFILLS_COLUMN_PENDING).contains('0');
      getBackfillsTableRows().eq(1).find(RULE_BACKFILLS_COLUMN_RUNNING).contains('1');
      getBackfillsTableRows().eq(1).find(RULE_BACKFILLS_COLUMN_COMPLETED).contains('0');
      getBackfillsTableRows().eq(1).find(RULE_BACKFILLS_COLUMN_TOTAL).contains('1');

      getBackfillsTableRows().eq(0).find(RULE_BACKFILLS_DELETE_BUTTON).click();

      cy.get(RULE_BACKFILLS_DELETE_MODAL).contains('Stop this rule run');
      interceptDeleteBackfill(FIRST_BACKFILL_ID, 'deleteBackfill');
      cy.get(RULE_BACKFILL_DELETE_MODAL_CONFIRM_BUTTON).click();
      cy.wait('@deleteBackfill');
      cy.get(TOASTER).contains('Rule run stopped');
    });
  }
);
