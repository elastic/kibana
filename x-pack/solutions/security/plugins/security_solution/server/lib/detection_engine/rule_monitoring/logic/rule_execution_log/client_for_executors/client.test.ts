/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ruleMonitoringServiceMock } from '@kbn/alerting-plugin/server/monitoring/rule_monitoring_service.mock';
import { publicRuleResultServiceMock } from '@kbn/alerting-plugin/server/monitoring/rule_result_service.mock';
import { LogLevelSetting } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { IEventLogWriter } from '../event_log/event_log_writer';
import type { RuleExecutionContext } from './client_interface';
import { createRuleExecutionLogClientForExecutors } from './client';

const createEventLogWriterMock = (): jest.Mocked<IEventLogWriter> => ({
  logMessage: jest.fn(),
  logStatusChange: jest.fn(),
  logExecutionMetrics: jest.fn(),
});

const context: RuleExecutionContext = {
  executionId: 'execution-id',
  ruleId: 'rule-id',
  ruleUuid: 'rule-uuid',
  ruleName: 'Test rule',
  ruleRevision: 1,
  ruleType: 'siem.queryRule',
  spaceId: 'default',
};

const GAP_ERROR =
  '5 minutes (300000ms) were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances';
const ESQL_ABORT_ERROR_WITH_PREFIX =
  'Error while performing ES|QL search: ES|QL search has been aborted due to cancelled execution';
const ESQL_ABORT_ERROR = 'ES|QL search has been aborted due to cancelled execution';
const SEARCH_ABORT_ERROR_FROM_SINGLE_SEARCH_AFTER =
  'Error searching events\nError: Error: Search has been aborted due to cancelled execution';
const SEARCH_ABORT_ERROR_FROM_SEARCH_AFTER_BULK_CREATE =
  '1: Error extracting/processing events or creating alerts\nError: Error: Search has been aborted due to cancelled execution';

describe('createRuleExecutionLogClientForExecutors', () => {
  let ruleResultService: ReturnType<typeof publicRuleResultServiceMock.create>;

  const createClient = () => {
    ruleResultService = publicRuleResultServiceMock.create();
    return createRuleExecutionLogClientForExecutors(
      { extendedLogging: { isEnabled: false, minLevel: LogLevelSetting.off } },
      createEventLogWriterMock(),
      loggingSystemMock.createLogger(),
      context,
      ruleMonitoringServiceMock.create(),
      ruleResultService
    );
  };

  describe('close', () => {
    it('reports a run as a user error when every error was flagged by the caller', async () => {
      const client = createClient();

      client.error(GAP_ERROR, { userError: true });
      await client.close();

      expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(GAP_ERROR, true);
    });

    it('reports a run as a user error when every error is a recognized user error message', async () => {
      const client = createClient();

      client.error('index_not_found_exception: no such index [logs-*]');
      await client.close();

      expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(
        'index_not_found_exception: no such index [logs-*]',
        true
      );
    });

    it('reports an ES|QL rule run cancelled by the rule timeout as a user error', async () => {
      const client = createClient();

      // What an ES|QL rule logs when Task Manager cancels the run while the ES|QL request is open:
      // the gap error from the rule type wrapper, the error logged by performEsqlRequest, and the
      // error returned by the executor and logged again by the rule type wrapper.
      client.error(GAP_ERROR, { userError: true });
      client.error(ESQL_ABORT_ERROR_WITH_PREFIX);
      client.error(ESQL_ABORT_ERROR);
      await client.close();

      expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(
        [GAP_ERROR, ESQL_ABORT_ERROR_WITH_PREFIX, ESQL_ABORT_ERROR].join(', '),
        true
      );
    });

    it('reports a custom query rule run cancelled by the rule timeout as a user error', async () => {
      const client = createClient();

      // What a custom query rule logs for an aborted search: singleSearchAfter logs the exception,
      // then searchAfterAndBulkCreate logs it again with its own prefix.
      client.error(SEARCH_ABORT_ERROR_FROM_SINGLE_SEARCH_AFTER);
      client.error(SEARCH_ABORT_ERROR_FROM_SEARCH_AFTER_BULK_CREATE);
      await client.close();

      expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(
        [
          SEARCH_ABORT_ERROR_FROM_SINGLE_SEARCH_AFTER,
          SEARCH_ABORT_ERROR_FROM_SEARCH_AFTER_BULK_CREATE,
        ].join(', '),
        true
      );
    });

    it('does not report a run as a user error when it also contains an unrecognized error', async () => {
      const client = createClient();

      client.error(GAP_ERROR, { userError: true });
      client.error(ESQL_ABORT_ERROR_WITH_PREFIX);
      client.error(ESQL_ABORT_ERROR);
      client.error('Fatal server error');
      await client.close();

      expect(ruleResultService.addLastRunError).toHaveBeenCalledWith(
        [GAP_ERROR, ESQL_ABORT_ERROR_WITH_PREFIX, ESQL_ABORT_ERROR, 'Fatal server error'].join(
          ', '
        ),
        false
      );
    });

    it('does not report a bare ES client request timeout as a user error', async () => {
      const client = createClient();

      client.error('Request timed out');
      await client.close();

      expect(ruleResultService.addLastRunError).toHaveBeenCalledWith('Request timed out', false);
    });

    it('does not report an error to the rule result service when the run succeeded', async () => {
      const client = createClient();

      client.warn('Some warning');
      await client.close();

      expect(ruleResultService.addLastRunError).not.toHaveBeenCalled();
      expect(ruleResultService.addLastRunWarning).toHaveBeenCalledWith('Some warning');
    });
  });
});
