/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { ASSETS_ENDPOINT } from './constants';
import { FtrProviderContext } from '../types';

const SERVICES_ASSETS_ENDPOINT = `${ASSETS_ENDPOINT}/services`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtrace = getService('apmSynthtraceEsClient');

  describe('GET /assets/services', () => {
    beforeEach(async () => {
      await synthtrace.clean();
    });

    it('should return services', async () => {
      const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
      const to = new Date().toISOString();
      await synthtrace.index(generateServicesData({ from, to, count: 2 }));

      const response = await supertest
        .get(SERVICES_ASSETS_ENDPOINT)
        .query({
          from,
          to,
        })
        .expect(200);

      expect(response.body).to.have.property('services');
      expect(response.body.services.length).to.equal(2);
    });

    it('should return services running on specified host', async () => {
      const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
      const to = new Date().toISOString();
      await synthtrace.index(generateServicesData({ from, to, count: 5 }));

      const response = await supertest
        .get(SERVICES_ASSETS_ENDPOINT)
        .query({
          from,
          to,
          parent: 'host:my-host-1',
        })
        .expect(200);

      expect(response.body).to.have.property('services');
      expect(response.body.services.length).to.equal(1);
      expect(omit(response.body.services[0], ['@timestamp'])).to.eql({
        'asset.kind': 'service',
        'asset.id': 'service-1',
        'asset.ean': 'service:service-1',
        'asset.references': [],
        'asset.parents': [],
        'service.environment': 'production',
      });
    });
  });
}

function generateServicesData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const services = Array(count)
    .fill(0)
    .map((_, idx) =>
      apm
        .service({
          name: `service-${idx}`,
          environment: 'production',
          agentName: 'nodejs',
        })
        .instance(`my-host-${idx}`)
    );

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}
