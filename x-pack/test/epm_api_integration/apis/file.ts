/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ServerMock from 'mock-http-server';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  describe('package file', () => {
    const server = new ServerMock({ host: 'localhost', port: 6666 });
    beforeEach(() => {
      server.start(() => {});
    });
    afterEach(() => {
      server.stop(() => {});
    });
    it('fetches a .png screenshot image', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/img/screenshots/auditbeat-file-integrity-dashboard.png',
        reply: {
          headers: { 'content-type': 'image/png' },
        },
      });

      const supertest = getService('supertest');
      await supertest
        .get('/api/epm/package/auditd-2.0.4/img/screenshots/auditbeat-file-integrity-dashboard.png')
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'image/png')
        .expect(200);
    });

    it('fetches an .svg icon image', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/img/icon.svg',
        reply: {
          headers: { 'content-type': 'image/svg' },
        },
      });

      const supertest = getService('supertest');
      await supertest
        .get('/api/epm/package/auditd-2.0.4/img/icon.svg')
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'image/svg');
    });

    it('fetches an auditbeat .conf rule file', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/auditbeat/rules/sample-rules-linux-32bit.conf',
      });

      const supertest = getService('supertest');
      await supertest
        .get('/api/epm/package/auditd-2.0.4/auditbeat/rules/sample-rules-linux-32bit.conf')
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);
    });

    it('fetches an auditbeat .yml config file', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/auditbeat/config/config.yml',
        reply: {
          headers: { 'content-type': 'text/yaml; charset=UTF-8' },
        },
      });

      const supertest = getService('supertest');
      await supertest
        .get('/api/epm/package/auditd-2.0.4/auditbeat/config/config.yml')
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'text/yaml; charset=UTF-8')
        .expect(200);
    });

    it('fetches a .json kibana visualization file', async () => {
      server.on({
        method: 'GET',
        path:
          '/package/auditd-2.0.4/kibana/visualization/b21e0c70-c252-11e7-8692-232bd1143e8a-ecs.json',
      });

      const supertest = getService('supertest');
      await supertest
        .get(
          '/api/epm/package/auditd-2.0.4/kibana/visualization/b21e0c70-c252-11e7-8692-232bd1143e8a-ecs.json'
        )
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);
    });

    it('fetches a .json kibana dashboard file', async () => {
      server.on({
        method: 'GET',
        path:
          '/package/auditd-2.0.4/kibana/dashboard/7de391b0-c1ca-11e7-8995-936807a28b16-ecs.json',
      });

      const supertest = getService('supertest');
      await supertest
        .get(
          '/api/epm/package/auditd-2.0.4/kibana/dashboard/7de391b0-c1ca-11e7-8995-936807a28b16-ecs.json'
        )
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);
    });

    it('fetches an .json index pattern file', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/kibana/index-pattern/auditbeat-*.json',
      });

      const supertest = getService('supertest');
      await supertest
        .get('/api/epm/package/auditd-2.0.4/kibana/index-pattern/auditbeat-*.json')
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);
    });

    it('fetches a .json search file', async () => {
      server.on({
        method: 'GET',
        path: '/package/auditd-2.0.4/kibana/search/0f10c430-c1c3-11e7-8995-936807a28b16-ecs.json',
      });

      const supertest = getService('supertest');
      await supertest
        .get(
          '/api/epm/package/auditd-2.0.4/kibana/search/0f10c430-c1c3-11e7-8995-936807a28b16-ecs.json'
        )
        .set('kbn-xsrf', 'xxx')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200);
    });
  });
}
