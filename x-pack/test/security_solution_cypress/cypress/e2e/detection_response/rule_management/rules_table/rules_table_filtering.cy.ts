/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../../../tasks/common';
import { login, visitSecurityDetectionRulesPage } from '../../../../tasks/login';
import {
  expectRulesWithExecutionStatus,
  filterByExecutionStatus,
  expectNumberOfRulesShownOnPage,
} from '../../../../tasks/rule_filters';

import {
  expectManagementTableRules,
  filterByTags,
  unselectTags,
} from '../../../../tasks/alerts_detection_rules';

import { createRule, waitForRulesToFinishExecution } from '../../../../tasks/api_calls/rules';
import {
  deleteIndex,
  createIndex,
  createDocument,
} from '../../../../tasks/api_calls/elasticsearch';
import { disableAutoRefresh } from '../../../../tasks/alerts_detection_rules';
import { getNewRule } from '../../../../objects/rule';

// TODO: https://github.com/elastic/kibana/issues/161540
// Flaky in serverless tests
describe('Rules table: filtering', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
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

  // TODO: https://github.com/elastic/kibana/issues/161540
  describe.skip('Last response filter', () => {
    // Flaky in serverless tests
    // @brokenInServerless tag is not working so a skip was needed
    it('Filters rules by last response', { tags: ['@brokenInServerless'] }, function () {
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
          enabled: true,
        })
      );

      createRule(
        getNewRule({
          name: 'Warning rule',
          rule_id: 'warning_rule',
          index: ['non_existent_index'],
          enabled: true,
        })
      );

      createRule(
        getNewRule({
          name: 'Failed rule',
          rule_id: 'failed_rule',
          index: ['test_index'],
          // Setting a crazy large "Additional look-back time" to force a failure
          from: 'now-9007199254746990s',
          enabled: true,
        })
      );

      waitForRulesToFinishExecution(['successful_rule', 'warning_rule', 'failed_rule'], new Date());

      visitSecurityDetectionRulesPage();
      disableAutoRefresh();

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

  describe('Tags filter', () => {
    beforeEach(() => {
      createRule(
        getNewRule({
          name: 'Rule 1',
          tags: [],
        })
      );

      createRule(
        getNewRule({
          name: 'Rule 2',
          tags: ['simpleTag'],
        })
      );

      createRule(
        getNewRule({
          name: 'Rule 3',
          tags: ['category:tag'],
        })
      );
    });

    it('filter by different tags', () => {
      visitSecurityDetectionRulesPage();

      expectManagementTableRules(['Rule 1', 'Rule 2', 'Rule 3']);

      filterByTags(['simpleTag']);

      expectManagementTableRules(['Rule 2']);

      unselectTags();

      filterByTags(['category:tag']);

      expectManagementTableRules(['Rule 3']);
    });
  });
});
