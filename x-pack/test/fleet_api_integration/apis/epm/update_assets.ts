/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const es = getService('es');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';
  const pkgUpdateVersion = '0.2.0';
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const logsTemplateName2 = `logs-${pkgName}.test_logs2`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('updates all assets when updating a package to a different version', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    before(async () => {
      await installPackage(pkgName, pkgVersion);
      await installPackage(pkgName, pkgUpdateVersion);
    });
    after(async () => {
      await uninstallPackage(pkgName, pkgUpdateVersion);
    });
    it('should have updated the ILM policy', async function () {
      const resPolicy = await es.ilm.getLifecycle(
        {
          name: 'all_assets',
        },
        { meta: true }
      );

      expect(resPolicy.body.all_assets.policy).eql({
        _meta: {
          managed: true,
          managed_by: 'fleet',
          package: {
            name: 'all_assets',
          },
        },
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
      const resLogsTemplate = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_index_template/${logsTemplateName}`,
        },
        { meta: true }
      );
      expect(resLogsTemplate.statusCode).equal(200);
      expect(resLogsTemplate.body.index_templates[0].index_template.template.mappings).eql({
        _meta: { package: { name: 'all_assets' }, managed_by: 'fleet', managed: true },
      });
      const resMetricsTemplate = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_index_template/${metricsTemplateName}`,
        },
        { meta: true }
      );
      expect(resMetricsTemplate.statusCode).equal(200);
      expect(resMetricsTemplate.body.index_templates[0].index_template.template.mappings).eql({
        _meta: {
          managed: true,
          managed_by: 'fleet',
          package: {
            name: 'all_assets',
          },
        },
      });
    });
    it('should have installed the new index template', async function () {
      const resLogsTemplate = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_index_template/${logsTemplateName2}`,
        },
        { meta: true }
      );
      expect(resLogsTemplate.statusCode).equal(200);
      expect(resLogsTemplate.body.index_templates[0].index_template.template.mappings).eql({
        _meta: {
          managed: true,
          managed_by: 'fleet',
          package: {
            name: 'all_assets',
          },
        },
      });
    });
    it('should have populated the new component template with the correct mapping', async () => {
      const resMappings = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_component_template/${logsTemplateName2}@mappings`,
        },
        { meta: true }
      );
      expect(resMappings.statusCode).equal(200);
      expect(
        resMappings.body.component_templates[0].component_template.template.mappings.properties
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
      const res = await es.ingest.getPipeline(
        {
          id: `${logsTemplateName}-${pkgUpdateVersion}`,
        },
        { meta: true }
      );
      expect(res.statusCode).equal(200);
      const resPipeline1 = await es.ingest.getPipeline(
        {
          id: `${logsTemplateName}-${pkgUpdateVersion}-pipeline1`,
        },
        { meta: true }
      );
      expect(resPipeline1.statusCode).equal(200);
    });
    it('should have removed the old versionized pipelines', async function () {
      const res = await es.ingest.getPipeline(
        {
          id: `${logsTemplateName}-${pkgVersion}`,
        },
        {
          ignore: [404],
          meta: true,
        }
      );
      expect(res.statusCode).equal(404);
      const resPipeline1 = await es.ingest.getPipeline(
        {
          id: `${logsTemplateName}-${pkgVersion}-pipeline1`,
        },
        {
          ignore: [404],
          meta: true,
        }
      );
      expect(resPipeline1.statusCode).equal(404);
      const resPipeline2 = await es.ingest.getPipeline(
        {
          id: `${logsTemplateName}-${pkgVersion}-pipeline2`,
        },
        {
          ignore: [404],
          meta: true,
        }
      );
      expect(resPipeline2.statusCode).equal(404);
    });
    it('should have updated the logs component templates', async function () {
      const resMappings = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_component_template/${logsTemplateName}@mappings`,
        },
        { meta: true }
      );
      expect(resMappings.statusCode).equal(200);
      expect(resMappings.body.component_templates[0].component_template.template.settings).eql({
        index: {
          mapping: {
            total_fields: {
              limit: '10000',
            },
          },
        },
      });
      expect(resMappings.body.component_templates[0].component_template.template.mappings).eql({
        dynamic: true,
        properties: {
          '@timestamp': {
            type: 'date',
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
          logs_test_name: {
            type: 'text',
          },
          new_field_name: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      });
      const resSettings = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_component_template/${logsTemplateName}@settings`,
        },
        { meta: true }
      );
      expect(resSettings.statusCode).equal(200);
      expect(resSettings.body.component_templates[0].component_template.template.settings).eql({
        index: {
          lifecycle: { name: 'reference2' },
          codec: 'best_compression',
          query: {
            default_field: ['logs_test_name', 'new_field_name'],
          },
        },
      });
      const resUserSettings = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_component_template/${logsTemplateName}@custom`,
        },
        { meta: true }
      );
      expect(resUserSettings.statusCode).equal(200);
      expect(resUserSettings.body).eql({
        component_templates: [
          {
            name: 'logs-all_assets.test_logs@custom',
            component_template: {
              _meta: {
                managed: true,
                managed_by: 'fleet',
                package: {
                  name: 'all_assets',
                },
              },
              template: {
                settings: {},
              },
            },
          },
        ],
      });
    });
    it('should have updated the metrics mapping component template', async function () {
      const resMappings = await es.transport.request<any>(
        {
          method: 'GET',
          path: `/_component_template/${metricsTemplateName}@mappings`,
        },
        { meta: true }
      );
      expect(resMappings.statusCode).equal(200);
      expect(
        resMappings.body.component_templates[0].component_template.template.mappings.properties
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
        installed_kibana_space_id: 'default',
        installed_kibana: [
          {
            id: 'sample_dashboard',
            type: 'dashboard',
          },
          {
            id: 'sample_visualization',
            type: 'visualization',
          },
          {
            id: 'sample_search2',
            type: 'search',
          },
          {
            id: 'sample_lens',
            type: 'lens',
          },
          {
            id: 'sample_security_rule',
            type: 'security-rule',
          },
          {
            id: 'sample_csp_rule_template2',
            type: 'csp-rule-template',
          },
          {
            id: 'sample_ml_module',
            type: 'ml-module',
          },
          {
            id: 'sample_tag',
            type: 'tag',
          },
        ],
        installed_es: [
          {
            id: 'logs-all_assets.test_logs-all_assets',
            type: 'data_stream_ilm_policy',
          },
          {
            id: 'default',
            type: 'ml_model',
          },
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
            id: 'logs-all_assets.test_logs@mappings',
            type: 'component_template',
          },
          {
            id: 'logs-all_assets.test_logs@settings',
            type: 'component_template',
          },
          {
            id: 'logs-all_assets.test_logs@custom',
            type: 'component_template',
          },
          {
            id: 'logs-all_assets.test_logs2',
            type: 'index_template',
          },
          {
            id: 'logs-all_assets.test_logs2@mappings',
            type: 'component_template',
          },
          {
            id: 'logs-all_assets.test_logs2@settings',
            type: 'component_template',
          },
          {
            id: 'logs-all_assets.test_logs2@custom',
            type: 'component_template',
          },
          {
            id: 'metrics-all_assets.test_metrics',
            type: 'index_template',
          },
          {
            id: 'metrics-all_assets.test_metrics@mappings',
            type: 'component_template',
          },
          {
            id: 'metrics-all_assets.test_metrics@settings',
            type: 'component_template',
          },
          {
            id: 'metrics-all_assets.test_metrics@custom',
            type: 'component_template',
          },
        ],
        es_index_patterns: {
          test_logs: 'logs-all_assets.test_logs-*',
          test_metrics: 'metrics-all_assets.test_metrics-*',
        },
        package_assets: [
          { id: '3eb4c54a-638f-51b6-84e2-d53f5a666e37', type: 'epm-packages-assets' },
          { id: '4acfbf69-7a27-5c58-9c99-7c86843d958f', type: 'epm-packages-assets' },
          { id: '938655df-b339-523c-a9e4-123c89c0e1e1', type: 'epm-packages-assets' },
          { id: 'eec4606c-dbfa-565b-8e9c-fce1e641f3fc', type: 'epm-packages-assets' },
          { id: 'ef67e7e0-dca3-5a62-a42a-745db5ad7c1f', type: 'epm-packages-assets' },
          { id: '64239d25-be40-5e10-94b5-f6b74b8c5474', type: 'epm-packages-assets' },
          { id: '071b5113-4c9f-5ee9-aafe-d098a4c066f6', type: 'epm-packages-assets' },
          { id: '498d8215-2613-5399-9a13-fa4f0bf513e2', type: 'epm-packages-assets' },
          { id: 'd2f87071-c866-503a-8fcb-7b23a8c7afbf', type: 'epm-packages-assets' },
          { id: '5a080eba-f482-545c-8695-6ccbd426b2a2', type: 'epm-packages-assets' },
          { id: '28523a82-1328-578d-84cb-800970560200', type: 'epm-packages-assets' },
          { id: 'cc1e3e1d-f27b-5d05-86f6-6e4b9a47c7dc', type: 'epm-packages-assets' },
          { id: '5c3aa147-089c-5084-beca-53c00e72ac80', type: 'epm-packages-assets' },
          { id: '0c8c3c6a-90cb-5f0e-8359-d807785b046c', type: 'epm-packages-assets' },
          { id: '48e582df-b1d2-5f88-b6ea-ba1fafd3a569', type: 'epm-packages-assets' },
          { id: '7f97600c-d983-53e0-ae2a-a59bf35d7f0d', type: 'epm-packages-assets' },
          { id: 'bf3b0b65-9fdc-53c6-a9ca-e76140e56490', type: 'epm-packages-assets' },
          { id: '7f4c5aca-b4f5-5f0a-95af-051da37513fc', type: 'epm-packages-assets' },
          { id: '4281a436-45a8-54ab-9724-fda6849f789d', type: 'epm-packages-assets' },
          { id: '2e56f08b-1d06-55ed-abee-4708e1ccf0aa', type: 'epm-packages-assets' },
          { id: '4035007b-9c33-5227-9803-2de8a17523b5', type: 'epm-packages-assets' },
          { id: 'e6ae7d31-6920-5408-9219-91ef1662044b', type: 'epm-packages-assets' },
          { id: 'c7bf1a39-e057-58a0-afde-fb4b48751d8c', type: 'epm-packages-assets' },
          { id: '8c665f28-a439-5f43-b5fd-8fda7b576735', type: 'epm-packages-assets' },
        ],
        name: 'all_assets',
        version: '0.2.0',
        removable: true,
        install_version: '0.2.0',
        install_status: 'installed',
        install_started_at: res.attributes.install_started_at,
        install_source: 'registry',
      });
    });
  });
}
