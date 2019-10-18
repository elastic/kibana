/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ServerMock from 'mock-http-server';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

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
          .get('/api/epm/list')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return response.body;
      };

      const listResponse = await fetchPackageList();

      expect(listResponse.length).to.be(2);
      expect(listResponse[0]).to.eql({ ...searchResponse[0], status: 'not_installed' });
      expect(listResponse[1]).to.eql({ ...searchResponse[1], status: 'not_installed' });
    });

    it('sorts the packages even if the registry sends them unsorted', async () => {
      const searchResponse = [
        {
          description: 'BBB integration package',
          download: '/package/bbb-1.0.1.tar.gz',
          name: 'bbb',
          title: 'BBB',
          type: 'integration',
          version: '1.0.1',
        },
        {
          description: 'CCC integration package',
          download: '/package/ccc-2.0.4.tar.gz',
          name: 'ccc',
          title: 'CCC',
          type: 'integration',
          version: '2.0.4',
        },
        {
          description: 'AAA integration package',
          download: '/package/aaa-0.0.1.tar.gz',
          name: 'aaa',
          title: 'AAA',
          type: 'integration',
          version: '0.0.1',
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
          .get('/api/epm/list')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return response.body;
      };

      const listResponse = await fetchPackageList();

      expect(listResponse.length).to.be(3);
      expect(listResponse[0].name).to.eql('aaa');
      expect(listResponse[1].name).to.eql('bbb');
      expect(listResponse[2].name).to.eql('ccc');
    });
  });
}
