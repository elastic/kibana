/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export function AddCisIntegrationFormPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

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
      const stringProjectId = prjID ? prjID : '<PROJECT_ID>';
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
      const textField = await testSubjects.find(selector);
      await textField.type(text);
    },

    chooseDropDown: async (selector: string, text: string) => {
      const credentialTypeBox = await testSubjects.find(selector);
      const chosenOption = await testSubjects.find(text);
      await credentialTypeBox.click();
      await chosenOption.click();
    },

    getFieldValueInEditPage: async (field: string) => {
      /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
      const integrationList = await testSubjects.findAll('integrationNameLink');
      await integrationList[0].click();
      const fieldValue = await (await testSubjects.find(field)).getAttribute('value');
      return fieldValue;
    },
  };

  const navigateToAddIntegrationCspmPage = async () => {
    await PageObjects.common.navigateToUrl(
      'fleet', // Defined in Security Solution plugin
      'integrations/cloud_security_posture/add-integration/cspm',
      { shouldUseHashForSubUrl: false }
    );
  };

  const navigateToIntegrationCspList = async () => {
    await PageObjects.common.navigateToActualUrl(
      'integrations', // Defined in Security Solution plugin
      '/detail/cloud_security_posture/policies'
    );
  };

  return {
    cisGcp,
    navigateToAddIntegrationCspmPage,
    navigateToIntegrationCspList,
  };
}
