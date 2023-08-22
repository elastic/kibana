/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import pRetry from 'p-retry';
import { ToolingLog } from '@kbn/tooling-log';
import { getActiveApmAlerts } from './alerting_api_helper';

export function waitForActiveApmAlert({
  ruleId,
  esClient,
  log,
}: {
  ruleId: string;
  waitMillis?: number;
  esClient: Client;
  log: ToolingLog;
}): Promise<Record<string, any>> {
  log.debug(`Wait for the rule ${ruleId} to be active`);
  return pRetry(
    async () => {
      const activeApmAlerts = await getActiveApmAlerts({ ruleId, esClient });

      if (activeApmAlerts.length === 0) {
        log.debug(`No active alert found for rule ${ruleId}`);
        throw new Error(`No active alert found for rule ${ruleId}`);
      }
      log.debug(`Get active alert for the rule ${ruleId}`);

      return activeApmAlerts[0];
    },
    {
      retries: 10,
      factor: 1.5,
    }
  );
}
