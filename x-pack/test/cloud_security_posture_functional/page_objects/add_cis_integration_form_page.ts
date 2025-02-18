/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { setTimeout as sleep } from 'node:timers/promises';
import expect from '@kbn/expect';
import { testSubjectIds } from '../constants/test_subject_ids';
import type { FtrProviderContext } from '../ftr_provider_context';

export function AddCisIntegrationFormPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
  const browser = getService('browser');
  const logger = getService('log');

  const AWS_CREDENTIAL_SELECTOR = 'aws-credentials-type-selector';

  const cisAzure = {
    getPostInstallArmTemplateModal: async () => {
      return await testSubjects.find('postInstallAzureArmTemplateModal');
    },
  };

  const cisAws = {
    getUrlValueInEditPage: async () => {
      /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
      const fieldValue = await (await testSubjects.find('externalLink')).getAttribute('href');
      return fieldValue;
    },

    getPostInstallCloudFormationModal: async () => {
      return await testSubjects.find('postInstallCloudFormationModal');
    },
    showPostInstallCloudFormationModal: async () => {
      return await testSubjects.exists('postInstallCloudFormationModal');
    },
    showLaunchCloudFormationAgentlessButton: async () => {
      return await testSubjects.exists('launchCloudFormationAgentlessButton');
    },
  };

  const cisGcp = {
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

    doesStringExistInCodeBlock: async (str: string) => {
      const flyout = await testSubjects.find('agentEnrollmentFlyout');
      const codeBlock = await flyout.findByXpath('//code');
      const commandsToBeCopied = await codeBlock.getVisibleText();
      return commandsToBeCopied.includes(str);
    },

    getFieldValueInAddAgentFlyout: async (field: string, value: string) => {
      /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
      const integrationList = await testSubjects.findAll('agentEnrollmentFlyout');
      await integrationList[0].click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const fieldValue = (await (await testSubjects.find(field)).getAttribute(value)) ?? '';
      return fieldValue;
    },
    showLaunchCloudShellAgentlessButton: async () => {
      return await testSubjects.exists('launchGoogleCloudShellAgentlessButton');
    },
  };

  const isRadioButtonChecked = async (selector: string) => {
    const page = await testSubjects.find('dataCollectionSetupStep');
    const findCheckedButton = await page.findAllByCssSelector(`input[id="${selector}"]:checked`);
    if (findCheckedButton.length === 0) return false;
    return true;
  };

  const getUrlOnPostInstallModal = async () => {
    /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
    const fieldValue = await (await testSubjects.find('externalLink')).getAttribute('href');
    return fieldValue;
  };

  const navigateToAddIntegrationCspmPage = async (space?: string) => {
    const options = space
      ? {
          basePath: `/s/${space}`,
          shouldUseHashForSubUrl: false,
        }
      : {
          shouldUseHashForSubUrl: false,
        };

    await PageObjects.common.navigateToUrl(
      'fleet', // Defined in Security Solution plugin
      'integrations/cloud_security_posture/add-integration/cspm',
      options
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const navigateToAddIntegrationWithVersionPage = async (
    packageVersion: string,
    space?: string
  ) => {
    const options = space
      ? {
          basePath: `/s/${space}`,
          shouldUseHashForSubUrl: false,
        }
      : {
          shouldUseHashForSubUrl: false,
        };

    await PageObjects.common.navigateToUrl(
      'fleet',
      `integrations/cloud_security_posture-${packageVersion}/add-integration`,
      options
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const navigateToAddIntegrationCspmWithVersionPage = async (
    packageVersion: string,
    space?: string
  ) => {
    const options = space
      ? {
          basePath: `/s/${space}`,
          shouldUseHashForSubUrl: false,
        }
      : {
          shouldUseHashForSubUrl: false,
        };

    await PageObjects.common.navigateToUrl(
      'fleet',
      `integrations/cloud_security_posture-${packageVersion}/add-integration/cspm`,
      options
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const navigateToAddIntegrationCnvmPage = async (space?: string) => {
    const options = space
      ? {
          basePath: `/s/${space}`,
          shouldUseHashForSubUrl: false,
        }
      : {
          shouldUseHashForSubUrl: false,
        };

    await PageObjects.common.navigateToUrl(
      'fleet', // Defined in Security Solution plugin
      'integrations/cloud_security_posture/add-integration/vuln_mgmt',
      options
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const navigateToEditIntegrationPage = async () => {
    await testSubjects.click('integrationNameLink');
  };

  const navigateToEditAgentlessIntegrationPage = async () => {
    await testSubjects.click('agentlessIntegrationNameLink');
  };

  const navigateToAddIntegrationKspmPage = async (space?: string) => {
    const options = space
      ? {
          basePath: `/s/${space}`,
          shouldUseHashForSubUrl: false,
        }
      : {
          shouldUseHashForSubUrl: false,
        };

    await PageObjects.common.navigateToUrl(
      'fleet', // Defined in Security Solution plugin
      'integrations/cloud_security_posture/add-integration/kspm',
      options
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const navigateToIntegrationCspList = async () => {
    await PageObjects.common.navigateToActualUrl(
      'integrations', // Defined in Security Solution plugin
      '/detail/cloud_security_posture/policies',
      {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
      }
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const clickPolicyToBeEdited = async (name: string) => {
    const table = await testSubjects.find('integrationPolicyTable');
    const integrationToBeEdited = await table.findByXpath(`//text()="${name}"`);
    await integrationToBeEdited.click();
  };

  const clickFirstElementOnIntegrationTable = async () => {
    const integrationList = await testSubjects.findAll('integrationNameLink');
    await integrationList[0].click();
  };

  const clickFirstElementOnIntegrationTableAddAgent = async () => {
    const integrationList = await testSubjects.findAll('addAgentButton');
    await integrationList[0].click();
  };

  const clickLaunchAndGetCurrentUrl = async (buttonId: string) => {
    const button = await testSubjects.find(buttonId);
    await button.click();
    // Wait a bit to allow the new tab to load the URL
    await sleep(3000);
    await browser.switchTab(1);
    const currentUrl = await browser.getCurrentUrl();
    await browser.closeCurrentWindow();
    await browser.switchTab(0);
    return currentUrl;
  };

  const getIntegrationFormEntirePage = () => testSubjects.find('dataCollectionSetupStep');

  const getIntegrationPolicyTable = () => testSubjects.find('integrationPolicyTable');

  const getIntegrationFormEditPage = () => testSubjects.find('editPackagePolicy_page');

  const findOptionInPage = async (text: string) => {
    await PageObjects.header.waitUntilLoadingHasFinished();
    const optionToBeClicked = await testSubjects.find(text);
    return await optionToBeClicked;
  };

  const clickAccordianButton = async (text: string) => {
    await PageObjects.header.waitUntilLoadingHasFinished();
    const advancedAccordian = await testSubjects.find(text);
    await advancedAccordian.scrollIntoView();
    await advancedAccordian.click();
  };

  const selectSetupTechnology = async (setupTechnology: 'agentless' | 'agent-based') => {
    const radioGroup = await testSubjects.find(testSubjectIds.SETUP_TECHNOLOGY_SELECTOR);
    const radio = await radioGroup.findByCssSelector(`input[value='${setupTechnology}']`);
    await radio.click();
  };

  const getSetupTechnologyRadio = async (setupTechnology: 'agentless' | 'agent-based') => {
    const radioGroup = await testSubjects.find(testSubjectIds.SETUP_TECHNOLOGY_SELECTOR);
    return await radioGroup.findByCssSelector(`input[value='${setupTechnology}']`);
  };

  const showSetupTechnologyComponent = async () => {
    return await testSubjects.exists(testSubjectIds.SETUP_TECHNOLOGY_SELECTOR);
  };

  const selectAwsCredentials = async (credentialType: 'direct' | 'temporary') => {
    await selectValue(
      AWS_CREDENTIAL_SELECTOR,
      credentialType === 'direct' ? 'direct_access_keys' : 'temporary_keys'
    );
  };

  const clickOptionButton = async (text: string) => {
    const optionToBeClicked = await findOptionInPage(text);
    await optionToBeClicked.scrollIntoView();
    await optionToBeClicked.click();
  };

  const clickSaveButton = async () => {
    const optionToBeClicked = await findOptionInPage('createPackagePolicySaveButton');
    await optionToBeClicked.click();
  };

  const clickSaveIntegrationButton = async () => {
    const optionToBeClicked = await findOptionInPage('saveIntegration');
    await optionToBeClicked.click();
  };

  const getPostInstallModal = async () => {
    return await testSubjects.find('confirmModalTitleText');
  };

  const checkIntegrationPliAuthBlockExists = async () => {
    return await testSubjects.exists('cloud-security-posture-integration-pli-auth-block');
  };

  const fillInTextField = async (selector: string, text: string) => {
    const textField = await testSubjects.find(selector);
    await textField.clearValueWithKeyboard();
    await textField.type(text);
  };

  const chooseDropDown = async (selector: string, text: string) => {
    const credentialTypeBox = await testSubjects.find(selector);
    const chosenOption = await testSubjects.find(text);
    await credentialTypeBox.click();
    await chosenOption.click();
  };

  const doesStringExistInCodeBlock = async (str: string) => {
    const flyout = await testSubjects.find('agentEnrollmentFlyout');
    const codeBlock = await flyout.findByXpath('//code');
    const commandsToBeCopied = await codeBlock.getVisibleText();
    return commandsToBeCopied.includes(str);
  };

  const getFieldValueInAddAgentFlyout = async (field: string, value: string) => {
    /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
    const integrationList = await testSubjects.findAll('agentEnrollmentFlyout');
    await integrationList[0].click();
    await PageObjects.header.waitUntilLoadingHasFinished();
    const fieldValue = await (await testSubjects.find(field)).getAttribute(value);
    return fieldValue;
  };

  const selectValue = async (selector: string, value: string) => {
    return testSubjects.selectValue(selector, value);
  };

  const getValueInEditPage = async (field: string) => {
    /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
    const fieldValue = await (await testSubjects.find(field)).getAttribute('value');
    return fieldValue;
  };

  const isOptionChecked = async (testId: string, id: string) => {
    const checkBox = await testSubjects.find(testId);
    return await (await checkBox.findByCssSelector(`input[id='${id}']`)).getAttribute('checked');
  };

  const getReplaceSecretButton = async (secretField: string) => {
    return await testSubjects.find(`button-replace-${secretField}`);
  };

  const inputUniqueIntegrationName = async () => {
    const flyout = await testSubjects.find('createPackagePolicy_page');
    const nameField = await flyout.findAllByCssSelector('input[id="name"]');
    await nameField[0].type(uuidv4());
  };

  const inputIntegrationName = async (text: string) => {
    const page = await testSubjects.find('createPackagePolicy_page');
    const nameField = await page.findAllByCssSelector('input[id="name"]');
    await nameField[0].clearValueWithKeyboard();
    await nameField[0].type(text);
  };

  const getSecretComponentReplaceButton = async (secretButtonSelector: string) => {
    const secretComponentReplaceButton = await testSubjects.find(secretButtonSelector);
    return secretComponentReplaceButton;
  };

  const getElementText = async (selector: string) => {
    const element = await testSubjects.find(selector);
    const text = await element.getVisibleText();
    return text;
  };

  const getFieldAttributeValue = async (field: string, attribute: string) => {
    const fieldValue = await (await testSubjects.find(field)).getAttribute(attribute);
    return fieldValue;
  };

  const getFieldValueInEditPage = async (field: string) => {
    /* Newly added/edited integration always shows up on top by default as such we can just always click the most top if we want to check for the latest one  */
    await navigateToEditIntegrationPage();
    const fieldValue = await getFieldAttributeValue(field, 'value');
    return fieldValue;
  };

  const fillOutAWSForm = async () => {
    const directAccessKeyId = 'directAccessKeyIdTest';
    const directAccessSecretKey = 'directAccessSecretKeyTest';

    await clickOptionButton(testSubjectIds.CIS_AWS_OPTION_TEST_ID);

    await selectSetupTechnology('agentless');
    await selectValue(testSubjectIds.AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');
    await fillInTextField(testSubjectIds.DIRECT_ACCESS_KEY_ID_TEST_ID, directAccessKeyId);
    await fillInTextField(testSubjectIds.DIRECT_ACCESS_SECRET_KEY_TEST_ID, directAccessSecretKey);
  };

  const fillOutGCPForm = async () => {
    const projectId = 'PRJ_NAME_TEST';
    const credentialJson = 'CRED_JSON_TEST_NAME';

    await clickOptionButton(testSubjectIds.CIS_GCP_OPTION_TEST_ID);
    await clickOptionButton(testSubjectIds.GCP_SINGLE_ACCOUNT_TEST_ID);
    await selectSetupTechnology('agentless');
    await fillInTextField(testSubjectIds.PRJ_ID_TEST_ID, projectId);
    await fillInTextField(testSubjectIds.CREDENTIALS_JSON_TEST_ID, credentialJson);
  };

  const fillOutForm = async (cloudProvider: 'aws' | 'gcp') => {
    switch (cloudProvider) {
      case 'aws':
        await fillOutAWSForm();
        break;
      case 'gcp':
        await fillOutGCPForm();
        break;
    }
  };

  const createAgentlessIntegration = async ({
    cloudProvider,
  }: {
    cloudProvider: 'aws' | 'gcp';
  }) => {
    // Navigate to the Integration CSPM to create an agentless integration
    await navigateToAddIntegrationCspmPage();
    await PageObjects.header.waitUntilLoadingHasFinished();

    await inputIntegrationName(`cloud_security_posture-${new Date().toISOString()}`);

    await fillOutForm(cloudProvider);

    // Click Save Button to create the Integration then navigate to Integration Policies Tab Page
    await clickSaveButton();
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const editAgentlessIntegration = async (testSubjectId: string, value: string) => {
    await navigateToIntegrationCspList();
    await PageObjects.header.waitUntilLoadingHasFinished();

    await navigateToEditAgentlessIntegrationPage();
    await PageObjects.header.waitUntilLoadingHasFinished();

    // Fill out form to edit an agentless integration
    await fillInTextField(testSubjectId, value);

    // TechDebt: This is a workaround to ensure the form is saved
    // const agentlessRadio = await getSetupTechnologyRadio('agentless');
    // const agentBasedRadio = await getSetupTechnologyRadio('agent-based');
    // expect(await agentlessRadio.isEnabled()).to.be(true);
    // expect(agentBasedRadio.isEnabled()).to.be(true);

    // Clicking Save Button updates and navigates to Integration Policies Tab Page
    await clickSaveIntegrationButton();
    await PageObjects.header.waitUntilLoadingHasFinished();

    // Check if the Direct Access Key is updated package policy api with successful toast
    expect(await testSubjects.exists('policyUpdateSuccessToast')).to.be(true);

    await navigateToEditAgentlessIntegrationPage();
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  const showSuccessfulToast = async (testSubjectId: string) => {
    return await testSubjects.exists(testSubjectId);
  };

  const getFirstCspmIntegrationPageIntegration = async () => {
    const integration = await testSubjects.find('integrationNameLink');
    return await integration.getVisibleText();
  };

  const getFirstCspmIntegrationPageAgentlessIntegration = async () => {
    const integration = await testSubjects.find('agentlessIntegrationNameLink');
    return await integration.getVisibleText();
  };

  const getFirstCspmIntegrationPageAgent = async () => {
    const agent = await testSubjects.find('agentPolicyNameLink');
    // this is assuming that the agent was just created therefor should be the first element
    return await agent.getVisibleText();
  };

  const getFirstCspmIntegrationPageAgentlessStatus = async () => {
    const agent = await testSubjects.find('agentlessStatusBadge');
    // this is assuming that the agent was just created therefor should be the first element
    return await agent.getVisibleText();
  };

  const getAgentBasedPolicyValue = async () => {
    const agentName = await testSubjects.find('createAgentPolicyNameField');
    return await agentName.getAttribute('value');
  };

  const closeAllOpenTabs = async () => {
    const handles = await browser.getAllWindowHandles();
    logger.debug(`Found ${handles.length} tabs to clean up`);
    try {
      // Keep the first tab and close all others in reverse order
      for (let i = handles.length - 1; i > 0; i--) {
        await browser.switchTab(i);
        await browser.closeCurrentWindow();
        logger.debug(`Closed tab ${i}`);
      }

      // Switch back to the first tab
      await browser.switchTab(0);
      logger.debug('Successfully closed all extra tabs and returned to main tab');
    } catch (err) {
      logger.error(`Error while closing tabs: ${err}`);
      // Attempt to return to first tab even if there was an error
      try {
        await browser.switchTab(0);
      } catch (switchErr) {
        logger.error(`Error switching back to first tab: ${switchErr}`);
      }
    }
  };

  return {
    cisAzure,
    cisAws,
    cisGcp,
    navigateToAddIntegrationWithVersionPage,
    navigateToAddIntegrationCspmPage,
    navigateToAddIntegrationCspmWithVersionPage,
    navigateToAddIntegrationCnvmPage,
    navigateToAddIntegrationKspmPage,
    navigateToIntegrationCspList,
    getUrlOnPostInstallModal,
    isRadioButtonChecked,
    clickPolicyToBeEdited,
    clickFirstElementOnIntegrationTable,
    clickFirstElementOnIntegrationTableAddAgent,
    clickLaunchAndGetCurrentUrl,
    getIntegrationFormEntirePage,
    getIntegrationPolicyTable,
    getIntegrationFormEditPage,
    findOptionInPage,
    clickOptionButton,
    selectAwsCredentials,
    selectSetupTechnology,
    getSetupTechnologyRadio,
    clickSaveButton,
    clickSaveIntegrationButton,
    clickAccordianButton,
    getPostInstallModal,
    fillInTextField,
    chooseDropDown,
    getFieldValueInEditPage,
    doesStringExistInCodeBlock,
    getFieldValueInAddAgentFlyout,
    selectValue,
    getValueInEditPage,
    isOptionChecked,
    checkIntegrationPliAuthBlockExists,
    getReplaceSecretButton,
    getSecretComponentReplaceButton,
    inputUniqueIntegrationName,
    getFieldAttributeValue,
    getElementText,
    createAgentlessIntegration,
    editAgentlessIntegration,
    testSubjectIds,
    inputIntegrationName,
    getFirstCspmIntegrationPageIntegration,
    getFirstCspmIntegrationPageAgentlessIntegration,
    getFirstCspmIntegrationPageAgent,
    getFirstCspmIntegrationPageAgentlessStatus,
    getAgentBasedPolicyValue,
    showSuccessfulToast,
    showSetupTechnologyComponent,
    navigateToEditIntegrationPage,
    navigateToEditAgentlessIntegrationPage,
    closeAllOpenTabs,
  };
}
