/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ServerMock from 'mock-http-server';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  describe('images', () => {
    const server = new ServerMock({ host: 'localhost', port: 6666 });
    beforeEach(() => {
      server.start(() => {});
    });
    afterEach(() => {
      server.stop(() => {});
    });
    it('fetches a png screenshot image from the registry', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/img/screenshots/auditbeat-file-integrity-dashboard.png',
        reply: {
          headers: { 'content-type': 'image/png' },
        },
      });

      const supertest = getService('supertest');
      const fetchImage = async () => {
        await supertest
          .get(
            '/api/integrations_manager/package/auditd-2.0.4/img/screenshots/auditbeat-file-integrity-dashboard.png'
          )
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'image/png')
          .expect(200);
      };
      await fetchImage();
    });

    it('fetches an icon image from the registry', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/img/icon.svg',
        reply: {
          headers: { 'content-type': 'image/svg' },
        },
      });

      const supertest = getService('supertest');
      const fetchImage = async () => {
        await supertest
          .get('/api/integrations_manager/package/auditd-2.0.4/img/icon.svg')
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'image/svg')
          .expect(200);
      };
      await fetchImage();
    });
  });
}
