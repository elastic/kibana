/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { AssetReference } from '../../../../plugins/fleet/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');
  const es = getService('es');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';
  const pkgKey = `${pkgName}-${pkgVersion}`;
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('installs and uninstalls all assets', async () => {
    describe('installs all assets when installing a package for the first time', async () => {
      skipIfNoDockerRegistry(providerContext);
      before(async () => {
        if (!server.enabled) return;
        await installPackage(pkgKey);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgKey);
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
      skipIfNoDockerRegistry(providerContext);
      before(async () => {
        if (!server.enabled) return;
        // these tests ensure that uninstall works properly so make sure that the package gets installed and uninstalled
        // and then we'll test that not artifacts are left behind.
        await installPackage(pkgKey);
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
      it('should have uninstalled the transforms', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_transform/${pkgName}-test-default-${pkgVersion}`,
          },
          {
            ignore: [404],
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
      });
      it('should have removed the fields from the index patterns', async () => {
        // The reason there is an expect inside the try and inside the catch in this test case is to guard against two
        // different scenarios.
        //
        // If a test case in another file calls /setup then the system and endpoint packages will be installed and
        // will be present for the remainder of the tests (because they cannot be removed). If that is the case the
        // expect in the try will work because the logs-* and metrics-* index patterns will still be present even
        // after this test uninstalls its package.
        //
        // If /setup was never called prior to this test, when the test package is uninstalled the index pattern code
        // checks to see if there are no packages installed and completely removes the logs-* and metrics-* index
        // patterns. If that happens this code will throw an error and indicate that the index pattern being searched
        // for was completely removed. In this case the catch's expect will test to make sure the error thrown was
        // a 404 because all of the packages have been removed.
        try {
          const resIndexPatternLogs = await kibanaServer.savedObjects.get({
            type: 'index-pattern',
            id: 'logs-*',
          });
          const fields = JSON.parse(resIndexPatternLogs.attributes.fields);
          const exists = fields.find((field: { name: string }) => field.name === 'logs_test_name');
          expect(exists).to.be(undefined);
        } catch (err) {
          // if all packages are uninstalled there won't be a logs-* index pattern
          expect(err.response.data.statusCode).equal(404);
        }

        try {
          const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
            type: 'index-pattern',
            id: 'metrics-*',
          });
          const fieldsMetrics = JSON.parse(resIndexPatternMetrics.attributes.fields);
          const existsMetrics = fieldsMetrics.find(
            (field: { name: string }) => field.name === 'metrics_test_name'
          );
          expect(existsMetrics).to.be(undefined);
        } catch (err) {
          // if all packages are uninstalled there won't be a metrics-* index pattern
          expect(err.response.data.statusCode).equal(404);
        }
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
      skipIfNoDockerRegistry(providerContext);
      before(async () => {
        if (!server.enabled) return;
        await installPackage(pkgKey);
        // reinstall
        await installPackage(pkgKey);
      });
      after(async () => {
        if (!server.enabled) return;
        await uninstallPackage(pkgKey);
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
  es: any;
  kibanaServer: any;
}) => {
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
    const resPipeline1 = await es.transport.request({
      method: 'GET',
      path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline1`,
    });
    expect(resPipeline1.statusCode).equal(200);
    const resPipeline2 = await es.transport.request({
      method: 'GET',
      path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline2`,
    });
    expect(resPipeline2.statusCode).equal(200);
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
  it('should have installed the transform components', async function () {
    const res = await es.transport.request({
      method: 'GET',
      path: `/_transform/${pkgName}.test-default-${pkgVersion}`,
    });
    expect(res.statusCode).equal(200);
  });
  it('should have created the index for the transform', async function () {
    // the  index is defined in the transform file
    const res = await es.transport.request({
      method: 'GET',
      path: `/logs-all_assets.test_log_current_default`,
    });
    expect(res.statusCode).equal(200);
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
  it('should create an index pattern with the package fields', async () => {
    const resIndexPatternLogs = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'logs-*',
    });
    const fields = JSON.parse(resIndexPatternLogs.attributes.fields);
    const exists = fields.find((field: { name: string }) => field.name === 'logs_test_name');
    expect(exists).not.to.be(undefined);
    const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'metrics-*',
    });
    const fieldsMetrics = JSON.parse(resIndexPatternMetrics.attributes.fields);
    const metricsExists = fieldsMetrics.find(
      (field: { name: string }) => field.name === 'metrics_test_name'
    );
    expect(metricsExists).not.to.be(undefined);
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
          id: 'sample_search',
          type: 'search',
        },
        {
          id: 'sample_visualization',
          type: 'visualization',
        },
      ],
      installed_es: [
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
          id: 'all_assets.test-default-0.1.0',
          type: 'transform',
        },
      ],
      es_index_patterns: {
        test_logs: 'logs-all_assets.test_logs-*',
        test_metrics: 'metrics-all_assets.test_metrics-*',
      },
      package_assets: [
        { id: '333a22a1-e639-5af5-ae62-907ffc83d603', type: 'epm-packages-assets' },
        { id: '256f3dad-6870-56c3-80a1-8dfa11e2d568', type: 'epm-packages-assets' },
        { id: '3fa0512f-bc01-5c2e-9df1-bc2f2a8259c8', type: 'epm-packages-assets' },
        { id: 'ea334ad8-80c2-5acd-934b-2a377290bf97', type: 'epm-packages-assets' },
        { id: '96c6eb85-fe2e-56c6-84be-5fda976796db', type: 'epm-packages-assets' },
        { id: '2d73a161-fa69-52d0-aa09-1bdc691b95bb', type: 'epm-packages-assets' },
        { id: '0a00c2d2-ce63-5b9c-9aa0-0cf1938f7362', type: 'epm-packages-assets' },
        { id: 'b36e6dd0-58f7-5dd0-a286-8187e4019274', type: 'epm-packages-assets' },
        { id: 'f839c76e-d194-555a-90a1-3265a45789e4', type: 'epm-packages-assets' },
        { id: '9af7bbb3-7d8a-50fa-acc9-9dde6f5efca2', type: 'epm-packages-assets' },
        { id: '1e97a20f-9d1c-529b-8ff2-da4e8ba8bb71', type: 'epm-packages-assets' },
        { id: '8cfe0a2b-7016-5522-87e4-6d352360d1fc', type: 'epm-packages-assets' },
        { id: 'bd5ff3c5-655e-5385-9918-b60ff3040aad', type: 'epm-packages-assets' },
        { id: '0954ce3b-3165-5c1f-a4c0-56eb5f2fa487', type: 'epm-packages-assets' },
        { id: '60d6d054-57e4-590f-a580-52bf3f5e7cca', type: 'epm-packages-assets' },
        { id: '47758dc2-979d-5fbe-a2bd-9eded68a5a43', type: 'epm-packages-assets' },
        { id: '318959c9-997b-5a14-b328-9fc7355b4b74', type: 'epm-packages-assets' },
        { id: 'e786cbd9-0f3b-5a0b-82a6-db25145ebf58', type: 'epm-packages-assets' },
        { id: '53c94591-aa33-591d-8200-cd524c2a0561', type: 'epm-packages-assets' },
        { id: 'b658d2d4-752e-54b8-afc2-4c76155c1466', type: 'epm-packages-assets' },
      ],
      name: 'all_assets',
      version: '0.1.0',
      internal: false,
      removable: true,
      install_version: '0.1.0',
      install_status: 'installed',
      install_started_at: res.attributes.install_started_at,
      install_source: 'registry',
    });
  });
};
