/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { RoleCredentials } from '../../../shared/services';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'svlSearchHomePage',
    'embeddedConsole',
    'common',
  ]);
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  const es = getService('es');
  const browser = getService('browser');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['test-*']);
  };

  const testSubjects = getService('testSubjects');

  // Skip the tests until timeout flakes can be diagnosed and resolved
  describe.skip('Search Homepage', function () {
    describe('as viewer', function () {
      before(async () => {
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');

        await pageObjects.svlCommonPage.loginAsViewer();
      });

      beforeEach(async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
      });

      after(async () => {
        if (!roleAuthc) return;
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('has search homepage with Home sidenav', async () => {
        await pageObjects.svlSearchHomePage.expectToBeOnHomepage();
        await pageObjects.svlSearchHomePage.expectHomepageHeader();
        // Navigate to another page
        await pageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'serverlessConnectors',
        });
        await pageObjects.svlSearchHomePage.expectToNotBeOnHomepage();
        // Click Home in Side nav
        await pageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'searchHomepage',
        });
        await pageObjects.svlSearchHomePage.expectToBeOnHomepage();
      });

      it('has embedded dev console', async () => {
        await testHasEmbeddedConsole(pageObjects);
      });

      describe('Elasticsearch endpoint and API Keys', function () {
        it('renders Elasticsearch endpoint with copy functionality', async () => {
          await testSubjects.existOrFail('copyEndpointButton');
          await testSubjects.existOrFail('endpointValueField');
          await testSubjects.existOrFail('apiKeyFormNoUserPrivileges');
        });
      });

      describe('Connect To Elasticsearch Side Panel', function () {
        it('renders the "Upload a file" card with copy link', async () => {
          await testSubjects.existOrFail('uploadFileButton');
          await testSubjects.click('uploadFileButton');
          await pageObjects.svlSearchHomePage.expectToBeOnUploadDataPage();
        });
      });

      describe('AI search capabilities', function () {
        it('renders Semantic Search content', async () => {
          await testSubjects.existOrFail('aiSearchCapabilities-item-semantic');
          await testSubjects.existOrFail('createSemanticOptimizedIndexButton');
          await testSubjects.click('createSemanticOptimizedIndexButton');
          expect(await browser.getCurrentUrl()).contain(
            'app/elasticsearch/indices/create?workflow=semantic'
          );
        });

        it('renders Keyword Search content', async () => {
          await testSubjects.scrollIntoView('aiSearchCapabilities-item-keyword');
          await testSubjects.existOrFail('aiSearchCapabilities-item-keyword');
          await testSubjects.click('aiSearchCapabilities-item-keyword');
          await testSubjects.existOrFail('createKeywordIndexButton');
          await testSubjects.click('createKeywordIndexButton');
          expect(await browser.getCurrentUrl()).contain(
            'app/elasticsearch/indices/create?workflow=default'
          );
        });
      });

      describe('Alternate Solutions', function () {
        it('renders Observability content', async () => {
          await testSubjects.existOrFail('observabilitySection');
          await testSubjects.existOrFail('exploreLogstashAndBeatsLink');
          await testSubjects.click('exploreLogstashAndBeatsLink');
          await pageObjects.svlSearchHomePage.expectToBeOnObservabilityPage();
        });

        it('renders SIEM link', async () => {
          await testSubjects.existOrFail('setupSiemLink');
          await testSubjects.click('setupSiemLink');
          await pageObjects.svlSearchHomePage.expectToBeOnIngestDataToSecurityPage();
        });

        it('renders Elastic Defend link', async () => {
          await testSubjects.existOrFail('setupElasticDefendLink');
          await testSubjects.click('setupElasticDefendLink');
          await pageObjects.svlSearchHomePage.expectToBeOnInstallElasticDefendPage();
        });

        it('renders Cloud Security Posture Management link', async () => {
          await testSubjects.existOrFail('cloudSecurityPostureManagementLink');
          await testSubjects.click('cloudSecurityPostureManagementLink');
          await pageObjects.svlSearchHomePage.expectToBeOnCloudSecurityPosturePage();
        });
      });

      describe('Dive deeper with Elasticsearch', function () {
        it('renders Search labs content', async () => {
          await testSubjects.existOrFail('searchLabsSection');
          await testSubjects.existOrFail('searchLabsButton');
          await testSubjects.click('searchLabsButton');
          await pageObjects.svlSearchHomePage.expectToBeOnSearchLabsPage();
        });

        it('renders Open Notebooks content', async () => {
          await testSubjects.existOrFail('pythonNotebooksSection');
          await testSubjects.existOrFail('openNotebooksButton');
          await testSubjects.click('openNotebooksButton');
          await pageObjects.svlSearchHomePage.expectToBeOnNotebooksExamplesPage();
        });

        it('renders Elasticsearch Documentation content', async () => {
          await testSubjects.existOrFail('elasticsearchDocumentationSection');
          await testSubjects.existOrFail('viewDocumentationButton');
          await testSubjects.click('viewDocumentationButton');
          await pageObjects.svlSearchHomePage.expectToBeOnGetStartedDocumentationPage();
        });
      });

      describe('Footer content', function () {
        it('displays the community link', async () => {
          await testSubjects.existOrFail('elasticCommunityLink');
          await testSubjects.click('elasticCommunityLink');
          await pageObjects.svlSearchHomePage.expectToBeOnCommunityPage();
        });

        it('displays the feedbacks link', async () => {
          await testSubjects.existOrFail('giveFeedbackLink');
          await testSubjects.click('giveFeedbackLink');
          await pageObjects.svlSearchHomePage.expectToBeOnGiveFeedbackPage();
        });
      });
    });

    describe('as admin', function () {
      before(async () => {
        await es.indices.create({ index: 'test-my-index-001' });
        await pageObjects.svlCommonPage.loginAsAdmin();
      });

      after(async () => {
        await deleteAllTestIndices();
      });

      // FLAKY: https://github.com/elastic/kibana/issues/225446
      it.skip('goes to the start page if there exists no index', async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
        await pageObjects.svlSearchHomePage.expectToBeOnStartpage();
      });

      it('goes to the home page if there exists at least one index', async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
        await pageObjects.svlSearchHomePage.expectToBeOnHomepage();
      });

      describe('Elasticsearch endpoint and API Keys', function () {
        it('renders Elasticsearch endpoint with copy functionality', async () => {
          await testSubjects.existOrFail('copyEndpointButton');
          await testSubjects.existOrFail('endpointValueField');
        });

        it('renders API keys buttons and active badge correctly', async () => {
          await testSubjects.existOrFail('createApiKeyButton');
          await testSubjects.existOrFail('manageApiKeysButton');
          await testSubjects.existOrFail('activeApiKeysBadge');
        });
        it('opens API keys management page on clicking Manage API Keys', async () => {
          await pageObjects.svlSearchHomePage.clickManageApiKeysLink();
          await pageObjects.svlSearchHomePage.expectToBeOnManageApiKeysPage();
        });
      });
    });

    describe('as developer', function () {
      before(async () => {
        await es.indices.create({ index: 'test-my-index-001' });
        await pageObjects.svlCommonPage.loginAsDeveloper();
      });

      after(async () => {
        await deleteAllTestIndices();
      });

      // FLAKY: https://github.com/elastic/kibana/issues/225446
      it.skip('goes to the start page if there exists no index', async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
        await pageObjects.svlSearchHomePage.expectToBeOnStartpage();
      });

      it('goes to the home page if there exists at least one index', async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
        await pageObjects.svlSearchHomePage.expectToBeOnHomepage();
      });

      describe('Elasticsearch endpoint and API Keys', function () {
        it('renders Elasticsearch endpoint with copy functionality', async () => {
          await testSubjects.existOrFail('copyEndpointButton');
          await testSubjects.existOrFail('endpointValueField');
        });

        it('renders API keys buttons and active badge correctly', async () => {
          await testSubjects.existOrFail('createApiKeyButton');
          await testSubjects.existOrFail('manageApiKeysButton');
          await testSubjects.existOrFail('activeApiKeysBadge');
        });
        it('opens API keys management page on clicking Manage API Keys', async () => {
          await pageObjects.svlSearchHomePage.clickManageApiKeysLink();
          await pageObjects.svlSearchHomePage.expectToBeOnManageApiKeysPage();
        });
      });
    });
  });
}
