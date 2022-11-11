/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolingLog } from '@kbn/tooling-log';
import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';

const WAIT_FOR_STATUS_INCREMENT = 1000;

export async function waitForActiveAlert({
  ruleId,
  waitMillis = 10000,
  esClient,
  log,
}: {
  ruleId: string;
  waitMillis?: number;
  esClient: Client;
  log: ToolingLog;
}): Promise<Record<string, any>> {
  if (waitMillis < 0) {
    expect().fail(`waiting for active alert for rule ${ruleId} timed out`);
  }

  const searchParams = {
    index: '.alerts-observability.apm.alerts-*',
    size: 1,
    query: {
      bool: {
        filter: [
          {
            term: {
              'kibana.alert.rule.producer': 'apm',
            },
          },
          {
            term: {
              'kibana.alert.status': 'active',
            },
          },
          {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        ],
      },
    },
  };
  const response = await esClient.search(searchParams);

  const hits = (response?.hits?.total as { value: number } | undefined)?.value ?? 0;
  if (hits > 0) {
    return response.hits.hits[0];
  }

  const message = `waitForActiveAlert(${ruleId}): got ${hits} hits.`;

  log.debug(`${message}, retrying`);

  await delay(WAIT_FOR_STATUS_INCREMENT);
  return await waitForActiveAlert({
    ruleId,
    waitMillis: waitMillis - WAIT_FOR_STATUS_INCREMENT,
    esClient,
    log,
  });
}

async function delay(millis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, millis));
}
