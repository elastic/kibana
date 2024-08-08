/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Note: this suite is currently only called from the feature flags test config:
// x-pack/test_serverless/functional/test_suites/search/config.feature_flags.ts

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'svlManagementPage']);
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Management navigation cards', function () {
    this.tags('smoke');

    describe('as Admin', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsAdmin();
      });

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('management');
      });

      it('renders the page', async () => {
        await retry.waitFor('page to be visible', async () => {
          return await testSubjects.exists('cards-navigation-page');
        });

        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/management`);
      });

      it('displays the API keys management card, and will navigate to the API keys UI', async () => {
        await pageObjects.svlManagementPage.assertApiKeysManagementCardExists();
        await pageObjects.svlManagementPage.clickApiKeysManagementCard();

        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/management/security/api_keys');
      });

      it('displays the roles management card, and will navigate to the Roles UI', async () => {
        await pageObjects.svlManagementPage.assertRoleManagementCardExists();
        await pageObjects.svlManagementPage.clickRoleManagementCard();

        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/management/security/roles');
      });

      it('displays the Organization members management card, and will navigate to the cloud organization URL', async () => {
        await pageObjects.svlManagementPage.assertOrgMembersManagementCardExists();
        await pageObjects.svlManagementPage.clickOrgMembersManagementCard();

        const url = await browser.getCurrentUrl();
        // `--xpack.cloud.organization_url: '/account/members'`,
        expect(url).to.contain('/account/members');
      });

      it('displays the spaces management card, and will navigate to the spaces management UI', async () => {
        await pageObjects.svlManagementPage.assertSpacesManagementCardExists();
        await pageObjects.svlManagementPage.clickSpacesManagementCard();

        const url = await browser.getCurrentUrl();
        expect(url).to.contain('/management/kibana/spaces');
      });
    });

    describe('as viewer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
      });

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('management');
      });

      it('renders the page', async () => {
        await retry.waitFor('page to be visible', async () => {
          return await testSubjects.exists('cards-navigation-page');
        });

        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/management`);
      });

      it('should not display the roles manangement card', async () => {
        await retry.waitFor('page to be visible', async () => {
          return await testSubjects.exists('cards-navigation-page');
        });
        await pageObjects.svlManagementPage.assertRoleManagementCardDoesNotExist();
      });

      it('displays the organization members management card, and will navigate to the cloud organization URL', async () => {
        // The org members nav card is always visible because there is no way to check if a user has approprite privileges
        await pageObjects.svlManagementPage.assertOrgMembersManagementCardExists();
        await pageObjects.svlManagementPage.clickOrgMembersManagementCard();

        const url = await browser.getCurrentUrl();
        // `--xpack.cloud.organization_url: '/account/members'`,
        expect(url).to.contain('/account/members');
      });

      it('should not display the spaces management card', async () => {
        await retry.waitFor('page to be visible', async () => {
          return await testSubjects.exists('cards-navigation-page');
        });
        await pageObjects.svlManagementPage.assertSpacesManagementCardDoesNotExist();
      });

      describe('API keys management card  - search solution', function () {
        this.tags(['skipSvlOblt', 'skipSvlSec']);

        it('displays the API keys management card, and will navigate to the API keys UI (search only)', async () => {
          await pageObjects.svlManagementPage.assertApiKeysManagementCardExists();
          await pageObjects.svlManagementPage.clickApiKeysManagementCard();

          const url = await browser.getCurrentUrl();
          expect(url).to.contain('/management/security/api_keys');
        });
      });

      describe('API keys management card - oblt & sec solutions', function () {
        this.tags(['skipSvlSearch']);

        it('should not display the API keys manangement card (oblt & security only)', async () => {
          await retry.waitFor('page to be visible', async () => {
            return await testSubjects.exists('cards-navigation-page');
          });
          await pageObjects.svlManagementPage.assertApiKeysManagementCardDoesNotExist();
        });
      });
    });
  });
};
