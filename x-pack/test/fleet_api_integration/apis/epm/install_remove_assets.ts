/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { AssetReference } from '../../../../plugins/fleet/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');
  const es: Client = getService('es');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';
  const logsTemplateName = `logs-${pkgName}.test_logs`;
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

  describe('installs and uninstalls all assets', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    describe('installs all assets when installing a package for the first time', async () => {
      before(async () => {
        if (!server.enabled) return;
        await installPackage(pkgName, pkgVersion);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgName, pkgVersion);
      });
      expectAssetsInstalled({
        logsTemplateName,
        metricsTemplateName,
        pkgVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });

    describe('uninstalls all assets when uninstalling a package', async () => {
      before(async () => {
        if (!server.enabled) return;
        // these tests ensure that uninstall works properly so make sure that the package gets installed and uninstalled
        // and then we'll test that not artifacts are left behind.
        await installPackage(pkgName, pkgVersion);
        await uninstallPackage(pkgName, pkgVersion);
      });
      it('should have uninstalled the index templates', async function () {
        const resLogsTemplate = await es.transport.request(
          {
            method: 'GET',
            path: `/_index_template/${logsTemplateName}`,
          },
          {
            ignore: [404],
            meta: true,
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
            meta: true,
          }
        );
        expect(resMetricsTemplate.statusCode).equal(404);
      });
      it('should have uninstalled the component templates', async function () {
        const resPackage = await es.transport.request(
          {
            method: 'GET',
            path: `/_component_template/${logsTemplateName}@package`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resPackage.statusCode).equal(404);

        const resUserSettings = await es.transport.request(
          {
            method: 'GET',
            path: `/_component_template/${logsTemplateName}@custom`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resUserSettings.statusCode).equal(404);
      });
      it('should have uninstalled the pipelines', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}`,
          },
          {
            ignore: [404],
            meta: true,
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
            meta: true,
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
            meta: true,
          }
        );
        expect(resPipeline2.statusCode).equal(404);
      });
      it('should have uninstalled the ml model', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_ml/trained_models/default`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(res.statusCode).equal(404);
      });
      it('should have uninstalled the transforms', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_transform/${pkgName}-test-default-${pkgVersion}`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(res.statusCode).equal(404);
      });
      it('should have deleted the index for the transform', async function () {
        // the  index is defined in the transform file
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/logs-all_assets.test_log_current_default`,
          },
          {
            ignore: [404],
            meta: true,
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
        let resIndexPattern;
        try {
          resIndexPattern = await kibanaServer.savedObjects.get({
            type: 'index-pattern',
            id: 'test-*',
          });
        } catch (err) {
          resIndexPattern = err;
        }
        expect(resIndexPattern.response.data.statusCode).equal(404);
        let resOsqueryPackAsset;
        try {
          resOsqueryPackAsset = await kibanaServer.savedObjects.get({
            type: 'osquery-pack-asset',
            id: 'sample_osquery_pack_asset',
          });
        } catch (err) {
          resOsqueryPackAsset = err;
        }
        expect(resOsqueryPackAsset.response.data.statusCode).equal(404);
        let resOsquerySavedQuery;
        try {
          resOsquerySavedQuery = await kibanaServer.savedObjects.get({
            type: 'osquery-saved-query',
            id: 'sample_osquery_saved_query',
          });
        } catch (err) {
          resOsquerySavedQuery = err;
        }
        expect(resOsquerySavedQuery.response.data.statusCode).equal(404);
      });
      it('should have removed the saved object', async function () {
        let res;
        try {
          res = await kibanaServer.savedObjects.get({
            type: 'epm-packages',
            id: 'all_assets',
          });
        } catch (err) {
          res = err;
        }
        expect(res.response.data.statusCode).equal(404);
      });
    });

    describe('reinstalls all assets', async () => {
      before(async () => {
        if (!server.enabled) return;
        await installPackage(pkgName, pkgVersion);
        // reinstall
        await installPackage(pkgName, pkgVersion);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgName, pkgVersion);
      });
      expectAssetsInstalled({
        logsTemplateName,
        metricsTemplateName,
        pkgVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });
  });
}

