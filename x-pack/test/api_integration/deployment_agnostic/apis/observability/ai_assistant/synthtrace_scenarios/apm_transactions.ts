/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ToolingLog } from '@kbn/tooling-log';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const indexSyntheticApmTransactions = async ({
  apmSynthtraceEsClient,
  logger,
  serviceName = 'my-service',
  environment = 'production',
  language = 'go',
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  logger: ToolingLog;
  serviceName?: string;
  environment?: string;
  language?: string;
}) => {
  await apmSynthtraceEsClient.clean();

  const instance = apm.service(serviceName, environment, language).instance('my-instance');

  logger.debug('Indexing synthtrace data');

  await apmSynthtraceEsClient.index(
    timerange(moment().subtract(15, 'minutes'), moment())
      .interval('1m')
      .rate(10)
      .generator((timestamp) => [
        instance
          .transaction('GET /api')
          .timestamp(timestamp)
          .duration(50)
          .failure()
          .errors(
            instance.error({ message: 'error message', type: 'Sample Type' }).timestamp(timestamp)
          ),
        instance.transaction('GET /api').timestamp(timestamp).duration(50).outcome('success'),
      ])
  );
};
