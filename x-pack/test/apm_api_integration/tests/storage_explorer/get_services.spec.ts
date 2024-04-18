/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { IndexLifecyclePhaseSelectOption } from '@kbn/apm-plugin/common/storage_explorer_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const apmApiClient = getService('apmApiClient');

  const start = '2021-01-01T12:00:00.000Z';
  const end = '2021-08-01T12:00:00.000Z';

  // The terms enum API may return terms from deleted documents
  // so we add a prefix to make sure we don't get data from other tests
  const SERVICE_NAME_PREFIX = 'storage_explorer_services_';

  async function getServices({
    environment = 'ENVIRONMENT_ALL',
    kuery = '',
    indexLifecyclePhase = IndexLifecyclePhaseSelectOption.All,
  }: {
    environment?: string;
    kuery?: string;
    indexLifecyclePhase?: IndexLifecyclePhaseSelectOption;
  } = {}) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/storage_explorer/get_services',
      params: {
        query: {
          environment,
          kuery,
          indexLifecyclePhase,
          start,
          end,
        },
      },
    });

    return response.body.services
      .filter((service) => service.serviceName.startsWith(SERVICE_NAME_PREFIX))
      .map((service) => ({
        ...service,
        serviceName: service.serviceName.replace(SERVICE_NAME_PREFIX, ''),
      }));
  }

  // FLAKY: https://github.com/elastic/kibana/issues/177519
  registry.when('Get services', { config: 'basic', archives: [] }, () => {
    before(async () => {
      const serviceA = apm
        .service({ name: `${SERVICE_NAME_PREFIX}a`, environment: 'production', agentName: 'java' })
        .instance('a');

      const serviceB = apm
        .service({ name: `${SERVICE_NAME_PREFIX}b`, environment: 'development', agentName: 'go' })
        .instance('b');

      const serviceC = apm
        .service({ name: `${SERVICE_NAME_PREFIX}c`, environment: 'development', agentName: 'go' })
        .instance('c');

      const eventsWithinTimerange = timerange(new Date(start).getTime(), new Date(end).getTime())
        .interval('15m')
        .rate(1)
        .generator((timestamp) => [
          serviceA.transaction({ transactionName: 'GET /api' }).duration(1000).timestamp(timestamp),
          serviceB.transaction({ transactionName: 'GET /api' }).duration(1000).timestamp(timestamp),
        ]);

      const eventsOutsideOfTimerange = timerange(
        new Date('2021-01-01T00:00:00.000Z').getTime(),
        new Date(start).getTime() - 1
      )
        .interval('15m')
        .rate(1)
        .generator((timestamp) =>
          serviceC.transaction({ transactionName: 'GET /api' }).duration(1000).timestamp(timestamp)
        );

      await synthtraceEsClient.index([eventsWithinTimerange, eventsOutsideOfTimerange]);
    });

    after(() => synthtraceEsClient.clean());

    it('with no kuery, environment or index lifecycle phase set it returns services based on the terms enum API', async () => {
      const items = await getServices();
      const serviceNames = items.map((item) => item.serviceName);
      expect(serviceNames.sort()).to.eql(['a', 'b', 'c']);
    });

    it('with kuery set does it does not return any services', async () => {
      const services = await getServices({
        kuery: 'service.name:*',
      });
      expect(services).to.be.empty();
    });

    it('with environment set to production it does not return any services', async () => {
      const services = await getServices({
        environment: 'production',
      });
      expect(services).to.be.empty();
    });

    it('with index lifecycle phase set to hot it does not return any services', async () => {
      const services = await getServices({
        indexLifecyclePhase: IndexLifecyclePhaseSelectOption.Hot,
      });
      expect(services).to.be.empty();
    });
  });
}
