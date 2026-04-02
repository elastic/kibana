/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installMockPrebuiltRulesPackage } from '../../../../tasks/api_calls/prebuilt_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  createDocument,
  createIndex,
  deleteIndex,
} from '../../../../tasks/api_calls/elasticsearch';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  goToExecutionLogTab,
  getExecutionResultsTableRows,
  waitForExecutionResultsTableToBePopulated,
  openExecutionDetailsFlyout,
} from '../../../../tasks/rule_details';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import {
  EXECUTION_DETAILS_FLYOUT,
  EXECUTION_RESULTS_TABLE_CELL_STATUS,
  EXECUTION_RESULTS_TABLE_CELL_RUN_TYPE,
  EXECUTION_RESULTS_TABLE_CELL_TIMESTAMP,
  EXECUTION_RESULTS_TABLE_CELL_DURATION,
  EXECUTION_RESULTS_TABLE_CELL_ALERTS,
  EXECUTION_RESULTS_TABLE_CELL_MESSAGE,
  EXECUTION_DETAILS_FLYOUT_HEADER_STATUS,
  EXECUTION_DETAILS_FLYOUT_HEADER_RUN_TYPE,
  EXECUTION_DETAILS_FLYOUT_ALERT_COUNT,
  EXECUTION_DETAILS_FLYOUT_CANDIDATE_COUNT,
  EXECUTION_DETAILS_FLYOUT_MATCHED_INDICES,
  EXECUTION_DETAILS_FLYOUT_FROZEN_INDICES,
  EXECUTION_DETAILS_FLYOUT_GAP_DURATION,
  EXECUTION_DETAILS_FLYOUT_SCHEDULING_DELAY,
  EXECUTION_DETAILS_FLYOUT_EXECUTION_DURATION,
  EXECUTION_DETAILS_FLYOUT_SEARCH_DURATION,
  EXECUTION_DETAILS_FLYOUT_INDEX_DURATION,
} from '../../../../screens/rule_details';

// Matches hh:mm:ss:SSS (normal) or ddd:hh:mm:ss:SSS
const DURATION_FORMAT_REGEXP = /^\d{2}:\d{2}:\d{2}:\d{3}$|^\d{3}:\d{2}:\d{2}:\d{2}:\d{3}$/;

const TEST_INDEX = 'test-execution-results';

describe(
  'Execution results table',
  {
    tags: ['@ess'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'newExecutionResultsTableEnabled',
          ])}`,
        ],
      },
    },
  },
  function () {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    before(() => {
      login();
      deleteAlertsAndRules();
      deleteIndex(TEST_INDEX);
      createIndex(TEST_INDEX, {
        '@timestamp': { type: 'date' },
        host: {
          properties: {
            name: { type: 'keyword' },
          },
        },
      });
      createDocument(TEST_INDEX, {
        '@timestamp': new Date().toISOString(),
        host: { name: 'test-host' },
      });
      createRule({
        ...getCustomQueryRuleParams({ enabled: true, index: [TEST_INDEX] }),
      }).then((rule) => {
        cy.wrap(rule.body.id).as('ruleId');
      });
    });

    after(() => {
      deleteIndex(TEST_INDEX);
    });

    beforeEach(() => {
      login();
    });

    it.skip('should display real execution data after the rule executes', function () {
      visit(ruleDetailsUrl(this.ruleId));
      goToExecutionLogTab();

      waitForExecutionResultsTableToBePopulated(1);

      // Table row: verify key columns have expected values
      getExecutionResultsTableRows()
        .first()
        .within(() => {
          cy.get(EXECUTION_RESULTS_TABLE_CELL_STATUS).should('contain.text', 'Succeeded');
          cy.get(EXECUTION_RESULTS_TABLE_CELL_RUN_TYPE).should('have.text', 'Scheduled');
          cy.get(EXECUTION_RESULTS_TABLE_CELL_TIMESTAMP).should('exist');
          cy.get(EXECUTION_RESULTS_TABLE_CELL_DURATION)
            .invoke('text')
            .should('match', DURATION_FORMAT_REGEXP);
          cy.get(EXECUTION_RESULTS_TABLE_CELL_ALERTS).invoke('text').should('eq', '1');
          cy.get(EXECUTION_RESULTS_TABLE_CELL_MESSAGE).should('exist');
        });

      // Open the flyout for the first row
      openExecutionDetailsFlyout(0);

      cy.get(EXECUTION_DETAILS_FLYOUT).within(() => {
        // Header summary panel
        cy.get(EXECUTION_DETAILS_FLYOUT_HEADER_STATUS).should('contain.text', 'Succeeded');
        cy.get(EXECUTION_DETAILS_FLYOUT_HEADER_RUN_TYPE).should('have.text', 'Scheduled');

        // Alerts section
        cy.get(EXECUTION_DETAILS_FLYOUT_ALERT_COUNT).invoke('text').should('eq', '1');
        cy.get(EXECUTION_DETAILS_FLYOUT_CANDIDATE_COUNT).should('exist'); // TODO: Change to number once we start populating the field

        // Indices section
        cy.get(EXECUTION_DETAILS_FLYOUT_MATCHED_INDICES).should('exist'); // TODO: Change to number once we start populating the field
        cy.get(EXECUTION_DETAILS_FLYOUT_FROZEN_INDICES).invoke('text').should('eq', '0');

        // Execution metrics section
        cy.get(EXECUTION_DETAILS_FLYOUT_GAP_DURATION).should('have.text', '—');
        cy.get(EXECUTION_DETAILS_FLYOUT_SCHEDULING_DELAY)
          .invoke('text')
          .should('match', DURATION_FORMAT_REGEXP);
        cy.get(EXECUTION_DETAILS_FLYOUT_EXECUTION_DURATION)
          .invoke('text')
          .should('match', DURATION_FORMAT_REGEXP);

        // Duration breakdown section
        cy.get(EXECUTION_DETAILS_FLYOUT_SEARCH_DURATION)
          .invoke('text')
          .should('match', DURATION_FORMAT_REGEXP);
        cy.get(EXECUTION_DETAILS_FLYOUT_INDEX_DURATION)
          .invoke('text')
          .should('match', DURATION_FORMAT_REGEXP);
      });
    });
  }
);
