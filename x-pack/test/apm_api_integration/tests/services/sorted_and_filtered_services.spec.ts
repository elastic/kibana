/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { ValuesType } from 'utility-types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createAndRunApmMlJobs } from '../../common/utils/create_and_run_apm_ml_jobs';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtraceClient = getService('synthtraceEsClient');
  const apmApiClient = getService('apmApiClient');
  const ml = getService('ml');
  const es = getService('es');

  const start = '2021-01-01T12:00:00.000Z';
  const end = '2021-08-01T12:00:00.000Z';

  // the terms enum API will return names for deleted services,
  // so we add a prefix to make sure we don't get data from other
  // tests
  const SERVICE_NAME_PREFIX = 'sorted_and_filtered_';

  async function getSortedAndFilteredServices({
    environment = 'ENVIRONMENT_ALL',
    kuery = '',
  }: { environment?: string; kuery?: string } = {}) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/sorted_and_filtered_services',
      params: {
        query: {
          start,
          end,
          environment,
          kuery,
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

  type ServiceListItem = ValuesType<Awaited<ReturnType<typeof getSortedAndFilteredServices>>>;

  registry.when('Sorted and filtered services', { config: 'trial', archives: [] }, () => {
    before(async () => {
      const serviceA = apm
        .service({ name: SERVICE_NAME_PREFIX + 'a', environment: 'production', agentName: 'java' })
        .instance('a');

      const serviceB = apm
        .service({ name: SERVICE_NAME_PREFIX + 'b', environment: 'development', agentName: 'go' })
        .instance('b');

      const serviceC = apm
        .service({ name: SERVICE_NAME_PREFIX + 'c', environment: 'development', agentName: 'go' })
        .instance('c');

      const spikeStart = new Date('2021-01-07T12:00:00.000Z').getTime();
      const spikeEnd = new Date('2021-01-07T14:00:00.000Z').getTime();

      const eventsWithinTimerange = timerange(new Date(start).getTime(), new Date(end).getTime())
        .interval('15m')
        .rate(1)
        .generator((timestamp) => {
          const isInSpike = spikeStart <= timestamp && spikeEnd >= timestamp;
          return [
            serviceA
              .transaction({ transactionName: 'GET /api' })
              .duration(isInSpike ? 1000 : 1100)
              .timestamp(timestamp),
            serviceB
              .transaction({ transactionName: 'GET /api' })
              .duration(isInSpike ? 1000 : 4000)
              .timestamp(timestamp),
          ];
        });

      const eventsOutsideOfTimerange = timerange(
        new Date('2021-01-01T00:00:00.000Z').getTime(),
        new Date(start).getTime() - 1
      )
        .interval('15m')
        .rate(1)
        .generator((timestamp) => {
          return serviceC
            .transaction({ transactionName: 'GET /api', transactionType: 'custom' })
            .duration(1000)
            .timestamp(timestamp);
        });

      await synthtraceClient.index([eventsWithinTimerange, eventsOutsideOfTimerange]);

      await createAndRunApmMlJobs({ es, ml, environments: ['production', 'development'] });
    });

    after(() => {
      return Promise.all([synthtraceClient.clean(), ml.cleanMlIndices()]);
    });

    describe('with no kuery or environment are set', () => {
      let items: ServiceListItem[];

      before(async () => {
        items = await getSortedAndFilteredServices();
      });

      it('returns services based on the terms enum API and ML data', () => {
        const serviceNames = items.map((item) => item.serviceName);

        expect(serviceNames.sort()).to.eql(['a', 'b', 'c']);
      });
    });

    describe('with kuery set', () => {
      let items: ServiceListItem[];

      before(async () => {
        items = await getSortedAndFilteredServices({
          kuery: 'service.name:*',
        });
      });

      it('does not return any services', () => {
        expect(items.length).to.be(0);
      });
    });

    describe('with environment set to production', () => {
      let items: ServiceListItem[];

      before(async () => {
        items = await getSortedAndFilteredServices({
          environment: 'production',
        });
      });

      it('returns services for production only', () => {
        const serviceNames = items.map((item) => item.serviceName);

        expect(serviceNames.sort()).to.eql(['a']);
      });
    });
  });
}