const expectAssetsInstalled = ({
  logsTemplateName,
  metricsTemplateName,
  pkgVersion,
  pkgName,
  es,
  kibanaServer,
}: {
  logsTemplateName: string;
  metricsTemplateName: string;
  pkgVersion: string;
  pkgName: string;
  es: Client;
  kibanaServer: any;
}) => {
  it('should have installed the ILM policy', async function () {
    const resPolicy = await es.transport.request(
      {
        method: 'GET',
        path: `/_ilm/policy/all_assets`,
      },
      { meta: true }
    );
    expect(resPolicy.statusCode).equal(200);
  });
  it('should have installed the index templates', async function () {
    const resLogsTemplate = await es.transport.request(
      {
        method: 'GET',
        path: `/_index_template/${logsTemplateName}`,
      },
      { meta: true }
    );
    expect(resLogsTemplate.statusCode).equal(200);

    const resMetricsTemplate = await es.transport.request(
      {
        method: 'GET',
        path: `/_index_template/${metricsTemplateName}`,
      },
      { meta: true }
    );
    expect(resMetricsTemplate.statusCode).equal(200);
  });
  it('should have installed the pipelines', async function () {
    const res = await es.transport.request(
      {
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}`,
      },
      { meta: true }
    );
    expect(res.statusCode).equal(200);
    const resPipeline1 = await es.transport.request(
      {
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline1`,
      },
      { meta: true }
    );
    expect(resPipeline1.statusCode).equal(200);
    const resPipeline2 = await es.transport.request(
      {
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline2`,
      },
      { meta: true }
    );
    expect(resPipeline2.statusCode).equal(200);
  });
  it('should have installed the ml model', async function () {
    const res = await es.transport.request(
      {
        method: 'GET',
        path: `_ml/trained_models/default`,
      },
      { meta: true }
    );
    expect(res.statusCode).equal(200);
  });
  it('should have installed the component templates', async function () {
    const resPackage = await es.transport.request(
      {
        method: 'GET',
        path: `/_component_template/${logsTemplateName}@package`,
      },
      { meta: true }
    );
    expect(resPackage.statusCode).equal(200);

    const resUserSettings = await es.transport.request(
      {
        method: 'GET',
        path: `/_component_template/${logsTemplateName}@custom`,
      },
      { meta: true }
    );
    expect(resUserSettings.statusCode).equal(200);
  });
  it('should have installed the kibana assets', async function () {
    // These are installed from Fleet along with every package
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

    // These are the assets from the package
    const resDashboard = await kibanaServer.savedObjects.get({
      type: 'dashboard',
      id: 'sample_dashboard',
    });
    expect(resDashboard.id).equal('sample_dashboard');
    expect(resDashboard.references.map((ref: any) => ref.id).includes('sample_tag')).equal(true);
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
    const resLens = await kibanaServer.savedObjects.get({
      type: 'lens',
      id: 'sample_lens',
    });
    expect(resLens.id).equal('sample_lens');
    const resMlModule = await kibanaServer.savedObjects.get({
      type: 'ml-module',
      id: 'sample_ml_module',
    });
    expect(resMlModule.id).equal('sample_ml_module');
    const resSecurityRule = await kibanaServer.savedObjects.get({
      type: 'security-rule',
      id: 'sample_security_rule',
    });
    expect(resSecurityRule.id).equal('sample_security_rule');
    const resOsqueryPackAsset = await kibanaServer.savedObjects.get({
      type: 'osquery-pack-asset',
      id: 'sample_osquery_pack_asset',
    });
    expect(resOsqueryPackAsset.id).equal('sample_osquery_pack_asset');
    const resOsquerySavedObject = await kibanaServer.savedObjects.get({
      type: 'osquery-saved-query',
      id: 'sample_osquery_saved_query',
    });
    expect(resOsquerySavedObject.id).equal('sample_osquery_saved_query');
    const resCloudSecurityPostureRuleTemplate = await kibanaServer.savedObjects.get({
      type: 'csp-rule-template',
      id: 'sample_csp_rule_template',
    });
    expect(resCloudSecurityPostureRuleTemplate.id).equal('sample_csp_rule_template');
    const resTag = await kibanaServer.savedObjects.get({
      type: 'tag',
      id: 'sample_tag',
    });
    expect(resTag.id).equal('sample_tag');
    const resIndexPattern = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'test-*',
    });
    expect(resIndexPattern.id).equal('test-*');

    let resInvalidTypeIndexPattern;
    try {
      resInvalidTypeIndexPattern = await kibanaServer.savedObjects.get({
        type: 'invalid-type',
        id: 'invalid',
      });
    } catch (err) {
      resInvalidTypeIndexPattern = err;
    }
    expect(resInvalidTypeIndexPattern.response.data.statusCode).equal(404);
  });
  it('should not add fields to the index patterns', async () => {
    const resIndexPatternLogs = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'logs-*',
    });
    const logsAttributes = resIndexPatternLogs.attributes;
    expect(logsAttributes.fields).to.be(undefined);
    const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'metrics-*',
    });
    const metricsAttributes = resIndexPatternMetrics.attributes;
    expect(metricsAttributes.fields).to.be(undefined);
  });
  it('should have created the correct saved object', async function () {
    const res = await kibanaServer.savedObjects.get({
      type: 'epm-packages',
      id: 'all_assets',
    });
    // during a reinstall the items can change
    const sortedRes = {
      ...res.attributes,
      installed_kibana: sortBy(res.attributes.installed_kibana, (o: AssetReference) => o.type),
      installed_es: sortBy(res.attributes.installed_es, (o: AssetReference) => o.type),
      package_assets: sortBy(res.attributes.package_assets, (o: AssetReference) => o.type),
    };
    expect(sortedRes).eql({
      installed_kibana: [
        {
          id: 'sample_csp_rule_template',
          type: 'csp-rule-template',
        },
        {
          id: 'sample_dashboard',
          type: 'dashboard',
        },
        {
          id: 'sample_dashboard2',
          type: 'dashboard',
        },
        {
          id: 'test-*',
          type: 'index-pattern',
        },
        {
          id: 'sample_lens',
          type: 'lens',
        },
        {
          id: 'sample_ml_module',
          type: 'ml-module',
        },
        {
          id: 'sample_osquery_pack_asset',
          type: 'osquery-pack-asset',
        },
        {
          id: 'sample_osquery_saved_query',
          type: 'osquery-saved-query',
        },
        {
          id: 'sample_search',
          type: 'search',
        },
        {
          id: 'sample_security_rule',
          type: 'security-rule',
        },
        {
          id: 'sample_tag',
          type: 'tag',
        },
        {
          id: 'sample_visualization',
          type: 'visualization',
        },
      ],
      installed_kibana_space_id: 'default',
      installed_es: [
        {
          id: 'logs-all_assets.test_logs@package',
          type: 'component_template',
        },
        {
          id: 'logs-all_assets.test_logs@custom',
          type: 'component_template',
        },
        {
          id: 'metrics-all_assets.test_metrics@package',
          type: 'component_template',
        },
        {
          id: 'metrics-all_assets.test_metrics@custom',
          type: 'component_template',
        },
        {
          id: 'logs-all_assets.test_logs-all_assets',
          type: 'data_stream_ilm_policy',
        },
        {
          id: 'metrics-all_assets.test_metrics-all_assets',
          type: 'data_stream_ilm_policy',
        },
        {
          id: 'logs-all_assets.test_logs',
          type: 'index_template',
        },
        {
          id: 'metrics-all_assets.test_metrics',
          type: 'index_template',
        },
        {
          id: 'logs-all_assets.test_logs-0.1.0',
          type: 'ingest_pipeline',
        },
        {
          id: 'logs-all_assets.test_logs-0.1.0-pipeline1',
          type: 'ingest_pipeline',
        },
        {
          id: 'logs-all_assets.test_logs-0.1.0-pipeline2',
          type: 'ingest_pipeline',
        },
        {
          id: 'default',
          type: 'ml_model',
        },
      ],
      package_assets: [
        {
          id: '333a22a1-e639-5af5-ae62-907ffc83d603',
          type: 'epm-packages-assets',
        },
        {
          id: '256f3dad-6870-56c3-80a1-8dfa11e2d568',
          type: 'epm-packages-assets',
        },
        {
          id: '3fa0512f-bc01-5c2e-9df1-bc2f2a8259c8',
          type: 'epm-packages-assets',
        },
        {
          id: 'ea334ad8-80c2-5acd-934b-2a377290bf97',
          type: 'epm-packages-assets',
        },
        {
          id: '96c6eb85-fe2e-56c6-84be-5fda976796db',
          type: 'epm-packages-assets',
        },
        {
          id: '2d73a161-fa69-52d0-aa09-1bdc691b95bb',
          type: 'epm-packages-assets',
        },
        {
          id: '0a00c2d2-ce63-5b9c-9aa0-0cf1938f7362',
          type: 'epm-packages-assets',
        },
        {
          id: '691f0505-18c5-57a6-9f40-06e8affbdf7a',
          type: 'epm-packages-assets',
        },
        {
          id: 'b36e6dd0-58f7-5dd0-a286-8187e4019274',
          type: 'epm-packages-assets',
        },
        {
          id: 'f839c76e-d194-555a-90a1-3265a45789e4',
          type: 'epm-packages-assets',
        },
        {
          id: '9af7bbb3-7d8a-50fa-acc9-9dde6f5efca2',
          type: 'epm-packages-assets',
        },
        {
          id: '1e97a20f-9d1c-529b-8ff2-da4e8ba8bb71',
          type: 'epm-packages-assets',
        },
        {
          id: 'ed5d54d5-2516-5d49-9e61-9508b0152d2b',
          type: 'epm-packages-assets',
        },
        {
          id: 'bd5ff3c5-655e-5385-9918-b60ff3040aad',
          type: 'epm-packages-assets',
        },
        {
          id: '943d5767-41f5-57c3-ba02-48e0f6a837db',
          type: 'epm-packages-assets',
        },
        {
          id: '0954ce3b-3165-5c1f-a4c0-56eb5f2fa487',
          type: 'epm-packages-assets',
        },
        {
          id: '60d6d054-57e4-590f-a580-52bf3f5e7cca',
          type: 'epm-packages-assets',
        },
        {
          id: '47758dc2-979d-5fbe-a2bd-9eded68a5a43',
          type: 'epm-packages-assets',
        },
        {
          id: '318959c9-997b-5a14-b328-9fc7355b4b74',
          type: 'epm-packages-assets',
        },
        {
          id: 'e21b59b5-eb76-5ab0-bef2-1c8e379e6197',
          type: 'epm-packages-assets',
        },
        {
          id: '4c758d70-ecf1-56b3-b704-6d8374841b34',
          type: 'epm-packages-assets',
        },
        {
          id: '313ddb31-e70a-59e8-8287-310d4652a9b7',
          type: 'epm-packages-assets',
        },
        {
          id: 'e786cbd9-0f3b-5a0b-82a6-db25145ebf58',
          type: 'epm-packages-assets',
        },
        {
          id: 'd8b175c3-0d42-5ec7-90c1-d1e4b307a4c2',
          type: 'epm-packages-assets',
        },
        {
          id: 'b265a5e0-c00b-5eda-ac44-2ddbd36d9ad0',
          type: 'epm-packages-assets',
        },
        {
          id: '53c94591-aa33-591d-8200-cd524c2a0561',
          type: 'epm-packages-assets',
        },
        {
          id: 'b658d2d4-752e-54b8-afc2-4c76155c1466',
          type: 'epm-packages-assets',
        },
      ],
      es_index_patterns: {
        test_logs: 'logs-all_assets.test_logs-*',
        test_metrics: 'metrics-all_assets.test_metrics-*',
      },
      name: 'all_assets',
      version: '0.1.0',
      removable: true,
      install_version: '0.1.0',
      install_status: 'installed',
      install_started_at: res.attributes.install_started_at,
      install_source: 'registry',
    });
  });
};
