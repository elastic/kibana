/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { keyBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const goServiceName = 'opbeans-go';
  const nodeServiceName = 'opbeans-node';

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/get_agents_per_service'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/get_agents_per_service',
      params: {
        query: {
          probability: 1,
          environment: 'ENVIRONMENT_ALL',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  registry.when('Agent explorer when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles empty state', async () => {
      const { status, body } = await callApi();

      expect(status).to.be(200);
      expect(body.items).to.be.empty();
    });
  });

  registry.when('Agent explorer', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded', () => {
      before(async () => {
        const serviceGo = apm
          .service({
            name: goServiceName,
            environment: 'production',
            agentName: 'go',
          })
          .instance('instance-go')
          .defaults({
            'agent.version': '5.1.2',
            'service.language.name': 'go',
          });

        const serviceNodeStaging = apm
          .service({
            name: nodeServiceName,
            environment: 'staging',
            agentName: 'nodejs',
          })
          .instance('instance-node-staging')
          .defaults({
            'agent.version': '1.0.0',
            'service.language.name': 'javascript',
          });

        const serviceNodeDev = apm
          .service({
            name: nodeServiceName,
            environment: 'dev',
            agentName: 'nodejs',
          })
          .instance('instance-node-dev')
          .defaults({
            'agent.version': '1.0.3',
            'service.language.name': 'javascript',
          });

        await synthtraceEsClient.index([
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceGo
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceNodeStaging
                .transaction({ transactionName: 'GET /api/users/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('5m')
            .rate(1)
            .generator((timestamp) =>
              serviceNodeDev
                .transaction({ transactionName: 'GET /api/users/list' })
                .duration(2000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      it('returns correct agents information', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);
        expect(body.items).to.have.length(2);

        const agents = keyBy(body.items, 'serviceName');

        const goAgent = agents[goServiceName];
        expect(goAgent?.environments).to.have.length(1);
        expect(goAgent?.environments).to.contain('production');
        expect(goAgent?.agentName).to.be('go');
        expect(goAgent?.agentVersion).to.contain('5.1.2');
        expect(goAgent?.agentDocsPageUrl).to.be(
          'https://www.elastic.co/guide/en/apm/agent/go/current/'
        );

        const nodeAgent = agents[nodeServiceName];
        expect(nodeAgent?.environments).to.have.length(2);
        expect(nodeAgent?.environments).to.contain('staging');
        expect(nodeAgent?.environments).to.contain('dev');
        expect(nodeAgent?.agentName).to.be('nodejs');
        expect(nodeAgent?.agentVersion).to.contain('1.0.0');
        expect(nodeAgent?.agentVersion).to.contain('1.0.3');
        expect(nodeAgent?.agentDocsPageUrl).to.be(
          'https://www.elastic.co/guide/en/apm/agent/nodejs/current/'
        );
      });

      const matchingFilterTests = [
        ['environment', 'dev', nodeServiceName],
        ['serviceName', nodeServiceName, nodeServiceName],
        ['agentLanguage', 'go', goServiceName],
        ['kuery', `service.name : ${goServiceName}`, goServiceName],
      ];

      matchingFilterTests.forEach(([filterName, filterValue, expectedService]) => {
        it(`returns only agents matching selected ${filterName}`, async () => {
          const { status, body } = await callApi({
            query: {
              [filterName]: filterValue,
            },
          });
          expect(status).to.be(200);
          expect(body.items).to.have.length(1);
          expect(body.items[0]?.serviceName).to.be(expectedService);
        });
      });

      const notMatchingFilterTests = [
        ['serviceName', 'my-service'],
        ['agentLanguage', 'my-language'],
      ];

      notMatchingFilterTests.forEach(([filterName, filterValue]) => {
        it(`returns empty agents when there is no matching ${filterName}`, async () => {
          const { status, body } = await callApi({
            query: {
              [filterName]: filterValue,
            },
          });
          expect(status).to.be(200);
          expect(body.items).to.be.empty();
        });
      });
    });
  });
}
