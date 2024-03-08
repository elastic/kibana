/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ServicesAPIResponseRT } from '@kbn/infra-plugin/common/http_api/host_details';
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import { FtrProviderContext } from './types';
import { generateServicesData, generateServicesLogsOnlyData } from './helpers';

const SERVICES_ENDPOINT = '/api/infra/services';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtrace = getService('apmSynthtraceEsClient');
  describe('GET /infra/services', () => {
    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();

    describe('with transactions', () => {
      before(async () =>
        synthtrace.index(generateServicesData({ from, to, instanceCount: 3, servicesPerHost: 3 }))
      );
      after(async () => synthtrace.clean());
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
      before(async () => {
        await synthtrace.index(
          generateServicesLogsOnlyData({ from, to, instanceCount: 1, servicesPerHost: 2 })
        );
      });
      after(async () => {
        await synthtrace.clean();
      });
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
