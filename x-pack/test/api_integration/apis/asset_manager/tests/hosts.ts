/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Asset } from '@kbn/assetManager-plugin/common/types_api';
import { ASSETS_ENDPOINT } from './constants';
import { FtrProviderContext } from '../types';
import { generateHostsData } from './helpers';

const HOSTS_ASSETS_ENDPOINT = `${ASSETS_ENDPOINT}/hosts`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const synthtrace = getService('infraSynthtraceEsClient');

  describe('GET /assets/hosts', () => {
    const from = new Date(Date.now() - 1000 * 60 * 2).toISOString();
    const to = new Date().toISOString();

    beforeEach(async () => {
      await synthtrace.clean();
    });

    it('should return hosts', async () => {
      await synthtrace.index(generateHostsData({ from, to, count: 5 }));

      const response = await supertest
        .get(HOSTS_ASSETS_ENDPOINT)
        .query({
          from,
          to,
        })
        .expect(200);

      expect(response.body).to.have.property('hosts');
      expect(response.body.hosts.length).to.equal(5);
    });

    it('should return a specific host by EAN', async () => {
      await synthtrace.index(generateHostsData({ from, to, count: 5 }));
      const testEan = 'host:my-host-1';

      const response = await supertest
        .get(HOSTS_ASSETS_ENDPOINT)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ ean: testEan }),
        })
        .expect(200);

      expect(response.body).to.have.property('hosts');
      expect(response.body.hosts.length).to.equal(1);
      expect(response.body.hosts[0]['asset.ean']).to.equal(testEan);
    });

    it('should return a filtered list of hosts by ID wildcard pattern', async () => {
      await synthtrace.index(generateHostsData({ from, to, count: 15 }));
      const testIdPattern = '*host-1*';

      const response = await supertest
        .get(HOSTS_ASSETS_ENDPOINT)
        .query({
          from,
          to,
          stringFilters: JSON.stringify({ id: testIdPattern }),
        })
        .expect(200);

      expect(response.body).to.have.property('hosts');
      expect(response.body.hosts.length).to.equal(6);

      const ids = response.body.hosts.map((result: Asset) => result['asset.id']);

      expect(ids).to.eql([
        'my-host-1',
        'my-host-10',
        'my-host-11',
        'my-host-12',
        'my-host-13',
        'my-host-14',
      ]);
    });
  });
}
