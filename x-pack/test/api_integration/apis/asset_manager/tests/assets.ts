/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ASSETS_ENDPOINT } from './constants';
import { FtrProviderContext } from '../types';
import { generateHostsData, generateServicesData } from './helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtraceApm = getService('apmSynthtraceEsClient');
  const synthtraceInfra = getService('infraSynthtraceEsClient');

  describe('GET /assets', () => {
    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();

    beforeEach(async () => {
      await synthtraceApm.clean();
      await synthtraceInfra.clean();
    });

    it('should return all assets', async () => {
      await Promise.all([
        synthtraceInfra.index(generateHostsData({ from, to, count: 5 })),
        synthtraceApm.index(generateServicesData({ from, to, count: 5 })),
      ]);

      const response = await supertest
        .get(ASSETS_ENDPOINT)
        .query({
          from,
          to,
        })
        .expect(200);

      expect(response.body).to.have.property('assets');
      expect(response.body.assets.length).to.equal(10);
    });

    it('supports only hosts and services', async () => {
      await supertest
        .get(ASSETS_ENDPOINT)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ kind: ['host', 'service'] }),
        })
        .expect(200);

      await supertest
        .get(ASSETS_ENDPOINT)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ kind: ['container', 'host'] }),
        })
        .expect(400);
    });
  });
}
