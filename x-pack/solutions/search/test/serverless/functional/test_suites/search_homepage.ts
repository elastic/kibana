/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';
import type { RoleCredentials } from '../services';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchHomePage',
    'embeddedConsole',
    'common',
  ]);
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['test-*', 'search-*']);
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
        await pageObjects.searchHomePage.expectToBeOnHomepage();
        await pageObjects.searchHomePage.expectHomepageHeader();
        // Navigate to another page
        await pageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'discover',
        });
        await pageObjects.searchHomePage.expectToNotBeOnHomepage();
        // Click Home in Side nav
        await pageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'searchHomepage',
        });
        await pageObjects.searchHomePage.expectToBeOnHomepage();
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
          // TODO: Should this retry to allow time for new page to load?
          await pageObjects.searchHomePage.expectToBeOnUploadDataPage();
        });

        it('does not render the "Add sample data" card', async () => {
          await testSubjects.missingOrFail('sampleDataSection');
        });
      });
      describe('Get started with API', function () {
        it('clicking on search basics tutorial open console', async () => {
          await testSubjects.existOrFail('console_tutorials_search_basics');
          await testSubjects.click('console_tutorials_search_basics');
          await testSubjects.existOrFail('consoleEditorContainer');
        });
        it('clicking on semantic search tutorial open console', async () => {
          await testSubjects.existOrFail('console_tutorials_semantic_search');
          await testSubjects.click('console_tutorials_semantic_search');
          await testSubjects.existOrFail('consoleEditorContainer');
        });
        it('clicking on esql tutorial open console', async () => {
          await testSubjects.existOrFail('console_tutorials_esql');
          await testSubjects.click('console_tutorials_esql');
          await testSubjects.existOrFail('consoleEditorContainer');
        });
        // TODO:  uncomment below lines when we are ready to show TSDS tutorial. review https://github.com/elastic/kibana/pull/237384#issuecomment-3411670210
        // it('clicking on tsds tutorial open console', async () => {
        //   await testSubjects.existOrFail('console_tutorials_tsds');
        //   await testSubjects.click('console_tutorials_tsds');
        //   await testSubjects.existOrFail('consoleEditorContainer');
        // });
      });

      describe('Alternate Solutions', function () {
        it('renders Observability content', async () => {
          await testSubjects.existOrFail('observabilitySection');
          await testSubjects.existOrFail('exploreLogstashAndBeatsLink');
          await testSubjects.click('exploreLogstashAndBeatsLink');
          await pageObjects.searchHomePage.expectToBeOnObservabilityPage();
        });

        it('renders SIEM link', async () => {
          await testSubjects.existOrFail('setupSiemLink');
          await testSubjects.click('setupSiemLink');
          await pageObjects.searchHomePage.expectToBeOnIngestDataToSecurityPage();
        });

        it('renders Elastic Defend link', async () => {
          await testSubjects.existOrFail('setupElasticDefendLink');
          await testSubjects.click('setupElasticDefendLink');
          await pageObjects.searchHomePage.expectToBeOnInstallElasticDefendPage();
        });

        it('renders Cloud Security Posture Management link', async () => {
          await testSubjects.existOrFail('cloudSecurityPostureManagementLink');
          await testSubjects.click('cloudSecurityPostureManagementLink');
          await pageObjects.searchHomePage.expectToBeOnCloudSecurityPosturePage();
        });
      });

      describe('Dive deeper with Elasticsearch', function () {
        it('renders Search labs content', async () => {
          await testSubjects.existOrFail('searchLabsSection');
          await testSubjects.existOrFail('searchLabsButton');
          await testSubjects.click('searchLabsButton');
          await pageObjects.searchHomePage.expectToBeOnSearchLabsPage();
        });

        it('renders Open Notebooks content', async () => {
          await testSubjects.existOrFail('pythonNotebooksSection');
          await testSubjects.existOrFail('openNotebooksButton');
          await testSubjects.click('openNotebooksButton');
          await pageObjects.searchHomePage.expectToBeOnNotebooksExamplesPage();
        });

        it('renders Elasticsearch Documentation content', async () => {
          await testSubjects.existOrFail('elasticsearchDocumentationSection');
          await testSubjects.existOrFail('viewDocumentationButton');
          await testSubjects.click('viewDocumentationButton');
          await pageObjects.searchHomePage.expectToBeOnGetStartedDocumentationPage();
        });
      });

      describe('Footer content', function () {
        it('displays the community link', async () => {
          await testSubjects.existOrFail('elasticCommunityLink');
          await testSubjects.click('elasticCommunityLink');
          await pageObjects.searchHomePage.expectToBeOnCommunityPage();
        });

        it('displays the feedbacks link', async () => {
          await testSubjects.existOrFail('giveFeedbackLink');
          await testSubjects.click('giveFeedbackLink');
          await pageObjects.searchHomePage.expectToBeOnGiveFeedbackPage();
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

      it('goes to the home page if there exists at least one index', async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
        await pageObjects.searchHomePage.expectToBeOnHomepage();
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
          await pageObjects.searchHomePage.clickManageApiKeysLink();
          await pageObjects.searchHomePage.expectToBeOnManageApiKeysPage();
        });
      });

      describe('Sample data section', function () {
        it('renders the sample data section', async () => {
          await pageObjects.common.navigateToApp('searchHomepage');
          await testSubjects.existOrFail('sampleDataSection');
          await testSubjects.existOrFail('installSampleBtn');
        });

        describe('when sample-data-elasticsearch index exists', function () {
          before(async () => {
            await es.indices.create({ index: 'sample-data-elasticsearch' });
            await pageObjects.common.navigateToApp('searchHomepage');
          });

          after(async () => {
            await esDeleteAllIndices(['sample-data-elasticsearch']);
          });

          it('renders the "View data" button', async () => {
            await testSubjects.existOrFail('viewDataBtn');
          });
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

      it('goes to the home page if there exists at least one index', async () => {
        await pageObjects.common.navigateToApp('searchHomepage');
        await pageObjects.searchHomePage.expectToBeOnHomepage();
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
          await pageObjects.searchHomePage.clickManageApiKeysLink();
          await pageObjects.searchHomePage.expectToBeOnManageApiKeysPage();
        });
      });

      describe('Sample data section', function () {
        it('renders the sample data section', async () => {
          await pageObjects.common.navigateToApp('searchHomepage');
          await testSubjects.existOrFail('sampleDataSection');
          await testSubjects.existOrFail('installSampleBtn');
        });

        describe('when sample-data-elasticsearch index exists', function () {
          before(async () => {
            await es.indices.create({ index: 'sample-data-elasticsearch' });
            await pageObjects.common.navigateToApp('searchHomepage');
          });

          after(async () => {
            await esDeleteAllIndices(['sample-data-elasticsearch']);
          });

          it('renders the "View data" button', async () => {
            await testSubjects.existOrFail('viewDataBtn');
          });
        });
      });
    });
  });
}
