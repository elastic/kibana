/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmFields, Serializable } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export interface ServiceConfig {
  name: string;
  environment: string;
  hostName: string;
  transactions: TransactionConfig[];
}

export interface TransactionConfig {
  name: string;
  type: string;
  duration: number;
  failureRate: number;
}

export const createSyntheticRedMetricsData = async ({
  getService,
  services,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  services: ServiceConfig[];
}) => {
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await apmSynthtraceEsClient.clean();

  const from = moment().subtract(15, 'minutes');
  const to = moment();

  await apmSynthtraceEsClient.index(
    timerange(from, to)
      .interval('1m')
      .rate(10)
      .generator((timestamp) =>
        services.flatMap((serviceConfig) => {
          const instance = apm
            .service({
              name: serviceConfig.name,
              environment: serviceConfig.environment,
              agentName: 'nodejs',
            })
            .instance(`${serviceConfig.name}-instance`)
            .overrides({ 'host.name': serviceConfig.hostName });

          return serviceConfig.transactions.flatMap((txConfig) => {
            const transactions: Array<Serializable<ApmFields>> = [];

            // Create successful transactions
            const successCount = Math.round(10 * (1 - txConfig.failureRate));
            for (let i = 0; i < successCount; i++) {
              transactions.push(
                instance
                  .transaction({ transactionName: txConfig.name, transactionType: txConfig.type })
                  .timestamp(timestamp)
                  .duration(txConfig.duration)
                  .success()
              );
            }

            const failureCount = Math.round(10 * txConfig.failureRate);
            for (let i = 0; i < failureCount; i++) {
              transactions.push(
                instance
                  .transaction({ transactionName: txConfig.name, transactionType: txConfig.type })
                  .timestamp(timestamp)
                  .duration(txConfig.duration * 1.5) // Failed transactions typically take longer
                  .failure()
              );
            }

            return transactions;
          });
        })
      )
  );

  return { apmSynthtraceEsClient };
};
