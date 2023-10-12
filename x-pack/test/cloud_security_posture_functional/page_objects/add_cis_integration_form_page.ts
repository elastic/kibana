/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export function AddCisIntegrationFormPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const cisGcp = {
    getIntegrationFormEntirePage: () => testSubjects.find('dataCollectionSetupStep'),

    getIntegrationPolicyTable: () => testSubjects.find('integrationPolicyTable'),

    getIntegrationFormEditPage: () => testSubjects.find('editPackagePolicy_page'),

    findOptionInPage: async (text: string) => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      const optionToBeClicked = await testSubjects.find(text);
      return await optionToBeClicked;
    },

    clickOptionButton: async (text: string) => {
      const optionToBeClicked = await cisGcp.findOptionInPage(text);
      await optionToBeClicked.click();
    },

    clickSaveButton: async () => {
      const optionToBeClicked = await cisGcp.findOptionInPage('createPackagePolicySaveButton');
      await optionToBeClicked.click();
    },

    getPostInstallModal: async () => {
      return await testSubjects.find('confirmModalTitleText');
    },

    isPostInstallGoogleCloudShellModal: async (isOrg: boolean, orgID?: string, prjID?: string) => {
      const googleCloudShellModal = await testSubjects.find('postInstallGoogleCloudShellModal');
      const googleCloudShellModalVisibleText = await googleCloudShellModal.getVisibleText();
      const stringProjectId = `cloud config set project ${prjID ? `${prjID}` : '<PROJECT_ID>'}`;
      const stringOrganizationId = orgID ? `ORG_ID=${orgID}` : 'ORG_ID=<ORGANIZATION_ID>';
      const orgIdExist = googleCloudShellModalVisibleText.includes(stringOrganizationId);
      const prjIdExist = googleCloudShellModalVisibleText.includes(stringProjectId);

      if (isOrg) {
        return orgIdExist === true && prjIdExist === true;
      } else {
        return orgIdExist === false && prjIdExist === true;
      }
    },

    checkGcpFieldExist: async (text: string) => {
      const field = await testSubjects.findAll(text);
      return field.length;
    },

    fillInTextField: async (selector: string, text: string) => {
      const test = await testSubjects.find(selector);
      await test.type(text);
    },
  };

  const navigateToAddIntegrationCspmPage = async () => {
    await PageObjects.common.navigateToUrl(
      'fleet', // Defined in Security Solution plugin
      'integrations/cloud_security_posture/add-integration/cspm',
      { shouldUseHashForSubUrl: false }
    );
  };

  return {
    cisGcp,
    navigateToAddIntegrationCspmPage,
    waitForPluginInitialized,
  };
}
