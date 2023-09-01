/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../../tags';

import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../../tasks/login';
import {
  expectRulesWithExecutionStatus,
  filterByExecutionStatus,
  expectNumberOfRulesShownOnPage,
} from '../../../../tasks/rule_filters';

import { SECURITY_DETECTIONS_RULES_URL } from '../../../../urls/navigation';

import { waitForRulesTableToBeLoaded } from '../../../../tasks/alerts_detection_rules';

import { createRule, waitForRulesToFinishExecution } from '../../../../tasks/api_calls/rules';
import {
  deleteIndex,
  createIndex,
  createDocument,
} from '../../../../tasks/api_calls/elasticsearch';

import { getNewRule } from '../../../../objects/rule';

describe('Rules table: filtering', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    cy.task('esArchiverResetKibana');
  });

  describe('Last response filter', () => {
    it('Filters rules by last response', function () {
      deleteIndex('test_index');

      createIndex('test_index', {
        '@timestamp': {
          type: 'date',
        },
      });

      createDocument('test_index', {});

      createRule(
        getNewRule({
          name: 'Successful rule',
          rule_id: 'successful_rule',
          index: ['test_index'],
        })
      );

      createRule(
        getNewRule({
          name: 'Warning rule',
          rule_id: 'warning_rule',
          index: ['non_existent_index'],
        })
      );

      createRule(
        getNewRule({
          name: 'Failed rule',
          rule_id: 'failed_rule',
          index: ['test_index'],
          // Setting a crazy large "Additional look-back time" to force a failure
          from: 'now-9007199254746990s',
        })
      );

      waitForRulesToFinishExecution(['successful_rule', 'warning_rule', 'failed_rule'], new Date());

      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);

      waitForRulesTableToBeLoaded();

      // Initial table state - before filtering by status
      expectNumberOfRulesShownOnPage(3);
      expectRulesWithExecutionStatus(1, 'Succeeded');
      expectRulesWithExecutionStatus(1, 'Warning');
      expectRulesWithExecutionStatus(1, 'Failed');

      // Table state after filtering by Succeeded status
      filterByExecutionStatus('Succeeded');
      expectNumberOfRulesShownOnPage(1);
      expectRulesWithExecutionStatus(1, 'Succeeded');

      // Table state after filtering by Warning status
      filterByExecutionStatus('Warning');
      expectNumberOfRulesShownOnPage(1);
      expectRulesWithExecutionStatus(1, 'Warning');

      // Table state after filtering by Failed status
      filterByExecutionStatus('Failed');
      expectNumberOfRulesShownOnPage(1);
      expectRulesWithExecutionStatus(1, 'Failed');
    });
  });
});
