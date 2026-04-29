/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { ConsumerExecutionMetrics } from '@kbn/alerting-plugin/server/types';
import { waitForEventLogExecuteComplete } from './wait_for_event_log_execute_complete';

/**
 * Reads security rule execution metrics from the most recent alerting `execute` event
 */
export async function getLatestSecurityRuleExecutionMetricsFromEventLog(
  es: Client,
  log: ToolingLog,
  /**
   * Rule's SO id
   */
  ruleId: string,
  options?: { totalExecutions?: number }
): Promise<Partial<ConsumerExecutionMetrics>> {
  await waitForEventLogExecuteComplete(es, log, ruleId, options?.totalExecutions);

  const response = await es.search({
    index: '.kibana-event-log*',
    size: 1,
    sort: [{ '@timestamp': 'desc' }],
    query: {
      bool: {
        filter: [
          { match_phrase: { 'event.provider': 'alerting' } },
          { match_phrase: { 'event.action': 'execute' } },
          { match_phrase: { 'rule.id': ruleId } },
        ],
      },
    },
  });

  const source = response.hits.hits[0]?._source;
  const metrics = get(source, 'kibana.alert.rule.execution.metrics') as
    | Partial<ConsumerExecutionMetrics>
    | undefined;

  if (metrics === undefined || Object.keys(metrics).length === 0) {
    log.warning(
      `No consumer execution metrics on latest execute event for rule ${ruleId}; hit count=${response.hits.hits.length}`
    );
  }

  return metrics ?? {};
}
