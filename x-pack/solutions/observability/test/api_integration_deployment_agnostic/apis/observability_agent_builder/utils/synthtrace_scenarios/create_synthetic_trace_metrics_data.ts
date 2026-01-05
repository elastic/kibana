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
  containerId?: string;
  kubernetesPodName?: string;
  transactions: TransactionConfig[];
  /** Custom labels to add to all transactions for this service */
  labels?: Record<string, string>;
}

export interface TransactionConfig {
  name: string;
  type: string;
  duration: number;
  failureRate: number;
  /** Custom labels to add to this specific transaction */
  labels?: Record<string, string>;
}

export const createSyntheticTraceMetricsData = async ({
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
          // Build overrides object with host.name and optional container.id/kubernetes.pod.name
          const overrides: Record<string, string | undefined> = {
            'host.name': serviceConfig.hostName,
          };

          if (serviceConfig.containerId) {
            overrides['container.id'] = serviceConfig.containerId;
          }

          if (serviceConfig.kubernetesPodName) {
            overrides['kubernetes.pod.name'] = serviceConfig.kubernetesPodName;
          }

          // Add service-level labels
          if (serviceConfig.labels) {
            for (const [key, value] of Object.entries(serviceConfig.labels)) {
              overrides[`labels.${key}`] = value;
            }
          }

          const instance = apm
            .service({
              name: serviceConfig.name,
              environment: serviceConfig.environment,
              agentName: 'nodejs',
            })
            .instance(`${serviceConfig.name}-instance`)
            .overrides(overrides);

          return serviceConfig.transactions.flatMap((txConfig) => {
            const transactions: Array<Serializable<ApmFields>> = [];

            // Build transaction-level overrides for labels
            const txOverrides: Record<string, string> = {};
            if (txConfig.labels) {
              for (const [key, value] of Object.entries(txConfig.labels)) {
                txOverrides[`labels.${key}`] = value;
              }
            }

            // Create successful transactions
            const successCount = Math.round(10 * (1 - txConfig.failureRate));
            for (let i = 0; i < successCount; i++) {
              let tx = instance
                .transaction({ transactionName: txConfig.name, transactionType: txConfig.type })
                .timestamp(timestamp)
                .duration(txConfig.duration)
                .success();

              if (Object.keys(txOverrides).length > 0) {
                tx = tx.overrides(txOverrides);
              }

              transactions.push(tx);
            }

            // Create failed transactions
            const failureCount = Math.round(10 * txConfig.failureRate);
            for (let i = 0; i < failureCount; i++) {
              let tx = instance
                .transaction({ transactionName: txConfig.name, transactionType: txConfig.type })
                .timestamp(timestamp)
                .duration(txConfig.duration * 1.5)
                .failure();

              if (Object.keys(txOverrides).length > 0) {
                tx = tx.overrides(txOverrides);
              }

              transactions.push(tx);
            }

            return transactions;
          });
        })
      )
  );

  return { apmSynthtraceEsClient };
};
