/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import clearAllApiKeys from './api_keys_helpers';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const es = getService('es');
  const pageObjects = getPageObjects(['common', 'apiKeys']);
  const log = getService('log');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const retry = getService('retry');

  const testRoles: Record<string, any> = {
    viewer: {
      cluster: ['all'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
          allow_restricted_indices: false,
        },
        {
          names: ['*'],
          privileges: ['monitor', 'read', 'view_index_metadata', 'read_cross_cluster'],
          allow_restricted_indices: true,
        },
      ],
      run_as: ['*'],
    },
  };

  async function ensureApiKeysExist(apiKeysNames: string[]) {
    await retry.try(async () => {
      for (const apiKeyName of apiKeysNames) {
        log.debug(`Checking if API key ("${apiKeyName}") exists.`);
        await pageObjects.apiKeys.ensureApiKeyExists(apiKeyName);
        log.debug(`API key ("${apiKeyName}") exists.`);
      }
    });
  }

  describe('Home page', function () {
    before(async () => {
      await clearAllApiKeys(es, log);
      await security.testUser.setRoles(['kibana_admin']);
      await pageObjects.common.navigateToApp('apiKeys');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    // https://www.elastic.co/guide/en/kibana/7.6/api-keys.html#api-keys-security-privileges
    it('Hides management link if user is not authorized', async () => {
      await testSubjects.missingOrFail('apiKeys');
    });

    it('Loads the app', async () => {
      await security.testUser.setRoles(['test_api_keys']);
      log.debug('Checking for Create API key call to action');
      await find.existsByLinkText('Create API key');
    });

    describe('creates API key', function () {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_api_keys']);
        await pageObjects.common.navigateToApp('apiKeys');

        // Delete any API keys created outside of these tests
        await pageObjects.apiKeys.bulkDeleteApiKeys();
      });

      afterEach(async () => {
        await pageObjects.apiKeys.deleteAllApiKeyOneByOne();
      });

      after(async () => {
        await clearAllApiKeys(es, log);
      });

      it('when submitting form, close dialog and displays new api key', async () => {
        const apiKeyName = 'Happy API Key';
        await pageObjects.apiKeys.clickOnPromptCreateApiKey();
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys/create');
        expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('Create API key');

        await pageObjects.apiKeys.setApiKeyName(apiKeyName);
        await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
        const newApiKeyCreation = await pageObjects.apiKeys.getNewApiKeyCreation();

        expect(await browser.getCurrentUrl()).to.not.contain(
          'app/management/security/api_keys/flyout'
        );
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.isApiKeyModalExists()).to.be(false);
        expect(newApiKeyCreation).to.be(`Created API key '${apiKeyName}'`);
      });

      it('with optional expiration, redirects back and displays base64', async () => {
        const apiKeyName = 'Happy expiration API key';
        await pageObjects.apiKeys.clickOnPromptCreateApiKey();
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys/create');

        await pageObjects.apiKeys.setApiKeyName(apiKeyName);
        await pageObjects.apiKeys.toggleCustomExpiration();
        await pageObjects.apiKeys.setApiKeyCustomExpiration('12');
        await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
        const newApiKeyCreation = await pageObjects.apiKeys.getNewApiKeyCreation();

        expect(await browser.getCurrentUrl()).to.not.contain(
          'app/management/security/api_keys/create'
        );
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.isApiKeyModalExists()).to.be(false);
        expect(newApiKeyCreation).to.be(`Created API key '${apiKeyName}'`);
      });
    });

    describe('Update API key', function () {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_api_keys']);
        await pageObjects.common.navigateToApp('apiKeys');

        // Delete any API keys created outside these tests
        await pageObjects.apiKeys.bulkDeleteApiKeys();
      });

      afterEach(async () => {
        await pageObjects.apiKeys.deleteAllApiKeyOneByOne();
      });

      after(async () => {
        await clearAllApiKeys(es, log);
      });

      it('should create a new API key, click the name of the new row, fill out and submit form, and display success message', async () => {
        // Create a key to updated
        const apiKeyName = 'Happy API Key to Update';

        await es.security.grantApiKey({
          api_key: {
            name: apiKeyName,
            expiration: '1d',
          },
          grant_type: 'password',
          run_as: 'test_user',
          username: 'elastic',
          password: 'changeme',
        });

        await browser.refresh();

        log.debug('API key created, moving on to update');

        // Update newly created API Key
        await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');

        await pageObjects.apiKeys.waitForSubmitButtonOnApiKeyFlyoutEnabled();

        expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('Update API key');

        // Verify name input box is not present
        expect(await pageObjects.apiKeys.isApiKeyNamePresent()).to.be(false);

        // Status should be displayed
        const apiKeyStatus = await pageObjects.apiKeys.getFlyoutApiKeyStatus();
        expect(await apiKeyStatus).to.be('Expires in a day');

        // Verify metadata is editable
        const apiKeyMetadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
        expect(await apiKeyMetadataSwitch.isEnabled()).to.be(true);

        // Verify restrict privileges is editable
        const apiKeyRestrictPrivilegesSwitch =
          await pageObjects.apiKeys.getRestrictPrivilegesSwitch();
        expect(await apiKeyRestrictPrivilegesSwitch.isEnabled()).to.be(true);

        // Toggle restrict privileges so the code editor shows up
        await apiKeyRestrictPrivilegesSwitch.click();

        // Toggle metadata switch so the code editor shows up
        await apiKeyMetadataSwitch.click();

        // wait for monaco editor model to be updated
        await pageObjects.common.sleep(300);

        // Check default value of restrict privileges and set value
        const restrictPrivilegesCodeEditorValue =
          await pageObjects.apiKeys.getCodeEditorValueByIndex(0);
        expect(restrictPrivilegesCodeEditorValue).to.be('{}');

        // Check default value of metadata and set value
        const metadataCodeEditorValue = await pageObjects.apiKeys.getCodeEditorValueByIndex(1);
        expect(metadataCodeEditorValue).to.be('{}');

        await pageObjects.apiKeys.setCodeEditorValueByIndex(0, JSON.stringify(testRoles));

        await pageObjects.apiKeys.setCodeEditorValueByIndex(1, '{"name":"metadataTest"}');

        // Submit values to update API key
        await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();

        // Get success message
        const updatedApiKeyToastText = await pageObjects.apiKeys.getApiKeyUpdateSuccessToast();
        expect(updatedApiKeyToastText).to.be(`Updated API key '${apiKeyName}'`);

        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.isApiKeyModalExists()).to.be(false);
      });
    });

    describe('Readonly API key', function () {
      this.tags('skipFIPS');
      before(async () => {
        await security.role.create('read_security_role', {
          elasticsearch: {
            cluster: ['read_security'],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.testUser.setRoles(['kibana_admin', 'test_api_keys']);
        await pageObjects.common.navigateToApp('apiKeys');

        // Delete any API keys created outside these tests
        await pageObjects.apiKeys.bulkDeleteApiKeys();
      });

      afterEach(async () => {
        await pageObjects.apiKeys.deleteAllApiKeyOneByOne();
      });

      after(async () => {
        await clearAllApiKeys(es, log);
      });

      it('should see readonly form elements', async () => {
        // Create a key to updated
        const apiKeyName = 'Happy API Key to View';

        await es.security.grantApiKey({
          api_key: {
            name: apiKeyName,
            expiration: '1d',
            metadata: { name: 'metadatatest' },
            role_descriptors: { ...testRoles },
          },
          grant_type: 'password',
          run_as: 'test_user',
          username: 'elastic',
          password: 'changeme',
        });

        await browser.refresh();

        log.debug('API key created, moving on to view');

        // Set testUsers roles to have the `read_security` cluster privilege
        await security.testUser.setRoles(['read_security_role']);

        // View newly created API Key
        await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);
        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('API key details');

        // Verify name input box is not present
        expect(await pageObjects.apiKeys.isApiKeyNamePresent()).to.be(false);

        // Status should be displayed
        const apiKeyStatus = await pageObjects.apiKeys.getFlyoutApiKeyStatus();
        expect(await apiKeyStatus).to.be('Expires in a day');

        const apiKeyMetadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
        const apiKeyRestrictPrivilegesSwitch =
          await pageObjects.apiKeys.getRestrictPrivilegesSwitch();

        // Verify metadata and restrict privileges switches are now disabled
        expect(await apiKeyMetadataSwitch.isEnabled()).to.be(false);
        expect(await apiKeyRestrictPrivilegesSwitch.isEnabled()).to.be(false);

        // Close flyout with cancel
        await pageObjects.apiKeys.clickCancelButtonOnApiKeyFlyout();

        // Undo `read_security_role`
        await security.testUser.setRoles(['kibana_admin', 'test_api_keys']);
      });

      it('should show the `API key details` flyout if the expiration date is passed', async () => {
        const apiKeyName = 'expired-key';

        await es.security.grantApiKey({
          api_key: {
            name: apiKeyName,
            expiration: '1ms',
          },
          grant_type: 'password',
          run_as: 'test_user',
          username: 'elastic',
          password: 'changeme',
        });

        await browser.refresh();

        log.debug('API key created, moving on to view');

        await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('API key details');

        // Verify name input box is not present
        expect(await pageObjects.apiKeys.isApiKeyNamePresent()).to.be(false);

        // Status should be displayed
        const apiKeyStatus = await pageObjects.apiKeys.getFlyoutApiKeyStatus();
        expect(await apiKeyStatus).to.be('Expired');

        const apiKeyMetadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
        const apiKeyRestrictPrivilegesSwitch =
          await pageObjects.apiKeys.getRestrictPrivilegesSwitch();

        // Verify metadata and restrict privileges switches are now disabled
        expect(await apiKeyMetadataSwitch.isEnabled()).to.be(false);
        expect(await apiKeyRestrictPrivilegesSwitch.isEnabled()).to.be(false);

        await pageObjects.apiKeys.clickCancelButtonOnApiKeyFlyout();
      });

      it('should show the `API key details flyout` if the API key does not belong to the user', async () => {
        const apiKeyName = 'other-key';

        await es.security.grantApiKey({
          api_key: {
            name: apiKeyName,
          },
          grant_type: 'password',
          run_as: 'elastic',
          username: 'elastic',
          password: 'changeme',
        });

        await browser.refresh();

        log.debug('API key created, moving on to view');

        await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

        expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys');
        expect(await pageObjects.apiKeys.getFlyoutTitleText()).to.be('API key details');

        // Verify name input box is not present
        expect(await pageObjects.apiKeys.isApiKeyNamePresent()).to.be(false);

        // Status should be displayed
        const apiKeyStatus = await pageObjects.apiKeys.getFlyoutApiKeyStatus();
        expect(await apiKeyStatus).to.be('Active');

        const apiKeyMetadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
        const apiKeyRestrictPrivilegesSwitch =
          await pageObjects.apiKeys.getRestrictPrivilegesSwitch();

        // Verify metadata and restrict privileges switches are now disabled
        expect(await apiKeyMetadataSwitch.isEnabled()).to.be(false);
        expect(await apiKeyRestrictPrivilegesSwitch.isEnabled()).to.be(false);

        await pageObjects.apiKeys.clickCancelButtonOnApiKeyFlyout();
      });
    });

    describe('deletes API key(s)', function () {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_api_keys']);
        await pageObjects.common.navigateToApp('apiKeys');
      });

      beforeEach(async () => {
        await pageObjects.apiKeys.clickOnPromptCreateApiKey();
        await pageObjects.apiKeys.setApiKeyName('api key 1');
        await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
        await ensureApiKeysExist(['api key 1']);
      });

      it('one by one', async () => {
        await pageObjects.apiKeys.deleteAllApiKeyOneByOne();
        expect(await pageObjects.apiKeys.getApiKeysFirstPromptTitle()).to.be(
          'Create your first API key'
        );
      });

      it('by bulk', async () => {
        await pageObjects.apiKeys.clickOnTableCreateApiKey();
        await pageObjects.apiKeys.setApiKeyName('api key 2');
        await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();

        // Make sure all API keys we want to delete are created and rendered.
        await ensureApiKeysExist(['api key 1', 'api key 2']);

        await pageObjects.apiKeys.bulkDeleteApiKeys();
        expect(await pageObjects.apiKeys.getApiKeysFirstPromptTitle()).to.be(
          'Create your first API key'
        );
      });
    });
  });
};
