/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect/expect';
import fs from 'fs';
import path from 'path';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const testPkgName = 'apache';
  const testPkgVersion = '0.1.4';

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );

  describe('EPM Templates - Get Inputs', () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    before(async () => {
      const buf = fs.readFileSync(testPkgArchiveZip);
      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
    });
    after(async () => {
      await uninstallPackage(testPkgName, testPkgVersion);
    });

    it('returns inputs template in json format', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=json`)
        .expect(200);
      const inputs = res.body.inputs;

      expect(inputs).to.eql([
        {
          id: 'logfile-apache.access',
          type: 'logfile',
          data_stream: {
            type: 'logs',
            dataset: 'apache.access',
          },
          paths: [
            '/var/log/apache2/access.log*',
            '/var/log/apache2/other_vhosts_access.log*',
            '/var/log/httpd/access_log*',
          ],
          exclude_files: ['.gz$'],
          processors: [
            {
              add_fields: {
                target: '',
                fields: {
                  'ecs.version': '1.5.0',
                },
              },
            },
          ],
        },
        {
          id: 'logfile-apache.error',
          type: 'logfile',
          data_stream: {
            type: 'logs',
            dataset: 'apache.error',
          },
          paths: ['/var/log/apache2/error.log*', '/var/log/httpd/error_log*'],
          exclude_files: ['.gz$'],
          processors: [
            {
              add_locale: null,
            },
            {
              add_fields: {
                target: '',
                fields: {
                  'ecs.version': '1.5.0',
                },
              },
            },
          ],
        },
        {
          id: 'apache/metrics-apache.status',
          type: 'apache/metrics',
          data_stream: {
            type: 'metrics',
            dataset: 'apache.status',
          },
          metricsets: ['status'],
          hosts: ['http://127.0.0.1'],
          period: '10s',
          server_status_path: '/server-status',
        },
      ]);
    });

    it('returns inputs template in yaml format if format=yaml', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=yaml`)
        .expect(200);
      expect(res.text).to.eql(
        "inputs:\n  - id: logfile-apache.access\n    type: logfile\n    data_stream:\n      dataset: apache.access\n      type: logs\n    paths:\n      - /var/log/apache2/access.log*\n      - /var/log/apache2/other_vhosts_access.log*\n      - /var/log/httpd/access_log*\n    exclude_files:\n      - .gz$\n    processors:\n      - add_fields:\n          target: ''\n          fields:\n            ecs.version: 1.5.0\n  - id: logfile-apache.error\n    type: logfile\n    data_stream:\n      dataset: apache.error\n      type: logs\n    paths:\n      - /var/log/apache2/error.log*\n      - /var/log/httpd/error_log*\n    exclude_files:\n      - .gz$\n    processors:\n      - add_locale: null\n      - add_fields:\n          target: ''\n          fields:\n            ecs.version: 1.5.0\n  - id: apache/metrics-apache.status\n    type: apache/metrics\n    data_stream:\n      dataset: apache.status\n      type: metrics\n    metricsets:\n      - status\n    hosts:\n      - 'http://127.0.0.1'\n    period: 10s\n    server_status_path: /server-status\n"
      );
    });

    it('returns inputs template in yaml format if format=yml', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=yml`)
        .expect(200);
      expect(res.text).to.eql(
        "inputs:\n  - id: logfile-apache.access\n    type: logfile\n    data_stream:\n      dataset: apache.access\n      type: logs\n    paths:\n      - /var/log/apache2/access.log*\n      - /var/log/apache2/other_vhosts_access.log*\n      - /var/log/httpd/access_log*\n    exclude_files:\n      - .gz$\n    processors:\n      - add_fields:\n          target: ''\n          fields:\n            ecs.version: 1.5.0\n  - id: logfile-apache.error\n    type: logfile\n    data_stream:\n      dataset: apache.error\n      type: logs\n    paths:\n      - /var/log/apache2/error.log*\n      - /var/log/httpd/error_log*\n    exclude_files:\n      - .gz$\n    processors:\n      - add_locale: null\n      - add_fields:\n          target: ''\n          fields:\n            ecs.version: 1.5.0\n  - id: apache/metrics-apache.status\n    type: apache/metrics\n    data_stream:\n      dataset: apache.status\n      type: metrics\n    metricsets:\n      - status\n    hosts:\n      - 'http://127.0.0.1'\n    period: 10s\n    server_status_path: /server-status\n"
      );
    });

    it('returns a 404 for a version that does not exists', async function () {
      await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/0.1.0/inputs?format=json`)
        .expect(404);
    });

    it('allows user with only fleet permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=json`)
        .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
        .expect(200);
    });

    it('allows user with integrations read permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=json`)
        .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
        .expect(200);
    });
  });
}
