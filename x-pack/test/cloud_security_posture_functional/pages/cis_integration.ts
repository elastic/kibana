/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FtrProviderContext } from '../ftr_provider_context';
import { setupFleetAndAgents } from 'x-pack/test/fleet_api_integration/apis/agents/services';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'cloudPostureDashboard', 'cisAddIntegration']);
  const chance = new Chance();
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  let agentPolicyId: string;

  const data = [
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
        },
      },
      cluster_id: 'Upper case cluster id',
    },
  ];

  describe('CIS Integration', function () {
    this.tags(['cloud_security_posture_cis_integration']);
    let cspDashboard: typeof pageObjects.cloudPostureDashboard;
    let cisIntegrationGcp: typeof pageObjects.cisAddIntegration.cisGcp;
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    //setupFleetAndAgents(providerContext);
    // before(async () => { 
    //     await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    //     const getPkRes = await supertest
    //       .get(`/api/fleet/epm/packages/fleet_server`)
    //       .set('kbn-xsrf', 'xxxx')
    //       .expect(200);
    //     const pkgVersion = getPkRes.body.item.version;
    //     await supertest
    //       .post(`/api/fleet/epm/packages/fleet_server/${pkgVersion}`)
    //       .set('kbn-xsrf', 'xxxx')
    //       .send({ force: true })
    //       .expect(200);

    //     const { body: agentPolicyResponse } = await supertest
    //       .post(`/api/fleet/agent_policies`)
    //       .set('kbn-xsrf', 'xxxx')
    //       .send({
    //         name: 'Test policy a1',
    //         namespace: 'default',
    //       });

    //     agentPolicyId = agentPolicyResponse.item.id;

    //     await supertest
    //       .post(`/api/fleet/fleet_server_hosts`)
    //       .set('kbn-xsrf', 'xxxx')
    //       .send({
    //         id: 'test-default-a1',
    //         name: 'Default',
    //         is_default: true,
    //         host_urls: ['https://test.com:8080', 'https://test.com:8081'],
    //       })
    //       .expect(200);
    // })

    beforeEach(async () => {
      cspDashboard = pageObjects.cloudPostureDashboard;

      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationGcp = pageObjects.cisAddIntegration.cisGcp;

      await cisIntegration.waitForPluginInitialized();

      await cspDashboard.index.add(data);
      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('CIS_GCP Organization', () => {
      it('Switch between Manual and Google cloud shell', async () => {
        
        await cisIntegrationGcp.clickOptionButton('GCP')
        await cisIntegrationGcp.clickOptionButton('GCP Organization')
        await cisIntegrationGcp.clickOptionButton('Manual')
        /* Check for existing fields. In Manual, Credential field should be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist('Project ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Organization ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Credential')) === 1).to.be(true);

        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell')
        /* Check for existing fields. In Google Cloud Shell, Credential field should NOT be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist('Project ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Organization ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Credential')) === 0).to.be(true);
      });

      it('Post Installation modal pops up after user clicks on Save button when adding integration', async () => {
        
        await cisIntegrationGcp.clickOptionButton('GCP')
        await cisIntegrationGcp.clickOptionButton('GCP Organization')
        await cisIntegrationGcp.clickOptionButton('Manual')
        await cisIntegrationGcp.clickSaveButton()
        // await retry.waitForWithTimeout(
        //     'CIS GCP Cloud Shell Integration to be added',
        //     20000,
        //     async () => !!cisIntegrationGcp.getPostInstallModal()
        //   );
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value', async () => {
        
        await cisIntegrationGcp.clickOptionButton('GCP')
        await cisIntegrationGcp.clickOptionButton('GCP Organization')
        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell')
        await cisIntegrationGcp.clickSaveButton()
        // await retry.waitForWithTimeout(
        //     'CIS GCP Cloud Shell Integration to be added',
        //     20000,
        //     async () => !!cisIntegrationGcp.getPostInstallGoogleCloudShellModal(true)
        //   );
        expect((await cisIntegrationGcp.getPostInstallGoogleCloudShellModal(true)) === true).to.be(true);
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const organizationName = 'ORG_NAME_TEST'
        await cisIntegrationGcp.clickOptionButton('GCP')
        await cisIntegrationGcp.clickOptionButton('GCP Organization')
        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell')
        await cisIntegrationGcp.fillInTextField('project_id_test_id', projectName)
        await cisIntegrationGcp.fillInTextField('organization_id_test_id', organizationName)
        
        await cisIntegrationGcp.clickSaveButton()
        // await retry.waitForWithTimeout(
        //     'CIS GCP Cloud Shell Integration to be added',
        //     20000,
        //     async () => !!cisIntegrationGcp.getPostInstallGoogleCloudShellModal(true)
        //   );
        expect((await cisIntegrationGcp.getPostInstallGoogleCloudShellModal(true, organizationName, projectName)) === true).to.be(true);
      });
    });
  });
}
