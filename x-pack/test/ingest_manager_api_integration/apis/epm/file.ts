/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');

  const server = dockerServers.get('registry');
  describe('EPM - package file', () => {
    it('fetches a .png screenshot image', async function () {
      if (server.enabled) {
        await supertest
          .get(
            '/api/ingest_manager/epm/packages/filetest/0.1.0/img/screenshots/metricbeat_dashboard.png'
          )
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'image/png')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('fetches an .svg icon image', async function () {
      if (server.enabled) {
        await supertest
          .get('/api/ingest_manager/epm/packages/filetest/0.1.0/img/logo.svg')
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'image/svg+xml')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('fetches a .json kibana visualization file', async function () {
      if (server.enabled) {
        await supertest
          .get(
            '/api/ingest_manager/epm/packages/filetest/0.1.0/kibana/visualization/sample_visualization.json'
          )
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('fetches a .json kibana dashboard file', async function () {
      if (server.enabled) {
        await supertest
          .get(
            '/api/ingest_manager/epm/packages/filetest/0.1.0/kibana/dashboard/sample_dashboard.json'
          )
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('fetches a .json search file', async function () {
      if (server.enabled) {
        await supertest
          .get('/api/ingest_manager/epm/packages/filetest/0.1.0/kibana/search/sample_search.json')
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });

  // Disabled for now as we don't serve prebuilt index patterns in current packages.
  // it('fetches an .json index pattern file', async function () {
  //   if (server.enabled) {
  //     await supertest
  //       .get('/api/ingest_manager/epm/packages/filetest/0.1.0/kibana/index-pattern/sample-*.json')
  //       .set('kbn-xsrf', 'xxx')
  //       .expect('Content-Type', 'application/json; charset=utf-8')
  //       .expect(200);
  //   } else {
  //     warnAndSkipTest(this, log);
  //   }
  // });
}
