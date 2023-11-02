/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ValuesType } from 'utility-types';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createServiceGroupApi, deleteAllServiceGroups } from '../service_groups_api_methods';
import { createServiceTransactionMetricsDocs } from './es_utils';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');
  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when(
    'Display overflow bucket in Service Groups',
    { config: 'basic', archives: [] },
    () => {
      const indexName = 'metrics-apm.service_transaction.1m-default';
      const start = '2023-06-21T06:50:15.910Z';
      const end = '2023-06-21T06:59:15.910Z';
      const startTime = new Date(start).getTime() + 1000;
      const OVERFLOW_SERVICE_NAME = '_other';
      let serviceGroupId: string;

      after(async () => {
        await deleteAllServiceGroups(apmApiClient);
        synthtraceEsClient.clean();
      });

      before(async () => {
        await generateData({ start, end, synthtraceEsClient });

        const docs = [
          createServiceTransactionMetricsDocs({
            time: startTime,
            service: {
              name: OVERFLOW_SERVICE_NAME,
            },
            overflowCount: 13,
          }),
        ];

        const bulkActions = docs.reduce(
          (prev, doc) => {
            return [...prev, { create: { _index: indexName } }, doc];
          },
          [] as Array<
            | {
                create: {
                  _index: string;
                };
              }
            | ValuesType<typeof docs>
          >
        );

        await es.bulk({
          body: bulkActions,
          refresh: 'wait_for',
        });

        const serviceGroup = {
          groupName: 'overflowGroup',
          kuery: 'service.name: synth-go or service.name: synth-java',
        };
        const createResponse = await createServiceGroupApi({ apmApiClient, ...serviceGroup });
        expect(createResponse.status).to.be(200);
        serviceGroupId = createResponse.body.id;
      });

      it('get the overflow bucket even though its not added explicitly in the Service Group', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services`,
          params: {
            query: {
              start,
              end,
              environment: ENVIRONMENT_ALL.value,
              kuery: '',
              serviceGroup: serviceGroupId,
              probability: 1,
              documentType: ApmDocumentType.ServiceTransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
              useDurationSummary: true,
            },
          },
        });

        const overflowBucket = response.body.items.find(
          (service) => service.serviceName === OVERFLOW_SERVICE_NAME
        );
        expect(overflowBucket?.serviceName).to.equal(OVERFLOW_SERVICE_NAME);
      });
    }
  );
}
