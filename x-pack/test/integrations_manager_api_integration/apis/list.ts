/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ServerMock from 'mock-http-server';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  describe('list', () => {
    const server = new ServerMock({ host: 'localhost', port: 6666 });
    beforeEach(() => {
      server.start(() => {});
    });
    afterEach(() => {
      server.stop(() => {});
    });
    it('lists all packages from the registry', async () => {
      const searchResponse = [
        {
          description: 'First integration package',
          download: '/package/first-1.0.1.tar.gz',
          name: 'first',
          title: 'First',
          type: 'integration',
          version: '1.0.1',
        },
        {
          description: 'Second integration package',
          download: '/package/second-2.0.4.tar.gz',
          icons: [
            {
              src: '/package/second-2.0.4/img/icon.svg',
              type: 'image/svg+xml',
            },
          ],
          name: 'second',
          title: 'Second',
          type: 'integration',
          version: '2.0.4',
        },
      ];
      server.on({
        method: 'GET',
        path: '/search',
        reply: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(searchResponse),
        },
      });

      const supertest = getService('supertest');
      const fetchPackageList = async () => {
        const response = await supertest
          .get('/api/integrations_manager/list')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return response.body;
      };

      const listResponse = await fetchPackageList();

      expect(listResponse.length).to.be(2);
      expect(listResponse[0]).to.eql({ ...searchResponse[0], status: 'not_installed' });
      expect(listResponse[1]).to.eql({ ...searchResponse[1], status: 'not_installed' });
    });
  });
}
