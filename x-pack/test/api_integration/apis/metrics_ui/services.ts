/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ServicesAPIResponseRT } from '@kbn/infra-plugin/common/http_api/host_details';
import { ApmSynthtraceEsClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { generateServicesData, generateServicesLogsOnlyData } from './helpers';

const SERVICES_ENDPOINT = '/api/infra/services';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const apmSynthtraceKibanaClient = getService('apmSynthtraceKibanaClient');
  const esClient = getService('es');

  describe('GET /infra/services', () => {
    let synthtraceApmClient: ApmSynthtraceEsClient;
    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();
    before(
      async () =>
        (synthtraceApmClient = new ApmSynthtraceEsClient({
          client: esClient,
          logger: createLogger(LogLevel.info),
          version: (await apmSynthtraceKibanaClient.installApmPackage()).version,
          refreshAfterIndex: true,
        }))
    );
    after(async () => apmSynthtraceKibanaClient.uninstallApmPackage());

    describe('with transactions', () => {
      before(async () =>
        synthtraceApmClient.index(
          generateServicesData({ from, to, instanceCount: 3, servicesPerHost: 3 })
        )
      );
      after(async () => synthtraceApmClient.clean());

      it('returns no services with no data', async () => {
        const filters = JSON.stringify({
          'host.name': 'some-host',
        });

        const response = await supertest
          .get(SERVICES_ENDPOINT)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .query({
            filters,
            from,
            to,
          })
          .expect(200);

        const { services } = decodeOrThrow(ServicesAPIResponseRT)(response.body);
        expect(services.length).to.be(0);
      });
      it('should return correct number of services running on specified host', async () => {
        const filters = JSON.stringify({
          'host.name': 'host-0',
        });
        const response = await supertest
          .get(SERVICES_ENDPOINT)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .query({
            filters,
            from,
            to,
          })
          .expect(200);
        expect(response.body.services.length).to.equal(3);
      });
      it('should return bad request if unallowed filter', async () => {
        const filters = JSON.stringify({
          'host.name': 'host-0',
          'agent.name': 'nodejs',
        });
        await supertest
          .get(SERVICES_ENDPOINT)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .query({
            filters,
            from,
            to,
          })
          .expect(400);
      });
    });
    describe('with logs only', () => {
      before(async () =>
        synthtraceApmClient.index(
          generateServicesLogsOnlyData({ from, to, instanceCount: 1, servicesPerHost: 2 })
        )
      );
      after(async () => synthtraceApmClient.clean());
      it('should return services with logs only data', async () => {
        const filters = JSON.stringify({
          'host.name': 'host-0',
        });
        const response = await supertest
          .get(SERVICES_ENDPOINT)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .query({
            filters,
            from,
            to,
          })
          .expect(200);
        expect(response.body.services.length).to.equal(2);
      });
    });
  });
}
