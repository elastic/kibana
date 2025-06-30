/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export const createSyntheticApmData = async ({
  getService,
  serviceName = 'my-service',
  environment = 'production',
  language = 'go',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  serviceName?: string;
  environment?: string;
  language?: string;
}) => {
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await apmSynthtraceEsClient.clean();

  const instance = apm
    .service({ name: serviceName, environment, agentName: language })
    .instance('my-instance');

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
      ])
  );

  return { apmSynthtraceEsClient };
};
