/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export const createSyntheticApmData = async ({
  getService,
  serviceName = 'my-service',
  environment = 'production',
  language = 'go',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  serviceName?: string | string[];
  environment?: string;
  language?: string;
}) => {
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await apmSynthtraceEsClient.clean();

  const serviceNames = Array.isArray(serviceName) ? serviceName : [serviceName];

  await Promise.all(
    serviceNames.map(async (name) => {
      const instance = apm
        .service({ name, environment, agentName: language })
        .instance(`${name}-instance`);

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
                instance
                  .error({ message: 'error message', type: 'Sample Type' })
                  .timestamp(timestamp)
              ),
          ])
      );
    })
  );

  return { apmSynthtraceEsClient };
};

export const createSyntheticApmDataWithDependency = async ({
  getService,
  serviceName = 'my-service',
  environment = 'production',
  language = 'nodejs',
  dependencyResource,
  spanType = 'db',
  spanSubtype = 'elasticsearch',
  spanName = 'GET /dep',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  serviceName?: string;
  environment?: string;
  language?: string;
  dependencyResource: string;
  spanType?: string;
  spanSubtype?: string;
  spanName?: string;
}) => {
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await apmSynthtraceEsClient.clean();

  const instance = apm
    .service({ name: serviceName, environment, agentName: language })
    .instance('instance-a');

  await apmSynthtraceEsClient.index(
    timerange(moment().subtract(15, 'minutes'), moment())
      .interval('1m')
      .rate(5)
      .generator((timestamp) =>
        instance
          .transaction({ transactionName: 'GET /dep' })
          .timestamp(timestamp)
          .duration(200)
          .success()
          .children(
            instance
              .span({
                spanName,
                spanType,
                spanSubtype,
              })
              .destination(dependencyResource)
              .timestamp(timestamp)
              .duration(100)
              .success()
          )
      )
  );

  return { apmSynthtraceEsClient };
};
