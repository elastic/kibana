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
import { generateServicesData } from './helpers';

const SERVICES_ENDPOINT = '/api/infra/services';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtrace = getService('apmSynthtraceEsClient');
  describe('GET /infra/services', () => {
    it('returns no services with no data', async () => {
      const filters = JSON.stringify({
        'host.name': 'some-host',
      });
      const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
      const to = new Date().toISOString();
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
      const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
      const to = new Date().toISOString();
      await synthtrace.index(
        generateServicesData({ from, to, instanceCount: 3, servicesPerHost: 3 })
      );
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
      const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
      const to = new Date().toISOString();
      await synthtrace.index(
        generateServicesData({ from, to, instanceCount: 3, servicesPerHost: 3 })
      );
      const filters = JSON.stringify({
        'host.name': 'host-0',
        'agent.name': 'nodejs',
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
        .expect(400);
    });
  });
}
