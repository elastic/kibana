/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';
import { testUsers } from '../test_users';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const server = dockerServers.get('registry');
  describe('EPM - package file', () => {
    describe('it gets files from registry', () => {
      it('fetches a .png screenshot image', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/filetest/0.1.0/img/screenshots/metricbeat_dashboard.png')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'image/png')
            .expect(200);
          expect(Buffer.isBuffer(res.body)).to.equal(true);
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches an .svg icon image', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/filetest/0.1.0/img/logo.svg')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'image/svg+xml')
            .expect(200);
          expect(Buffer.isBuffer(res.body)).to.equal(true);
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches a .json kibana visualization file', async function () {
        if (server.enabled) {
          const res = await supertest
            .get(
              '/api/fleet/epm/packages/filetest/0.1.0/kibana/visualization/sample_visualization.json'
            )
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'application/json; charset=utf-8')
            .expect(200);
          expect(typeof res.body).to.equal('object');
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches a .json kibana dashboard file', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/filetest/0.1.0/kibana/dashboard/sample_dashboard.json')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'application/json; charset=utf-8')
            .expect(200);
          expect(typeof res.body).to.equal('object');
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches a .json search file', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/filetest/0.1.0/kibana/search/sample_search.json')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'application/json; charset=utf-8')
            .expect(200);
          expect(typeof res.body).to.equal('object');
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('should return 200 if the user has only integrations access', async function () {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages/filetest/0.1.0/kibana/search/sample_search.json')
          .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });

      it('should return 200 if the user has only fleet access', async function () {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages/filetest/0.1.0/kibana/search/sample_search.json')
          .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
          .set('kbn-xsrf', 'xxx')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });

      it('should return 403 if the user does not have correct permissions', async function () {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages/filetest/0.1.0/kibana/search/sample_search.json')
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .set('kbn-xsrf', 'xxx')
          .expect(403);
      });
    });
    describe('it gets files from an uploaded package', () => {
      before(async () => {
        if (!server.enabled) return;
        const testPkgArchiveTgz = path.join(
          path.dirname(__filename),
          '../fixtures/direct_upload_packages/apache_0.1.4.tar.gz'
        );
        const buf = fs.readFileSync(testPkgArchiveTgz);
        await supertest
          .post(`/api/fleet/epm/packages`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/gzip')
          .send(buf)
          .expect(200);
      });
      after(async () => {
        if (!server.enabled) return;
        await supertest.delete(`/api/fleet/epm/packages/apache/0.1.4`).set('kbn-xsrf', 'xxxx');
      });
      it('fetches a .png screenshot image', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/apache/0.1.4/img/kibana-apache-test.png')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'image/png')
            .expect(200);
          expect(Buffer.isBuffer(res.body)).to.equal(true);
        } else {
          warnAndSkipTest(this, log);
        }
      });
      it('fetches the logo', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/apache/0.1.4/img/logo_apache_test.svg')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'image/svg+xml')
            .expect(200);
          await supertest
            .get('/api/fleet/epm/packages/apache/0.1.4/img/logo_apache.svg')
            .set('kbn-xsrf', 'xxx')
            .expect(404);
          expect(Buffer.isBuffer(res.body)).to.equal(true);
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches a .json kibana dashboard file', async function () {
        if (server.enabled) {
          const res = await supertest
            .get(
              '/api/fleet/epm/packages/apache/0.1.4/kibana/dashboard/apache-Logs-Apache-Dashboard-ecs-new.json'
            )
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'application/json; charset=utf-8')
            .expect(200);
          expect(typeof res.body).to.equal('object');
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches a README file', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/apache/0.1.4/docs/README.md')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'text/markdown; charset=utf-8')
            .expect(200);
          expect(res.text).to.equal('# Apache Uploaded Test Integration');
        } else {
          warnAndSkipTest(this, log);
        }
      });

      it('fetches the logo of a not uploaded (and installed) version from the registry when another version is uploaded (and installed)', async function () {
        if (server.enabled) {
          const res = await supertest
            .get('/api/fleet/epm/packages/apache/0.1.3/img/logo_apache.svg')
            .set('kbn-xsrf', 'xxx')
            .expect('Content-Type', 'image/svg+xml')
            .expect(200);
          expect(Buffer.isBuffer(res.body)).to.equal(true);
        } else {
          warnAndSkipTest(this, log);
        }
      });
    });

    // Disabled for now as we don't serve prebuilt index patterns in current packages.
    // it('fetches an .json index pattern file', async function () {
    //   if (server.enabled) {
    //     await supertest
    //       .get('/api/fleet/epm/packages/filetest/0.1.0/kibana/index-pattern/sample-*.json')
    //       .set('kbn-xsrf', 'xxx')
    //       .expect('Content-Type', 'application/json; charset=utf-8')
    //       .expect(200);
    //   } else {
    //     warnAndSkipTest(this, log);
    //   }
    // });
  });
}
