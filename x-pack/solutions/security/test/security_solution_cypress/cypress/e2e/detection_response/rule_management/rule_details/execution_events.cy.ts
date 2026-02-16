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
import { waitForTheRuleToBeExecuted } from '../../../../tasks/rule_details';
import {
  getExecutionEventsTableRows,
  filterExecutionEventsByMessage,
  filterExecutionEventsByLogLevel,
  filterExecutionEventsByEventType,
  clearExecutionEventsMessageFilter,
  assertAllEventsHaveLogLevel,
  assertAllEventsHaveType,
  assertAllEventsHaveTimestamp,
  assertAllEventsHaveMessageContaining,
  expandAllRows,
  assertEventsAreSortedByTimestamp,
} from '../../../../tasks/execution_events';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import {
  EXECUTION_EVENTS_TABLE,
  EXECUTION_EVENTS_DATE_PICKER,
  EXECUTION_EVENTS_TIMESTAMP_COLUMN,
} from '../../../../screens/execution_events';
import { enableExtendedRuleExecutionLogging } from '../../../../tasks/api_calls/kibana_advanced_settings';
import { setEndDate, setStartDate, showStartEndDate } from '../../../../tasks/date_picker';

describe(
  'Execution events table',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'extendedRuleExecutionLoggingEnabled',
          ])}`,
        ],
      },
    },
  },
  function () {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      enableExtendedRuleExecutionLogging();

      createRule({
        ...getCustomQueryRuleParams({
          enabled: true,
        }),
      }).then((rule) => {
        visit(ruleDetailsUrl(rule.body.id, 'execution_events'));
      });

      waitForTheRuleToBeExecuted();
    });

    it('should display the execution events table', function () {
      cy.get(EXECUTION_EVENTS_TABLE).should('be.visible');
    });

    describe('Filtering', () => {
      it('should filter by event message', function () {
        // Search for a term that should not match any events
        filterExecutionEventsByMessage('non-existent-term-12345');
        // Verify that table is empty
        getExecutionEventsTableRows().should('have.length', 0);
        clearExecutionEventsMessageFilter();

        // Search for a term that should match some events
        filterExecutionEventsByMessage('completed successfully');
        expandAllRows();
        // Verify that all events contain the message
        assertAllEventsHaveMessageContaining('completed successfully');
      });

      it('should filter by log level', function () {
        filterExecutionEventsByLogLevel('DEBUG');
        assertAllEventsHaveLogLevel('DEBUG');
      });

      it('should filter by event type', function () {
        filterExecutionEventsByEventType('Status');
        assertAllEventsHaveType('Status');
      });

      it('should filter by date range', function () {
        // Get the timestamp of the first row and use it for filtering
        getExecutionEventsTableRows()
          .first()
          .find(EXECUTION_EVENTS_TIMESTAMP_COLUMN)
          .invoke('text')
          .then((timestamp) => {
            // Plug the timestamp into the date picker as both start and end date
            showStartEndDate(EXECUTION_EVENTS_DATE_PICKER);
            setStartDate(timestamp, EXECUTION_EVENTS_DATE_PICKER);
            setEndDate(timestamp, EXECUTION_EVENTS_DATE_PICKER);

            // Check that only events with the this timestamp are displayed
            assertAllEventsHaveTimestamp(timestamp);
          });
      });
    });

    describe('Sorting', () => {
      it('should sort by timestamp', function () {
        cy.get(`${EXECUTION_EVENTS_TABLE} [role="columnheader"]`).contains('Timestamp').click();
        assertEventsAreSortedByTimestamp('desc');

        cy.get(`${EXECUTION_EVENTS_TABLE} [role="columnheader"]`).contains('Timestamp').click();
        assertEventsAreSortedByTimestamp('asc');
      });
    });
  }
);
