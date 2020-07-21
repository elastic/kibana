/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const dockerServers = getService('dockerServers');
  const log = getService('log');
  const pkgName = 'es_assets';
  const pkgVersion = '0.1.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;

  const deletePackage = async (pkg: string) => {
    await supertest.delete(`/api/ingest_manager/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };

  const server = dockerServers.get('registry');

  describe('installs all assets when installing a package for the first time', async () => {
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(pkgKey);
      }
    });

    it('should install the es_assets package', async function () {
      if (server.enabled) {
        await supertest
          .post(`/api/ingest_manager/epm/packages/${pkgKey}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
    it('should install the ILM policy', async function () {
      if (server.enabled) {
        const resPolicy = await es.transport.request({
          method: 'GET',
          path: `/_ilm/policy/es_assets`,
        });
        expect(resPolicy.statusCode).equal(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
    it('should install the index templates', async function () {
      if (server.enabled) {
        const resLogsTemplate = await es.transport.request({
          method: 'GET',
          path: `/_index_template/logs-${pkgName}.test_logs`,
        });
        expect(resLogsTemplate.statusCode).equal(200);

        const resMetricsTemplate = await es.transport.request({
          method: 'GET',
          path: `/_index_template/metrics-${pkgName}.test_metrics`,
        });
        expect(resMetricsTemplate.statusCode).equal(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
    it('should install the pipelines', async function () {
      const pipelineName = `logs-${pkgName}.test_logs-${pkgVersion}`;
      if (server.enabled) {
        const res = await es.transport.request({
          method: 'GET',
          path: `/_ingest/pipeline/${pipelineName}`,
        });
        expect(res.statusCode).equal(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
