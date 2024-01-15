/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
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

describe('Rules table: filtering', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
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

      visitRulesManagementTable();
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
      visitRulesManagementTable();

      expectManagementTableRules(['Rule 1', 'Rule 2', 'Rule 3']);

      filterByTags(['simpleTag']);

      expectManagementTableRules(['Rule 2']);

      unselectTags();

      filterByTags(['category:tag']);

      expectManagementTableRules(['Rule 3']);
    });
  });
});
