/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  describe(`Switch roles`, function () {
    const pageObjects = getPageObjects([
      'svlCommonPage',
      'common',
      'apiKeys',
      'timePicker',
      'visualize',
      'lens',
    ]);
    const browser = getService('browser');
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/test_serverless/functional/es_archives/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test_serverless/functional/es_archives/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('admin', async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToUrl('management', 'security/api_keys', {
        shouldUseHashForSubUrl: false,
      });
      await pageObjects.apiKeys.clickOnPromptCreateApiKey();
      expect(await browser.getCurrentUrl()).to.contain('app/management/security/api_keys/create');
    });

    it('viewer', async () => {
      await pageObjects.svlCommonPage.loginWithRole('viewer');
      await pageObjects.svlCommonPage.assertProjectHeaderExists();
      await pageObjects.svlCommonPage.assertUserAvatarExists();
      await pageObjects.svlCommonPage.clickUserAvatar();
      await pageObjects.svlCommonPage.assertUserMenuExists();
    });

    it('editor', async () => {
      await pageObjects.svlCommonPage.loginWithPrivilegedRole();
      await pageObjects.common.navigateToApp('management');
    });
  });
}
