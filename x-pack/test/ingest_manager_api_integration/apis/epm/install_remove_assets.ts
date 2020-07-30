/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const es = getService('es');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/ingest_manager/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    await supertest.post(`/api/ingest_manager/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installs and uninstalls all assets', async () => {
    describe('installs all assets when installing a package for the first time', async () => {
      skipIfNoDockerRegistry(providerContext);
      before(async () => {
        await installPackage(pkgKey);
      });
      it('should have installed the ILM policy', async function () {
        const resPolicy = await es.transport.request({
          method: 'GET',
          path: `/_ilm/policy/all_assets`,
        });
        expect(resPolicy.statusCode).equal(200);
      });
      it('should have installed the index templates', async function () {
        const resLogsTemplate = await es.transport.request({
          method: 'GET',
          path: `/_index_template/${logsTemplateName}`,
        });
        expect(resLogsTemplate.statusCode).equal(200);

        const resMetricsTemplate = await es.transport.request({
          method: 'GET',
          path: `/_index_template/${metricsTemplateName}`,
        });
        expect(resMetricsTemplate.statusCode).equal(200);
      });
      it('should have installed the pipelines', async function () {
        const res = await es.transport.request({
          method: 'GET',
          path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}`,
        });
        expect(res.statusCode).equal(200);
      });
      it('should have installed the template components', async function () {
        const res = await es.transport.request({
          method: 'GET',
          path: `/_component_template/${logsTemplateName}-mappings`,
        });
        expect(res.statusCode).equal(200);
        const resSettings = await es.transport.request({
          method: 'GET',
          path: `/_component_template/${logsTemplateName}-settings`,
        });
        expect(resSettings.statusCode).equal(200);
      });
      it('should have installed the kibana assets', async function () {
        const resIndexPatternLogs = await kibanaServer.savedObjects.get({
          type: 'index-pattern',
          id: 'logs-*',
        });
        expect(resIndexPatternLogs.id).equal('logs-*');
        const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
          type: 'index-pattern',
          id: 'metrics-*',
        });
        expect(resIndexPatternMetrics.id).equal('metrics-*');
        const resIndexPatternEvents = await kibanaServer.savedObjects.get({
          type: 'index-pattern',
          id: 'events-*',
        });
        expect(resIndexPatternEvents.id).equal('events-*');
        const resDashboard = await kibanaServer.savedObjects.get({
          type: 'dashboard',
          id: 'sample_dashboard',
        });
        expect(resDashboard.id).equal('sample_dashboard');
        const resDashboard2 = await kibanaServer.savedObjects.get({
          type: 'dashboard',
          id: 'sample_dashboard2',
        });
        expect(resDashboard2.id).equal('sample_dashboard2');
        const resVis = await kibanaServer.savedObjects.get({
          type: 'visualization',
          id: 'sample_visualization',
        });
        expect(resVis.id).equal('sample_visualization');
        const resSearch = await kibanaServer.savedObjects.get({
          type: 'search',
          id: 'sample_search',
        });
        expect(resSearch.id).equal('sample_search');
      });
    });

    describe('uninstalls all assets when uninstalling a package', async () => {
      skipIfNoDockerRegistry(providerContext);
      before(async () => {
        await uninstallPackage(pkgKey);
      });
      it('should have uninstalled the index templates', async function () {
        const resLogsTemplate = await es.transport.request(
          {
            method: 'GET',
            path: `/_index_template/${logsTemplateName}`,
          },
          {
            ignore: [404],
          }
        );
        expect(resLogsTemplate.statusCode).equal(404);

        const resMetricsTemplate = await es.transport.request(
          {
            method: 'GET',
            path: `/_index_template/${metricsTemplateName}`,
          },
          {
            ignore: [404],
          }
        );
        expect(resMetricsTemplate.statusCode).equal(404);
      });
      it('should have uninstalled the pipelines', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}`,
          },
          {
            ignore: [404],
          }
        );
        expect(res.statusCode).equal(404);
      });
      it('should have uninstalled the kibana assets', async function () {
        let resDashboard;
        try {
          resDashboard = await kibanaServer.savedObjects.get({
            type: 'dashboard',
            id: 'sample_dashboard',
          });
        } catch (err) {
          resDashboard = err;
        }
        expect(resDashboard.response.data.statusCode).equal(404);
        let resDashboard2;
        try {
          resDashboard2 = await kibanaServer.savedObjects.get({
            type: 'dashboard',
            id: 'sample_dashboard2',
          });
        } catch (err) {
          resDashboard2 = err;
        }
        expect(resDashboard2.response.data.statusCode).equal(404);
        let resVis;
        try {
          resVis = await kibanaServer.savedObjects.get({
            type: 'visualization',
            id: 'sample_visualization',
          });
        } catch (err) {
          resVis = err;
        }
        expect(resVis.response.data.statusCode).equal(404);
        let resSearch;
        try {
          resVis = await kibanaServer.savedObjects.get({
            type: 'search',
            id: 'sample_search',
          });
        } catch (err) {
          resSearch = err;
        }
        expect(resSearch.response.data.statusCode).equal(404);
      });
    });
  });
}
