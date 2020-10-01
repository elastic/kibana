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
  const pkgUpdateVersion = '0.2.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const pkgUpdateKey = `${pkgName}-${pkgUpdateVersion}`;
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const logsTemplateName2 = `logs-${pkgName}.test_logs2`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/ingest_manager/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    await supertest
      .post(`/api/ingest_manager/epm/packages/${pkg}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('updates all assets when updating a package to a different version', async () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await installPackage(pkgKey);
      await installPackage(pkgUpdateKey);
    });
    after(async () => {
      await uninstallPackage(pkgUpdateKey);
    });
    it('should have updated the ILM policy', async function () {
      const resPolicy = await es.transport.request({
        method: 'GET',
        path: `/_ilm/policy/all_assets`,
      });
      expect(resPolicy.body.all_assets.policy).eql({
        phases: {
          hot: {
            min_age: '1ms',
            actions: {
              rollover: {
                max_size: '50gb',
                max_age: '31d',
              },
            },
          },
        },
      });
    });
    it('should have updated the index templates', async function () {
      const resLogsTemplate = await es.transport.request({
        method: 'GET',
        path: `/_index_template/${logsTemplateName}`,
      });
      expect(resLogsTemplate.statusCode).equal(200);
      expect(
        resLogsTemplate.body.index_templates[0].index_template.template.mappings.properties
      ).eql({
        '@timestamp': {
          type: 'date',
        },
        logs_test_name: {
          type: 'text',
        },
        new_field_name: {
          ignore_above: 1024,
          type: 'keyword',
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
            },
            namespace: {
              type: 'constant_keyword',
            },
            type: {
              type: 'constant_keyword',
            },
          },
        },
      });
      const resMetricsTemplate = await es.transport.request({
        method: 'GET',
        path: `/_index_template/${metricsTemplateName}`,
      });
      expect(resMetricsTemplate.statusCode).equal(200);
      expect(
        resMetricsTemplate.body.index_templates[0].index_template.template.mappings.properties
      ).eql({
        '@timestamp': {
          type: 'date',
        },
        metrics_test_name2: {
          ignore_above: 1024,
          type: 'keyword',
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
            },
            namespace: {
              type: 'constant_keyword',
            },
            type: {
              type: 'constant_keyword',
            },
          },
        },
      });
    });
    it('should have installed the new index template', async function () {
      const resLogsTemplate = await es.transport.request({
        method: 'GET',
        path: `/_index_template/${logsTemplateName2}`,
      });
      expect(resLogsTemplate.statusCode).equal(200);
      expect(
        resLogsTemplate.body.index_templates[0].index_template.template.mappings.properties
      ).eql({
        '@timestamp': {
          type: 'date',
        },
        test_logs2: {
          ignore_above: 1024,
          type: 'keyword',
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
            },
            namespace: {
              type: 'constant_keyword',
            },
            type: {
              type: 'constant_keyword',
            },
          },
        },
      });
    });
    it('should have installed the new versionized pipelines', async function () {
      const res = await es.transport.request({
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgUpdateVersion}`,
      });
      expect(res.statusCode).equal(200);
      const resPipeline1 = await es.transport.request({
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgUpdateVersion}-pipeline1`,
      });
      expect(resPipeline1.statusCode).equal(200);
    });
    it('should have removed the old versionized pipelines', async function () {
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
      const resPipeline1 = await es.transport.request(
        {
          method: 'GET',
          path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline1`,
        },
        {
          ignore: [404],
        }
      );
      expect(resPipeline1.statusCode).equal(404);
      const resPipeline2 = await es.transport.request(
        {
          method: 'GET',
          path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline2`,
        },
        {
          ignore: [404],
        }
      );
      expect(resPipeline2.statusCode).equal(404);
    });
    it('should have updated the template components', async function () {
      const res = await es.transport.request({
        method: 'GET',
        path: `/_component_template/${logsTemplateName}-mappings`,
      });
      expect(res.statusCode).equal(200);
      expect(res.body.component_templates[0].component_template.template.mappings).eql({
        dynamic: true,
        properties: { '@timestamp': { type: 'date' } },
      });
      const resSettings = await es.transport.request({
        method: 'GET',
        path: `/_component_template/${logsTemplateName}-settings`,
      });
      expect(res.statusCode).equal(200);
      expect(resSettings.body.component_templates[0].component_template.template.settings).eql({
        index: { lifecycle: { name: 'reference2' } },
      });
    });
    it('should have updated the index patterns', async function () {
      const resIndexPatternLogs = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'logs-*',
      });
      const fields = JSON.parse(resIndexPatternLogs.attributes.fields);
      const updated = fields.filter((field: { name: string }) => field.name === 'new_field_name');
      expect(!!updated.length).equal(true);
      const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'metrics-*',
      });
      const fieldsMetrics = JSON.parse(resIndexPatternMetrics.attributes.fields);
      const updatedMetrics = fieldsMetrics.filter(
        (field: { name: string }) => field.name === 'metrics_test_name2'
      );
      expect(!!updatedMetrics.length).equal(true);
    });
    it('should have updated the kibana assets', async function () {
      const resDashboard = await kibanaServer.savedObjects.get({
        type: 'dashboard',
        id: 'sample_dashboard',
      });
      expect(resDashboard.id).equal('sample_dashboard');
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
      const resVis = await kibanaServer.savedObjects.get({
        type: 'visualization',
        id: 'sample_visualization',
      });
      expect(resVis.attributes.description).equal('sample visualization 0.2.0');
      let resSearch;
      try {
        resSearch = await kibanaServer.savedObjects.get({
          type: 'search',
          id: 'sample_search',
        });
      } catch (err) {
        resSearch = err;
      }
      expect(resSearch.response.data.statusCode).equal(404);
      const resSearch2 = await kibanaServer.savedObjects.get({
        type: 'search',
        id: 'sample_search2',
      });
      expect(resSearch2.id).equal('sample_search2');
    });
    it('should have updated the saved object', async function () {
      const res = await kibanaServer.savedObjects.get({
        type: 'epm-packages',
        id: 'all_assets',
      });
      expect(res.attributes).eql({
        installed_kibana: [
          {
            id: 'sample_dashboard',
            type: 'dashboard',
          },
          {
            id: 'sample_search2',
            type: 'search',
          },
          {
            id: 'sample_visualization',
            type: 'visualization',
          },
        ],
        installed_es: [
          {
            id: 'logs-all_assets.test_logs-0.2.0',
            type: 'ingest_pipeline',
          },
          {
            id: 'logs-all_assets.test_logs-0.2.0-pipeline1',
            type: 'ingest_pipeline',
          },
          {
            id: 'logs-all_assets.test_logs',
            type: 'index_template',
          },
          {
            id: 'logs-all_assets.test_logs2',
            type: 'index_template',
          },
          {
            id: 'metrics-all_assets.test_metrics',
            type: 'index_template',
          },
        ],
        es_index_patterns: {
          test_logs: 'logs-all_assets.test_logs-*',
          test_metrics: 'metrics-all_assets.test_metrics-*',
        },
        name: 'all_assets',
        version: '0.2.0',
        internal: false,
        removable: true,
        install_version: '0.2.0',
        install_status: 'installed',
        install_started_at: res.attributes.install_started_at,
      });
    });
  });
}
