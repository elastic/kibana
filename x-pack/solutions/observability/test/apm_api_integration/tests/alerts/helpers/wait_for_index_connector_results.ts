/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { retryForSuccess } from '@kbn/ftr-common-functional-services';
import { APM_ACTION_VARIABLE_INDEX } from './constants';

const debugLog = ToolingLog.bind(ToolingLog, { level: 'debug', writeTo: process.stdout });

async function getIndexConnectorResults(es: Client) {
  const res = await es.search({ index: APM_ACTION_VARIABLE_INDEX });
  return res.hits.hits.map((hit) => hit._source) as Array<Record<string, string>>;
}

export async function waitForIndexConnectorResults({
  es,
  minCount = 1,
}: {
  es: Client;
  minCount?: number;
}) {
  return await retryForSuccess(new debugLog({ context: 'waitForIndexConnectorResults' }), {
    timeout: 20_000,
    methodName: 'waitForIndexConnectorResults',
    block: async () => {
      const results = await getIndexConnectorResults(es);
      if (results.length < minCount)
        throw new Error(`Expected ${minCount} but got ${results.length} results`);

      return results;
    },
    retryCount: 10,
  });
}
