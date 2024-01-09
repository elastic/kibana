/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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

  const prereleasePkgName = 'istio';
  const prereleasePkgVersion = '0.3.3';

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );
  const istioArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/test_packages/istio/istio-0.3.3.zip'
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
      const buf2 = fs.readFileSync(istioArchiveZip);
      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf2)
        .expect(200);
    });
    after(async () => {
      await uninstallPackage(testPkgName, testPkgVersion);
      await uninstallPackage(testPkgName, testPkgVersion);
    });
    const expectedYml = `inputs:
  - id: logfile-apache.access
    type: logfile
    data_stream:
      dataset: apache.access
      type: logs
    paths:
      - /var/log/apache2/access.log*
      - /var/log/apache2/other_vhosts_access.log*
      - /var/log/httpd/access_log*
    exclude_files:
      - .gz$
    processors:
      - add_fields:
          target: ''
          fields:
            ecs.version: 1.5.0
  - id: logfile-apache.error
    type: logfile
    data_stream:
      dataset: apache.error
      type: logs
    paths:
      - /var/log/apache2/error.log*
      - /var/log/httpd/error_log*
    exclude_files:
      - .gz$
    processors:
      - add_locale: null
      - add_fields:
          target: ''
          fields:
            ecs.version: 1.5.0
  - id: apache/metrics-apache.status
    type: apache/metrics
    data_stream:
      dataset: apache.status
      type: metrics
    metricsets:
      - status
    hosts:
      - 'http://127.0.0.1'
    period: 10s
    server_status_path: /server-status
`;
    const expectedJson = [
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
    ];

    it('returns inputs template in json format', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=json`)
        .expect(200);
      const inputs = res.body.inputs;

      expect(inputs).to.eql(expectedJson);
    });

    it('returns inputs template in yaml format if format=yaml', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=yaml`)
        .expect(200);

      expect(res.text).to.eql(expectedYml);
    });

    it('returns inputs template in yaml format if format=yml', async function () {
      const res = await supertest
        .get(`/api/fleet/epm/templates/${testPkgName}/${testPkgVersion}/inputs?format=yml`)
        .expect(200);
      expect(res.text).to.eql(expectedYml);
    });

    it('returns inputs template for a prerelease package if prerelease=true', async function () {
      const res = await supertest
        .get(
          `/api/fleet/epm/templates/${prereleasePkgName}/${prereleasePkgVersion}/inputs?format=json&prerelease=true`
        )
        .expect(200);
      const inputs = res.body.inputs;
      expect(inputs).to.eql([
        {
          id: 'filestream-istio.access_logs',
          type: 'filestream',
          data_stream: { type: 'logs', dataset: 'istio.access_logs' },
          paths: ['/var/log/containers/*${kubernetes.container.id}.log'],
          condition: "${kubernetes.container.name} == 'istio-proxy'",
          'prospector.scanner.symlinks': true,
          parsers: [{ container: { stream: 'stdout', format: 'cri' } }],
          tags: null,
        },
        {
          id: 'prometheus/metrics-istio.istiod_metrics',
          type: 'prometheus/metrics',
          data_stream: { type: 'metrics', dataset: 'istio.istiod_metrics' },
          metricsets: ['collector'],
          period: '10s',
          hosts: ['istiod.istio-system:15014'],
          condition: '${kubernetes_leaderelection.leader} == true',
          metrics_path: '/metrics',
          'metrics_filters.exclude': ['^up$'],
          'metrics_filters.include': ['galley_*', 'pilot_*', 'citadel_*', 'istio_*'],
          use_types: true,
          rate_counters: true,
        },
        {
          id: 'prometheus/metrics-istio.proxy_metrics',
          type: 'prometheus/metrics',
          data_stream: { type: 'metrics', dataset: 'istio.proxy_metrics' },
          metricsets: ['collector'],
          period: '10s',
          hosts: ['${kubernetes.pod.ip}:15020'],
          condition:
            "${kubernetes.container.name} == 'istio-proxy' and ${kubernetes.annotations.prometheus.io/scrape} == 'true'",
          metrics_path: '/stats/prometheus',
          'metrics_filters.exclude': ['^up$'],
          'metrics_filters.include': ['istio_*'],
          use_types: true,
          rate_counters: true,
        },
      ]);
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
