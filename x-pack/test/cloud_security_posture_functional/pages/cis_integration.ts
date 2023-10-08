/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const pageObjects = getPageObjects([
    'common',
    'cloudPostureDashboard',
    'cisAddIntegration',
    'header',
  ]);
  const chance = new Chance();
  const kibanaServer = getService('kibanaServer');

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
        await cisIntegrationGcp.clickOptionButton('GCP');
        await cisIntegrationGcp.clickOptionButton('GCP Organization');
        await cisIntegrationGcp.clickOptionButton('Manual');
        /* Check for existing fields. In Manual, Credential field should be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist('Project ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Organization ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Credential')) === 1).to.be(true);

        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell');
        /* Check for existing fields. In Google Cloud Shell, Credential field should NOT be visible */
        expect((await cisIntegrationGcp.checkGcpFieldExist('Project ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Organization ID')) === 1).to.be(true);
        expect((await cisIntegrationGcp.checkGcpFieldExist('Credential')) === 0).to.be(true);
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are no Project ID or Organization ID provided, it should use default value', async () => {
        await cisIntegrationGcp.clickOptionButton('GCP');
        await cisIntegrationGcp.clickOptionButton('GCP Organization');
        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell');
        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallGoogleCloudShellModal(true)) === true).to.be(
          true
        );
      });

      it('Post Installation Google Cloud Shell modal pops up after user clicks on Save button when adding integration, when there are Project ID or Organization ID provided, it should use that value', async () => {
        const projectName = 'PRJ_NAME_TEST';
        const organizationName = 'ORG_NAME_TEST';
        await cisIntegrationGcp.clickOptionButton('GCP');
        await cisIntegrationGcp.clickOptionButton('GCP Organization');
        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell');
        await cisIntegrationGcp.fillInTextField('project_id_test_id', projectName);
        await cisIntegrationGcp.fillInTextField('organization_id_test_id', organizationName);

        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect(
          (await cisIntegrationGcp.getPostInstallGoogleCloudShellModal(
            true,
            organizationName,
            projectName
          )) === true
        ).to.be(true);
      });

      it('Organization ID field on cloud shell command should only be shown if user chose Google Cloud Shell, if user chose Single Account it shouldn not show up', async () => {
        await cisIntegrationGcp.clickOptionButton('GCP');
        await cisIntegrationGcp.clickOptionButton('Single Account');
        await cisIntegrationGcp.clickOptionButton('Google Cloud Shell');

        await cisIntegrationGcp.clickSaveButton();
        pageObjects.header.waitUntilLoadingHasFinished();
        expect((await cisIntegrationGcp.getPostInstallGoogleCloudShellModal(false)) === true).to.be(
          true
        );
      });

      it('Users should be to Edit the Integration (change account type from Single to Organization in this case)', async () => {
        await cisIntegration.navigateToAddIntegrationCspList();
        await cisIntegrationGcp.clickPolicyToBeEdited('cspm-3');
        await cisIntegrationGcp.getOptionButtonEdit('Organization ID');
        expect((await cisIntegrationGcp.getOptionButtonEdit('Organization ID')) === 0);
        await cisIntegrationGcp.clickOptionButtonEdit('GCP Organization');
        await cisIntegrationGcp.clickOptionButtonEdit('Google Cloud Shell');
        await cisIntegrationGcp.clickSaveButtonEdit();
        pageObjects.header.waitUntilLoadingHasFinished();
        await cisIntegrationGcp.clickPolicyToBeEdited('cspm-1');
        expect((await cisIntegrationGcp.getOptionButtonEdit('Organization ID')) === 1);

        await new Promise((r) => setTimeout(r, 80000));
      });
    });
  });
}
